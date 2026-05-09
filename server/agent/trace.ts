import { db } from "../db";
import { agentTraces, agentSpans } from "@shared/schema";
import { eq } from "drizzle-orm";
import { estimateCost } from "./pricing";

export type SpanKind = "model" | "tool" | "safety";

export interface TraceHandle {
  id: number;
  sessionId: number;
  turnIndex: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalLatencyMs: number;
}

export interface SpanHandle {
  id: number;
  traceId: number;
  startTime: number;
}

export async function openTrace(sessionId: number, turnIndex: number): Promise<TraceHandle> {
  const [row] = await db.insert(agentTraces).values({ sessionId, turnIndex }).returning({ id: agentTraces.id });
  return { id: row.id, sessionId, turnIndex, totalTokensIn: 0, totalTokensOut: 0, totalLatencyMs: 0 };
}

export async function closeTrace(
  trace: TraceHandle,
  status: "ok" | "error" | "budget_exceeded",
  error?: { kind: string; message: string },
): Promise<void> {
  const costUsd = estimateCost("us.anthropic.claude-opus-4-6-v1", trace.totalTokensIn, trace.totalTokensOut);
  await db
    .update(agentTraces)
    .set({
      endedAt: new Date(),
      status,
      totalTokensIn: trace.totalTokensIn,
      totalTokensOut: trace.totalTokensOut,
      totalLatencyMs: trace.totalLatencyMs,
      estCostUsd: costUsd,
      errorKind: error?.kind ?? null,
      errorMessage: error?.message ?? null,
    })
    .where(eq(agentTraces.id, trace.id));
}

export async function openSpan(
  trace: TraceHandle,
  parent: SpanHandle | null,
  kind: SpanKind,
  name: string,
  attrs?: { modelId?: string; input?: unknown },
): Promise<SpanHandle> {
  const [row] = await db
    .insert(agentSpans)
    .values({
      traceId: trace.id,
      parentSpanId: parent?.id ?? null,
      kind,
      name,
      modelId: attrs?.modelId ?? null,
      input: attrs?.input != null ? truncateJson(attrs.input) : null,
    })
    .returning({ id: agentSpans.id });
  return { id: row.id, traceId: trace.id, startTime: Date.now() };
}

export async function closeSpan(
  span: SpanHandle,
  trace: TraceHandle,
  result: {
    output?: unknown;
    error?: unknown;
    tokensIn?: number;
    tokensOut?: number;
    modelId?: string;
    cacheHit?: string;
  },
): Promise<void> {
  const durationMs = Date.now() - span.startTime;
  const costUsd =
    result.tokensIn != null && result.tokensOut != null
      ? estimateCost(result.modelId ?? "us.anthropic.claude-opus-4-6-v1", result.tokensIn, result.tokensOut)
      : null;

  if (result.tokensIn) trace.totalTokensIn += result.tokensIn;
  if (result.tokensOut) trace.totalTokensOut += result.tokensOut;
  trace.totalLatencyMs += durationMs;

  await db
    .update(agentSpans)
    .set({
      endedAt: new Date(),
      durationMs,
      output: result.output != null ? truncateJson(result.output) : null,
      error: result.error != null ? truncateJson(result.error) : null,
      tokensIn: result.tokensIn ?? null,
      tokensOut: result.tokensOut ?? null,
      cacheHit: result.cacheHit ?? null,
      costUsd,
    })
    .where(eq(agentSpans.id, span.id));
}

function truncateJson(val: unknown): unknown {
  const s = JSON.stringify(val);
  if (s && s.length > 256_000) return { _truncated: true, length: s.length, preview: s.slice(0, 1000) };
  return val;
}
