import { db } from "../db";
import { agentJobs } from "@shared/schema";
import { eq, sql, or, and, lt } from "drizzle-orm";
import { runTurn } from "./loop";
import type { Principal } from "./sessions";
import * as os from "os";

const LEASE_DURATION_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

const workerId = `${os.hostname()}-${process.pid}`;
let running = false;

interface JobPayload {
  sessionId: number;
  principal: Principal;
  userMessage: string;
}

async function leaseNextJob() {
  const now = new Date();
  const leaseUntil = new Date(Date.now() + LEASE_DURATION_MS);

  const rows = await db.execute(sql`
    UPDATE agent_jobs
    SET state = 'leased',
        worker_id = ${workerId},
        lease_until = ${leaseUntil},
        attempts = attempts + 1,
        updated_at = ${now}
    WHERE id = (
      SELECT id FROM agent_jobs
      WHERE state = 'ready' OR (state = 'leased' AND lease_until < ${now})
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  return (rows as any).rows?.[0] ?? null;
}

async function markDone(jobId: number, result: unknown) {
  await db
    .update(agentJobs)
    .set({ state: "done", result: result as any, updatedAt: new Date() })
    .where(eq(agentJobs.id, jobId));
}

async function markFailed(jobId: number, error: unknown) {
  const row = await db.select({ attempts: agentJobs.attempts, maxAttempts: agentJobs.maxAttempts })
    .from(agentJobs).where(eq(agentJobs.id, jobId));
  const exhausted = row[0] && row[0].attempts >= row[0].maxAttempts;

  await db
    .update(agentJobs)
    .set({
      state: exhausted ? "failed" : "ready",
      lastError: error as any,
      updatedAt: new Date(),
      leaseUntil: null,
      workerId: null,
    })
    .where(eq(agentJobs.id, jobId));
}

async function pollOnce() {
  const job = await leaseNextJob();
  if (!job) return;

  const payload: JobPayload = job.payload as any;
  try {
    const result = await runTurn({
      sessionId: payload.sessionId,
      principal: payload.principal,
      userMessage: payload.userMessage,
    });
    await markDone(job.id, result);
  } catch (err: any) {
    await markFailed(job.id, { message: err?.message ?? "Unknown error" });
  }
}

export function startWorker() {
  if (running) return;
  running = true;
  console.log(`[worker] Started (id=${workerId}, poll=${POLL_INTERVAL_MS}ms)`);

  setInterval(async () => {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[worker] Poll error:", err);
    }
  }, POLL_INTERVAL_MS);
}

export { workerId };
