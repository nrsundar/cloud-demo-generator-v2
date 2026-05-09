import { GenNode, SpecSnapshot } from "../components/genui/types";
import { apiRequest } from "../lib/queryClient";
import { API_BASE } from "../lib/config";
import { getCurrentUser } from "../lib/auth";

export interface AgentTurnResult {
  sessionId: number;
  message: string;
  components: GenNode[];
  specSnapshot: SpecSnapshot | null;
  phase: "gathering" | "generating" | "complete" | "error";
}

export interface AgentStreamEvent {
  type: "iteration" | "assistant" | "tool" | "envelope" | "phase" | "final" | "done" | "error";
  [key: string]: any;
}

async function authHeaders(): Promise<Record<string, string>> {
  const user = await getCurrentUser();
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
}

/**
 * Stream a turn using SSE. Emits events as the agent works (iterations, tool calls, assistant messages).
 * Returns the final AgentTurnResult when done.
 */
export async function streamAgentTurn(
  messages: { role: string; content: string }[],
  specSnapshot: SpecSnapshot | null,
  sessionId: number | undefined,
  onEvent: (e: AgentStreamEvent) => void,
): Promise<AgentTurnResult> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/generator/agent/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ messages, specSnapshot, sessionId }),
  });
  if (!res.ok) throw new Error(`Agent error: ${res.status}`);
  if (!res.body) throw new Error("No response body for SSE");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalEnvelope: any = null;
  let finalSessionId: number | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE frames split by double newline
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      const lines = frame.split("\n");
      let eventType = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        const e: AgentStreamEvent = { type: eventType as any, ...parsed };
        onEvent(e);
        if (eventType === "final") finalEnvelope = parsed.envelope || parsed;
        if (eventType === "done") finalSessionId = parsed.sessionId;
        if (eventType === "error") throw new Error(parsed.message || "Agent error");
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("Agent error")) throw err;
        // ignore parse errors on incomplete frames
      }
    }
  }

  if (!finalEnvelope) throw new Error("Stream ended without final envelope");
  return {
    sessionId: finalSessionId ?? 0,
    message: finalEnvelope.message || "",
    components: finalEnvelope.components || [],
    specSnapshot: finalEnvelope.specSnapshot || null,
    phase: finalEnvelope.phase || "error",
  };
}

/** Non-streaming fallback (kept for compatibility) */
export async function sendAgentTurn(
  messages: { role: string; content: string }[],
  specSnapshot: SpecSnapshot | null,
  sessionId?: number,
): Promise<AgentTurnResult> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/generator/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ messages, specSnapshot, sessionId }),
  });
  if (!res.ok) throw new Error(`Agent error: ${res.status}`);
  return res.json();
}

export async function pollRequestStatus(requestId: number): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/demo-requests/${requestId}`, { headers });
  if (!res.ok) throw new Error("Failed to poll status");
  return res.json();
}

export async function submitDemoRequest(spec: SpecSnapshot, email: string): Promise<{ id: number }> {
  const res = await apiRequest("POST", "/api/demo-requests", {
    requesterEmail: email,
    title: `${spec.extensions?.[0] || "custom"} — ${spec.useCase || "demo"}`,
    description: `${spec.useCase}. Industry: ${spec.industry || "general"}. Audience: ${spec.audience || "technical"}.`,
    targetExtension: spec.extensions?.[0],
    customerIndustry: spec.industry,
    complexity: "intermediate",
    skipDedup: true,
  });
  return res.json();
}
