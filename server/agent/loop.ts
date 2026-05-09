import type { AgentStep, SpecSnapshot } from "@shared/schema";
import * as sessions from "./sessions";
import * as bedrock from "./bedrock";
import * as budget from "./budget";
import { bedrockToolDefs, executeTool } from "../tools";
import { ensureToolsRegistered } from "../tools/bootstrap";
import { validateEnvelopeJson, PHASES, type Phase as EnvPhase } from "./envelope";
import { sanitizeUserMessage, checkRateLimit, isToolAllowed, redactJson } from "./safety";
import { toolError } from "../tools/types";
import * as trace from "./trace";

const SYSTEM_PROMPT = `You are the DemoForge orchestrator. You help AWS Solutions Architects generate database demo packages.

TOOLS
Use the provided tools to gather facts before answering. Infer aggressively; only ask the user what is genuinely ambiguous.
HARD RULE: Before you set specSnapshot.extensions, you MUST call validateExtension for every extension. If validateExtension reports an extension is not supported on the chosen engine/version, replace it with one of the suggested alternatives (or ask the user). Never set specSnapshot.extensions to anything unvalidated.

FINAL OUTPUT (only when no more tool calls are needed)
Respond with a single JSON object — no prose around it, no code fences:
{"message": string (markdown allowed), "components": GenNode[], "specSnapshot": {database, extensions[], useCase, industry?, audience?, durationMin?, estCostHourly?} | null, "phase": "gathering"|"generating"|"complete"}

GenNode component types — use the shape exactly as listed; every node must include a "type" field:
- {type:"Markdown", text}
- {type:"QuestionSingleSelect", id, label, helper?, options:[{label,value}]}
- {type:"QuestionMultiSelect", id, label, helper?, max?, options:[{label,value}]}
- {type:"QuestionSlider", id, label, helper?, min, max, step, marks?:[{value,label}]}
- {type:"QuestionText", id, label, placeholder?, helper?}
- {type:"DatabasePicker", id, label, recommended?, options:[{label,value,description?}]}
- {type:"ExtensionPicker", id, database, suggested:[string], allowCustom:boolean}
- {type:"AudienceProfile", id, presets:[{label,value,description?}], customDepth?}
- {type:"DemoSpecCard", database, extensions:[string], useCase, industry?, audience?, durationMin?, estCostHourly?, editable:boolean}
- {type:"InfraPreview", diagram?, resources:[{name,type,detail?}], estimatedCost?}
- {type:"SchemaPreview", tables:[{name,columns:[string],rowCount?}], seedRowCount?}
- {type:"CodePreview", language, filename, code, highlights?:[number]}
- {type:"ModuleList", modules:[{name,description,difficulty?}]}
- {type:"CostEstimate", hourly, monthly, breakdown:[{service,cost}]}
- {type:"ProgressTimeline", id, steps:[{label,status:"complete"|"active"|"pending"}]}
- {type:"ConfirmationCard", packageName, sizeKb?, fileCount?, actions:[{label,variant:"primary"|"secondary"|"link",href?,onClick?}]}
- {type:"ErrorCard", title, message, suggestions?:[string]}

PHASE RULES
- "gathering": still collecting requirements; ask via Question*/DatabasePicker/ExtensionPicker/AudienceProfile components.
- "generating": database + (validated) extensions + useCase + audience are all known; emit InfraPreview / SchemaPreview / CodePreview / ModuleList / CostEstimate (and DemoSpecCard) using the structured tool outputs.
- "complete": full package ready; emit ConfirmationCard.

specSnapshot must always reflect current understanding (null fields allowed). Return ONLY the JSON.`;

type Phase = EnvPhase;
export const VALID_PHASES = PHASES;

export interface Envelope {
  message: string;
  components: unknown[];
  specSnapshot: SpecSnapshot | null;
  phase: Phase;
}

export type AgentEvent =
  | { type: "iteration.start"; iteration: number }
  | { type: "assistant.message"; text: string; toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>; tokensIn: number; tokensOut: number; latencyMs: number }
  | { type: "tool.start"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool.end"; id: string; name: string; ok: boolean; output?: unknown; error?: { kind: string; message: string } }
  | { type: "envelope.invalid"; reason: string }
  | { type: "phase.update"; phase: Phase }
  | { type: "final"; envelope: Envelope }
  | { type: "error"; message: string };

export type EventSink = (e: AgentEvent) => void | Promise<void>;

export interface RunTurnInput {
  sessionId: number;
  principal: sessions.Principal;
  userMessage: string;
  onEvent?: EventSink;
}

export interface RunTurnResult {
  sessionId: number;
  envelope: Envelope;
}

export function validateEnvelope(
  text: string,
):
  | { ok: true; envelope: Envelope; componentErrors: Array<{ index: number; reason: string }> }
  | { ok: false; error: string } {
  const r = validateEnvelopeJson(text);
  if (!r.ok) return { ok: false, error: r.error };
  const envelope: Envelope = {
    message: r.envelope.message,
    components: r.envelope.components,
    specSnapshot: (r.envelope.specSnapshot as SpecSnapshot | null) ?? null,
    phase: r.envelope.phase,
  };
  return { ok: true, envelope, componentErrors: r.envelope.componentErrors };
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

interface PersistedToolResult {
  id: string;
  output?: unknown;
  error?: { kind: string; message: string };
}

function historyToBedrockMessages(history: AgentStep[]): bedrock.BedrockMessage[] {
  const out: bedrock.BedrockMessage[] = [];
  for (const step of history) {
    if (step.role === "user") {
      const text = typeof step.content === "string" ? step.content : JSON.stringify(step.content ?? "");
      out.push({ role: "user", content: text });
      continue;
    }
    if (step.role === "assistant") {
      const text = typeof step.content === "string" ? step.content : "";
      const calls = (step.toolCalls ?? []) as Array<{ id: string; name: string; input: Record<string, unknown> }>;
      if (calls.length === 0) {
        out.push({ role: "assistant", content: text });
        continue;
      }
      const blocks: Array<{ type: "text"; text: string } | ToolUseBlock> = [];
      if (text.length > 0) blocks.push({ type: "text", text });
      for (const c of calls) blocks.push({ type: "tool_use", id: c.id, name: c.name, input: c.input ?? {} });
      out.push({ role: "assistant", content: blocks });
      continue;
    }
    if (step.role === "tool") {
      const results = (step.toolResults ?? []) as PersistedToolResult[];
      const blocks: ToolResultBlock[] = results.map((r) => ({
        type: "tool_result",
        tool_use_id: r.id,
        content: r.error ? `Error (${r.error.kind}): ${r.error.message}` : JSON.stringify(r.output ?? null),
        is_error: r.error ? true : undefined,
      }));
      if (blocks.length > 0) out.push({ role: "user", content: blocks });
    }
  }
  return out;
}

function errorEnvelope(message: string): Envelope {
  return {
    message,
    components: [{ type: "ErrorCard", title: "Agent Error", message }],
    specSnapshot: null,
    phase: "error",
  };
}

export async function runTurnFromMessage(args: {
  principal: sessions.Principal;
  sessionId?: number;
  userMessage: string;
  specSnapshot?: SpecSnapshot;
  onEvent?: EventSink;
}): Promise<RunTurnResult> {
  let sessionId = args.sessionId;
  if (!sessionId) {
    const created = await sessions.createSession(args.principal, args.specSnapshot);
    sessionId = created.id;
  }
  return runTurn({
    sessionId,
    principal: args.principal,
    userMessage: args.userMessage,
    onEvent: args.onEvent,
  });
}

export async function runTurn(input: RunTurnInput): Promise<RunTurnResult> {
  ensureToolsRegistered();

  const emit = async (e: AgentEvent) => {
    if (!input.onEvent) return;
    try {
      await input.onEvent(e);
    } catch {
      /* event sink failures must not crash the loop */
    }
  };

  const session = await sessions.loadSession(input.sessionId, input.principal);
  if (!session) throw new Error(`Session ${input.sessionId} not found or not owned by user`);

  const sanitized = sanitizeUserMessage(input.userMessage);
  if (!sanitized.ok) {
    const env = errorEnvelope(sanitized.reason);
    await emit({ type: "error", message: sanitized.reason });
    await emit({ type: "final", envelope: env });
    return { sessionId: session.id, envelope: env };
  }

  const rl = checkRateLimit(input.principal.sub);
  if (!rl.ok) {
    const msg = `Rate limit exceeded; retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`;
    const env = errorEnvelope(msg);
    await emit({ type: "error", message: msg });
    await emit({ type: "final", envelope: env });
    return { sessionId: session.id, envelope: env };
  }

  let turnIndex = await sessions.nextTurnIndex(input.sessionId);

  await sessions.appendStep({
    sessionId: session.id,
    turnIndex,
    role: "user",
    content: sanitized.value,
  });

  const state = budget.newBudgetState();
  const toolDefs = bedrockToolDefs();
  const traceHandle = await trace.openTrace(session.id, turnIndex);

  try {
    while (true) {
      budget.checkBeforeIteration(state, session);
      turnIndex++;
      await emit({ type: "iteration.start", iteration: state.iterations + 1 });

      const history = await sessions.loadHistory(session.id);

      const modelSpan = await trace.openSpan(traceHandle, null, "model", "bedrock.invoke", {
        modelId: "us.anthropic.claude-opus-4-6-v1",
      });
      const response = await bedrock.invoke({
        systemPrompt: SYSTEM_PROMPT,
        messages: historyToBedrockMessages(history),
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      });
      await trace.closeSpan(modelSpan, traceHandle, {
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        modelId: "us.anthropic.claude-opus-4-6-v1",
      });

      budget.recordIteration(state, response.tokensIn, response.tokensOut);

      await sessions.appendStep({
        sessionId: session.id,
        turnIndex,
        role: "assistant",
        content: response.text,
        toolCalls: response.toolCalls.length > 0 ? response.toolCalls : null,
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        latencyMs: response.latencyMs,
      });

      await emit({
        type: "assistant.message",
        text: response.text,
        toolCalls: response.toolCalls,
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        latencyMs: response.latencyMs,
      });

      if (response.toolCalls.length === 0) {
        const validated = validateEnvelope(response.text);
        if (!validated.ok) {
          await emit({ type: "envelope.invalid", reason: validated.error });
          turnIndex++;
          await sessions.appendStep({
            sessionId: session.id,
            turnIndex,
            role: "user",
            content: `Your previous response was not a valid envelope: ${validated.error}. Reply with ONLY the JSON envelope described in the system prompt — no prose, no code fences.`,
          });
          continue;
        }
        if (validated.componentErrors.length > 0) {
          await emit({
            type: "envelope.invalid",
            reason: `Dropped ${validated.componentErrors.length} invalid component(s): ${validated.componentErrors
              .map((e) => `[${e.index}] ${e.reason}`)
              .join(" | ")}`,
          });
        }
        await sessions.persistSession(session.id, {
          phase: validated.envelope.phase,
          specSnapshot: validated.envelope.specSnapshot ?? undefined,
        });
        await trace.closeTrace(traceHandle, "ok");
        await emit({ type: "phase.update", phase: validated.envelope.phase });
        await emit({ type: "final", envelope: validated.envelope });
        return { sessionId: session.id, envelope: validated.envelope };
      }

      const principal: sessions.Principal = input.principal;
      const fullPrincipal = { sub: principal.sub, email: principal.email };
      const results: PersistedToolResult[] = await Promise.all(
        response.toolCalls.map(async (tc) => {
          await emit({ type: "tool.start", id: tc.id, name: tc.name, input: tc.input });
          if (!isToolAllowed(tc.name, fullPrincipal)) {
            const err = toolError("permission", `Tool '${tc.name}' is not permitted for this principal`, false);
            await emit({
              type: "tool.end",
              id: tc.id,
              name: tc.name,
              ok: false,
              error: { kind: err.kind, message: err.message },
            });
            return { id: tc.id, error: { kind: err.kind, message: err.message } };
          }
          const toolSpan = await trace.openSpan(traceHandle, null, "tool", tc.name, { input: tc.input });
          const r = await executeTool(tc.name, tc.input, fullPrincipal);
          if (r.ok) {
            const safeOutput = redactJson(r.output);
            await trace.closeSpan(toolSpan, traceHandle, { output: safeOutput });
            await emit({ type: "tool.end", id: tc.id, name: tc.name, ok: true, output: safeOutput });
            return { id: tc.id, output: safeOutput };
          }
          await trace.closeSpan(toolSpan, traceHandle, { error: { kind: r.error.kind, message: r.error.message } });
          await emit({
            type: "tool.end",
            id: tc.id,
            name: tc.name,
            ok: false,
            error: { kind: r.error.kind, message: r.error.message },
          });
          return { id: tc.id, error: { kind: r.error.kind, message: r.error.message } };
        }),
      );

      turnIndex++;
      await sessions.appendStep({
        sessionId: session.id,
        turnIndex,
        role: "tool",
        toolResults: results,
      });
    }
  } catch (err: any) {
    const isBudget = err instanceof budget.BudgetExceededError;
    const message = isBudget
      ? `Loop budget exceeded (${err.kind}). ${err.message}`
      : err?.message || "Agent loop failed";
    await trace.closeTrace(
      traceHandle,
      isBudget ? "budget_exceeded" : "error",
      { kind: isBudget ? err.kind : "unknown", message },
    );
    await sessions.persistSession(session.id, { phase: "error" });
    await emit({ type: "error", message });
    const envelope = errorEnvelope(message);
    await emit({ type: "final", envelope });
    return { sessionId: session.id, envelope };
  }
}
