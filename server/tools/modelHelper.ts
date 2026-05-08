import { invoke } from "../agent/bedrock";

/**
 * Calls Bedrock with a tight prompt and parses a JSON object out of the response.
 * Used by generator tools that need a structured preview (not full file content).
 */
export async function modelJson<T>(args: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}): Promise<T> {
  const r = await invoke({
    systemPrompt: args.systemPrompt,
    messages: [{ role: "user", content: args.userPrompt }],
    maxTokens: args.maxTokens ?? 2048,
  });
  const cleaned = r.text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  return JSON.parse(cleaned) as T;
}
