import type { AgentStep, SpecSnapshot } from "@shared/schema";
import * as sessions from "./sessions";
import * as bedrock from "./bedrock";
import * as budget from "./budget";
import { bedrockToolDefs, executeTool } from "../tools";
import { ensureToolsRegistered } from "../tools/bootstrap";

const SYSTEM_PROMPT = `You are the DemoForge orchestrator. You help AWS Solutions Architects generate database demo packages.

TOOLS
Use the provided tools to gather facts before answering. Infer aggressively; only ask the user what is genuinely ambiguous.
HARD RULE: Before you set specSnapshot.extensions, you MUST call validateExtension for every extension. If validateExtension reports an extension is not supported on the chosen engine/version, replace it with one of the suggested alternatives (or ask the user). Never set specSnapshot.extensions to anything unvalidated.

FINAL OUTPUT (only when no more tool calls are needed)
Respond with a single JSON object — no prose around it, no code fences:
{"message": string (markdown allowed), "components": GenNode[], "specSnapshot": {database, extensions[], useCase, industry?, audience?, durationMin?, estCostHourly?} | null, "phase": "gathering"|"generating"|"complete"}

GenNode component types (use as appropriate to surface info to the SA):
AudienceProfile, QuestionSingleSelect, QuestionSlider, ProgressTimeline, InfraPreview, SchemaPreview, CodePreview, ModuleList, CostEstimate, ConfirmationCard, ErrorCard.

PHASE RULES
- "gathering": still collecting requirements; ask via Question* components.
- "generating": database + (validated) extensions + useCase + audience are all known; emit InfraPreview / SchemaPreview / CodePreview / ModuleList / CostEstimate.
- "complete": full package ready; emit ConfirmationCard.

specSnapshot must always reflect current understanding (null fields allowed). Return ONLY the JSON.`;

const VALID_PHASES = ["gathering", "generating", "complete", "error"] as const;
type Phase = typeof VALID_PHASES[number];

export interface Envelope {
  message: string;
  components: unknown[];
  specSnapshot: SpecSnapshot | null;
  phase: Phase;
}

export interface RunTurnInput {
  sessionId: number;
  principal: sessions.Principal;
  userMessage: string;
}

export interface RunTurnResult {
  sessionId: number;
  envelope: Envelope;
}

interface ValidatedEnvelope {
  ok: true;
  envelope: Envelope;
}
interface InvalidEnvelope {
  ok: false;
  error: string;
}

export function validateEnvelope(text: string): ValidatedEnvelope | InvalidEnvelope {
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    return { ok: false, error: `JSON parse failed: ${err.message}` };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Envelope is not an object" };
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.message !== "string") return { ok: false, error: "message must be a string" };
  if (!Array.isArray(obj.components)) return { ok: false, error: "components must be an array" };
  if (typeof obj.phase !== "string" || !VALID_PHASES.includes(obj.phase as Phase)) {
    return { ok: false, error: `phase must be one of ${VALID_PHASES.join("|")}` };
  }
  const specSnapshot = (obj.specSnapshot ?? null) as SpecSnapshot | null;
  return {
    ok: true,
    envelope: {
      message: obj.message,
      components: obj.components as unknown[],
      specSnapshot,
      phase: obj.phase as Phase,
    },
  };
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
}): Promise<RunTurnResult> {
  let sessionId = args.sessionId;
  if (!sessionId) {
    const created = await sessions.createSession(args.principal, args.specSnapshot);
    sessionId = created.id;
  }
  return runTurn({ sessionId, principal: args.principal, userMessage: args.userMessage });
}

export async function runTurn(input: RunTurnInput): Promise<RunTurnResult> {
  ensureToolsRegistered();

  const session = await sessions.loadSession(input.sessionId, input.principal);
  if (!session) throw new Error(`Session ${input.sessionId} not found or not owned by user`);

  let turnIndex = await sessions.nextTurnIndex(input.sessionId);

  await sessions.appendStep({
    sessionId: session.id,
    turnIndex,
    role: "user",
    content: input.userMessage,
  });

  const state = budget.newBudgetState();
  const toolDefs = bedrockToolDefs();

  try {
    while (true) {
      budget.checkBeforeIteration(state, session);
      turnIndex++;

      const history = await sessions.loadHistory(session.id);
      const response = await bedrock.invoke({
        systemPrompt: SYSTEM_PROMPT,
        messages: historyToBedrockMessages(history),
        tools: toolDefs.length > 0 ? toolDefs : undefined,
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

      if (response.toolCalls.length === 0) {
        const validated = validateEnvelope(response.text);
        if (!validated.ok) {
          turnIndex++;
          await sessions.appendStep({
            sessionId: session.id,
            turnIndex,
            role: "tool",
            toolResults: [{ error: { kind: "validation", message: validated.error } }],
          });
          continue;
        }
        await sessions.persistSession(session.id, {
          phase: validated.envelope.phase,
          specSnapshot: validated.envelope.specSnapshot ?? undefined,
        });
        return { sessionId: session.id, envelope: validated.envelope };
      }

      const principal: sessions.Principal = input.principal;
      const results: PersistedToolResult[] = await Promise.all(
        response.toolCalls.map(async (tc) => {
          const r = await executeTool(tc.name, tc.input, principal);
          if (r.ok) return { id: tc.id, output: r.output };
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
    const message =
      err instanceof budget.BudgetExceededError
        ? `Loop budget exceeded (${err.kind}). ${err.message}`
        : err?.message || "Agent loop failed";
    await sessions.persistSession(session.id, { phase: "error" });
    return { sessionId: session.id, envelope: errorEnvelope(message) };
  }
}
