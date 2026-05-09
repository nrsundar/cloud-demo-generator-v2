import { eq, and, asc } from "drizzle-orm";
import { db } from "../db";
import {
  agentSessions,
  agentSteps,
  type AgentSession,
  type AgentStep,
  type InsertAgentStep,
  type SpecSnapshot,
} from "@shared/schema";
import { tenantOf } from "./tenant";

export interface Principal {
  sub: string;
  email: string;
  tenantId?: string;
}

function tenantFor(p: Principal): string {
  return p.tenantId ?? tenantOf(p.email, p.sub);
}

export async function createSession(principal: Principal, specSnapshot?: SpecSnapshot): Promise<AgentSession> {
  const [session] = await db
    .insert(agentSessions)
    .values({
      tenantId: tenantFor(principal),
      userId: principal.sub,
      userEmail: principal.email,
      specSnapshot: specSnapshot ?? null,
    })
    .returning();
  return session;
}

export async function loadSession(id: number, principal: Principal): Promise<AgentSession | null> {
  const tenantId = tenantFor(principal);
  const [session] = await db
    .select()
    .from(agentSessions)
    .where(and(eq(agentSessions.id, id), eq(agentSessions.tenantId, tenantId)));
  if (!session) return null;
  if (session.userId !== principal.sub) return null;
  return session;
}

export async function loadHistory(sessionId: number): Promise<AgentStep[]> {
  return db
    .select()
    .from(agentSteps)
    .where(eq(agentSteps.sessionId, sessionId))
    .orderBy(asc(agentSteps.turnIndex), asc(agentSteps.id));
}

export async function appendStep(step: InsertAgentStep): Promise<AgentStep> {
  const [row] = await db.insert(agentSteps).values(step).returning();
  return row;
}

export async function persistSession(
  sessionId: number,
  patch: Partial<Pick<AgentSession, "phase" | "specSnapshot" | "lastEventId">>,
): Promise<void> {
  await db
    .update(agentSessions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(agentSessions.id, sessionId));
}

export async function nextTurnIndex(sessionId: number): Promise<number> {
  const history = await loadHistory(sessionId);
  if (history.length === 0) return 0;
  return (history[history.length - 1]!.turnIndex ?? 0) + 1;
}
