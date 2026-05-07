import { GenNode, SpecSnapshot } from "../components/genui/types";
import { apiRequest } from "../lib/queryClient";
import { API_BASE } from "../lib/config";
import { getCurrentUser } from "../lib/auth";

export interface AgentTurnResult {
  message: string;
  components: GenNode[];
  specSnapshot: SpecSnapshot | null;
  phase: "gathering" | "generating" | "complete" | "error";
}

async function authHeaders(): Promise<Record<string, string>> {
  const user = await getCurrentUser();
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
}

export async function sendAgentTurn(messages: { role: string; content: string }[], specSnapshot: SpecSnapshot | null): Promise<AgentTurnResult> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/generator/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ messages, specSnapshot }),
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
