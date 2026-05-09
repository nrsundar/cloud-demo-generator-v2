// Per-million-token pricing for Bedrock models
const PRICING: Record<string, { in: number; out: number }> = {
  "us.anthropic.claude-opus-4-6-v1": { in: 15.0, out: 75.0 },
  "anthropic.claude-opus-4-6-v1": { in: 15.0, out: 75.0 },
};

export function estimateCost(modelId: string, tokensIn: number, tokensOut: number): string {
  const p = PRICING[modelId] ?? PRICING["us.anthropic.claude-opus-4-6-v1"];
  const usd = (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
  return usd.toFixed(6);
}
