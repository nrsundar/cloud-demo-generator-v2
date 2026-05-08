import type { AgentStep, SpecSnapshot } from "@shared/schema";
import * as sessions from "./sessions";
import * as bedrock from "./bedrock";
import * as budget from "./budget";

const SYSTEM_PROMPT = `You are the DemoForge AI agent. You help AWS Solutions Architects generate database demo packages.
Your job: Given a user's request, infer as much as possible (database, extension, industry, audience, use case) and only ask what you cannot infer.
You MUST respond with valid JSON matching this schema:
{"message":"string (markdown)","components":[GenNode array],"specSnapshot":{"database":"","extensions":[],"useCase":"","industry":"","audience":"","durationMin":null,"estCostHourly":""},"phase":"gathering"|"generating"|"complete"}
Available component types: AudienceProfile, QuestionSingleSelect, QuestionSlider, ProgressTimeline, InfraPreview, SchemaPreview, CodePreview, ModuleList, CostEstimate, ConfirmationCard.
Rules: 1) INFER aggressively from the prompt. 2) Only ask what's genuinely ambiguous. 3) specSnapshot must ALWAYS reflect current understanding. 4) When you have database+extension+useCase+audience, set phase="generating". 5) Return ONLY valid JSON.`;

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

function historyToBedrockMessages(history: AgentStep[]): bedrock.BedrockMessage[] {
  return history
    .filter((s) => s.role === "user" || s.role === "assistant")
    .map((s) => ({
      role: s.role as "user" | "assistant",
      content: typeof s.content === "string" ? s.content : JSON.stringify(s.content),
    }));
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

  try {
    while (true) {
      budget.checkBeforeIteration(state, session);
      turnIndex++;

      const history = await sessions.loadHistory(session.id);
      const response = await bedrock.invoke({
        systemPrompt: SYSTEM_PROMPT,
        messages: historyToBedrockMessages(history),
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
            toolResults: [{ error: validated.error }],
          });
          continue;
        }
        await sessions.persistSession(session.id, {
          phase: validated.envelope.phase,
          specSnapshot: validated.envelope.specSnapshot ?? undefined,
        });
        return { sessionId: session.id, envelope: validated.envelope };
      }

      // P1.2 will execute tools here. For P1.1, treat any tool call as unsupported
      // and ask the model to produce a final envelope on the next iteration.
      turnIndex++;
      await sessions.appendStep({
        sessionId: session.id,
        turnIndex,
        role: "tool",
        toolResults: response.toolCalls.map((tc) => ({
          id: tc.id,
          error: "Tool execution not yet enabled (P1.2). Respond with a final JSON envelope.",
        })),
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
