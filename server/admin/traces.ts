import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { agentTraces, agentSpans } from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export const traceRouter = Router();

// GET /api/admin/traces
traceRouter.get("/", async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const user = req.query.user as string | undefined;
  const status = req.query.status as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const conditions = [];
  if (status) conditions.push(eq(agentTraces.status, status));
  if (from) conditions.push(gte(agentTraces.startedAt, new Date(from)));
  if (to) conditions.push(lte(agentTraces.startedAt, new Date(to)));

  const rows = await db
    .select()
    .from(agentTraces)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(agentTraces.startedAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

// GET /api/admin/traces/:id
traceRouter.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [traceRow] = await db.select().from(agentTraces).where(eq(agentTraces.id, id));
  if (!traceRow) return res.status(404).json({ error: "Trace not found" });

  const spans = await db
    .select()
    .from(agentSpans)
    .where(eq(agentSpans.traceId, id))
    .orderBy(agentSpans.startedAt);

  res.json({ trace: traceRow, spans });
});

// GET /api/admin/traces/cost-rollup
traceRouter.get("/cost-rollup", async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 7;
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await db
    .select({
      totalCost: sql<string>`COALESCE(SUM(CAST(${agentTraces.estCostUsd} AS NUMERIC)), 0)::text`,
      totalTokensIn: sql<number>`COALESCE(SUM(${agentTraces.totalTokensIn}), 0)`,
      totalTokensOut: sql<number>`COALESCE(SUM(${agentTraces.totalTokensOut}), 0)`,
      traceCount: sql<number>`COUNT(*)`,
    })
    .from(agentTraces)
    .where(gte(agentTraces.startedAt, since));

  res.json({ days, ...rows[0] });
});
