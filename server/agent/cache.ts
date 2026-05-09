import { db } from "../db";
import { toolResultCache } from "@shared/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { createHash } from "crypto";

// TTL per tool (seconds)
const TOOL_TTL: Record<string, number> = {
  lookupExtensions: 7 * 86_400,
  searchPriorDemos: 3_600,
  estimateInfraCost: 86_400,
  generateCFTemplate: 86_400,
  generateSchema: 86_400,
  generateAppCode: 86_400,
  generateModules: 7 * 86_400,
  validateExtension: 7 * 86_400,
};

function hashInput(toolName: string, input: unknown, principalId?: string): string {
  const payload = JSON.stringify({ toolName, input: sortKeys(input), principalId: principalId ?? "" });
  return createHash("sha256").update(payload).digest("hex");
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce((acc, k) => { acc[k] = sortKeys((obj as any)[k]); return acc; }, {} as Record<string, unknown>);
}

export async function getCached(toolName: string, input: unknown, principalId?: string): Promise<unknown | null> {
  const hash = hashInput(toolName, input, principalId);
  const now = new Date();

  const [row] = await db
    .select({ id: toolResultCache.id, result: toolResultCache.result })
    .from(toolResultCache)
    .where(and(eq(toolResultCache.toolName, toolName), eq(toolResultCache.inputHash, hash), gt(toolResultCache.expiresAt, now)));

  if (!row) return null;

  // Bump hit count async (fire-and-forget)
  db.update(toolResultCache)
    .set({ hitCount: sql`${toolResultCache.hitCount} + 1` })
    .where(eq(toolResultCache.id, row.id))
    .catch(() => {});

  return row.result;
}

export async function putCache(toolName: string, input: unknown, result: unknown, principalId?: string): Promise<void> {
  const ttl = TOOL_TTL[toolName];
  if (!ttl) return; // Tool not cacheable

  const hash = hashInput(toolName, input, principalId);
  const expiresAt = new Date(Date.now() + ttl * 1000);

  try {
    await db.insert(toolResultCache)
      .values({ toolName, inputHash: hash, result: result as any, expiresAt })
      .onConflictDoUpdate({
        target: [toolResultCache.toolName, toolResultCache.inputHash],
        set: { result: result as any, expiresAt, hitCount: 0 },
      });
  } catch {
    // Best-effort; don't fail the tool call
  }
}

export function getToolTtl(toolName: string): number | undefined {
  return TOOL_TTL[toolName];
}
