import { Express } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { demoRequests, agentActions, repositories, agentJobs, insertDemoRequestSchema } from "@shared/schema";
import { requireAuth, requireAdmin } from "./auth";
import { generateClarifyingQuestions, generateDemoSpec, resetMetrics, getMetrics } from "./agent";
import { generateDemoTemplate } from "./templateGenerator";
import { runBugFixAgent } from "./bugFixAgent";

// In-memory cache for generated ZIPs (cleared on restart, fine for this use case)
const generatedZips = new Map<number, Buffer>();

export function registerAgentRoutes(app: Express) {
  // ── User endpoints ──

  app.post("/api/demo-requests", requireAuth, async (req, res) => {
    try {
      const data = insertDemoRequestSchema.parse(req.body);
      const skipDedup = req.body.skipDedup === true;

      // Check if a similar demo already exists (skip if from Generator agent)
      if (!skipDedup) {
      const existing = await db.select().from(repositories)
        .where(eq(repositories.status, "complete"));
      const match = existing.find(r => {
        const useCases = (r.useCases as string[]) || [];
        const ext = data.targetExtension?.toLowerCase();
        return ext && (useCases.some(u => u.toLowerCase().includes(ext)) || r.name.toLowerCase().includes(ext));
      });
      if (match) {
        return res.json({
          existingMatch: true,
          message: `A demo for "${data.targetExtension}" already exists: "${match.name}". You can download it from the AI Demo Catalog.`,
          matchedRepo: { id: match.id, name: match.name },
        });
      }
      } // end skipDedup

      const [request] = await db.insert(demoRequests).values(data).returning();

      // Generate clarifying questions via Bedrock
      try {
        const questions = await generateClarifyingQuestions({
          title: data.title,
          description: data.description,
          targetExtension: data.targetExtension ?? undefined,
          customerIndustry: data.customerIndustry ?? undefined,
          complexity: data.complexity ?? undefined,
        });
        await db.update(demoRequests)
          .set({ status: "clarifying", clarifyingQuestions: questions, updatedAt: new Date() })
          .where(eq(demoRequests.id, request.id));
        request.status = "clarifying";
        request.clarifyingQuestions = questions;
      } catch (err) {
        console.error("Bedrock clarifying questions failed:", err);
        // Keep as pending if Bedrock fails
      }

      res.json(request);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/demo-requests", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const requests = await db.select().from(demoRequests)
      .where(eq(demoRequests.requesterEmail, user.email))
      .orderBy(desc(demoRequests.createdAt));
    res.json(requests);
  });

  app.get("/api/demo-requests/:id", requireAuth, async (req, res) => {
    const [request] = await db.select().from(demoRequests)
      .where(eq(demoRequests.id, parseInt(req.params.id)));
    if (!request) return res.status(404).json({ error: "Not found" });
    res.json(request);
  });

  app.post("/api/demo-requests/:id/answers", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const { answers } = req.body;
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "answers object required" });
    }

    const [request] = await db.select().from(demoRequests).where(eq(demoRequests.id, id));
    if (!request) return res.status(404).json({ error: "Not found" });

    // Save answers and respond immediately
    await db.update(demoRequests)
      .set({ clarifyingAnswers: answers, status: "generating_spec", updatedAt: new Date() })
      .where(eq(demoRequests.id, id));

    res.json({ status: "generating_spec", message: "Answers received. AI is generating the demo spec — you'll see it in the dashboard shortly." });

    // Generate spec in background
    (async () => {
      try {
        resetMetrics();
        const spec = await generateDemoSpec({
          title: request.title,
          description: request.description,
          targetExtension: request.targetExtension ?? undefined,
          customerIndustry: request.customerIndustry ?? undefined,
          complexity: request.complexity ?? undefined,
          clarifyingAnswers: answers,
        });
        const metrics = getMetrics();

        await db.update(demoRequests)
          .set({ spec, status: "spec_ready", updatedAt: new Date() })
          .where(eq(demoRequests.id, id));

        await db.insert(agentActions).values({
          agentType: "new_demo",
          triggerSource: "user_request",
          requestId: id,
          inputData: { title: request.title, answers },
          proposedPlan: spec,
          executionResult: { metrics },
          status: "proposed",
        });

        console.log(`✅ Spec generated for request ${id} (${metrics.totalInputTokens + metrics.totalOutputTokens} tokens, ${(metrics.totalDurationMs / 1000).toFixed(1)}s)`);
      } catch (err: any) {
        console.error(`❌ Spec generation failed for request ${id}:`, err);
        await db.update(demoRequests)
          .set({ status: "clarifying", updatedAt: new Date() })
          .where(eq(demoRequests.id, id));
      }
    })();
  });

  app.get("/api/demo-requests/:id/download", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(demoRequests).where(eq(demoRequests.id, id));
    if (!request) return res.status(404).json({ error: "Not found" });
    if (request.status !== "complete") return res.status(400).json({ error: "Template not ready" });

    const zip = generatedZips.get(id);
    if (!zip) return res.status(404).json({ error: "ZIP not available (server may have restarted). Request re-generation." });

    const name = (request.spec as any)?.name || `demo-${id}`;
    res.set({ "Content-Type": "application/zip", "Content-Disposition": `attachment; filename=${name}.zip` });
    res.send(zip);
  });

  // ── Admin endpoints ──

  app.get("/api/admin/demo-requests", requireAuth, requireAdmin, async (_req, res) => {
    const requests = await db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));
    res.json(requests);
  });

  app.post("/api/admin/demo-requests/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    await db.update(demoRequests)
      .set({ status: "approved", adminNotes: notes || null, updatedAt: new Date() })
      .where(eq(demoRequests.id, id));

    // Update corresponding agent action
    await db.update(agentActions)
      .set({ status: "approved", adminDecision: "approve", adminNotes: notes || null, updatedAt: new Date() })
      .where(eq(agentActions.requestId, id));

    res.json({ success: true });

    // Trigger template generation in background
    (async () => {
      try {
        const [request] = await db.select().from(demoRequests).where(eq(demoRequests.id, id));
        if (!request?.spec) return;

        await db.update(demoRequests)
          .set({ status: "generating", updatedAt: new Date() })
          .where(eq(demoRequests.id, id));

        const zipBuffer = await generateDemoTemplate(request.spec as any);
        generatedZips.set(id, zipBuffer);

        // Store the generated ZIP as base64 in execution result
        await db.update(agentActions)
          .set({ status: "complete", executionResult: { zipSize: zipBuffer.length, generatedAt: new Date().toISOString() }, updatedAt: new Date() })
          .where(eq(agentActions.requestId, id));

        await db.update(demoRequests)
          .set({ status: "complete", updatedAt: new Date() })
          .where(eq(demoRequests.id, id));

        // Create repository entry so it appears on the dashboard
        const specData = request.spec as any;
        const ext = (specData.extension || request.targetExtension || "").toLowerCase();
        const dbInfo = ext.includes("dynamo") ? { type: "DynamoDB", ver: "On-Demand" }
          : ext.includes("neptune") ? { type: "Neptune", ver: "1.3" }
          : ext.includes("elasticache") || ext.includes("redis") ? { type: "ElastiCache", ver: "7.x" }
          : ext.includes("documentdb") ? { type: "DocumentDB", ver: "6.0" }
          : ext.includes("mysql") ? { type: "Aurora MySQL", ver: "8.0" }
          : ext.includes("oracle") ? { type: "RDS Oracle", ver: "19c" }
          : ext.includes("sqlserver") || ext.includes("sql-server") ? { type: "RDS SQL Server", ver: "2022" }
          : { type: "Aurora PostgreSQL", ver: "17" };
        await db.insert(repositories).values({
          name: specData.name || request.title,
          language: ext.includes("dynamo") ? "typescript" : ext.includes("neptune") ? "python" : "python",
          databaseVersion: dbInfo.ver,
          databaseType: dbInfo.type,
          instanceType: ext.includes("dynamo") ? "On-Demand" : ext.includes("elasticache") ? "cache.r7g.large" : "db.t4g.medium",
          awsRegion: "us-east-2",
          useCases: [specData.extension || request.targetExtension || "custom"],
          complexityLevel: request.complexity || "intermediate",
          status: "complete",
          progress: 100,
        });

        console.log(`✅ Template generated for request ${id} (${zipBuffer.length} bytes)`);
      } catch (err) {
        console.error(`❌ Template generation failed for request ${id}:`, err);
        await db.update(demoRequests)
          .set({ status: "approved", updatedAt: new Date() })
          .where(eq(demoRequests.id, id));
      }
    })();
  });

  // Regenerate — re-triggers template generation for an existing completed/approved request
  app.post("/api/admin/demo-requests/:id/regenerate", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(demoRequests).where(eq(demoRequests.id, id));
    if (!request?.spec) return res.status(400).json({ error: "No spec found" });
    await db.update(demoRequests).set({ status: "generating", updatedAt: new Date() }).where(eq(demoRequests.id, id));
    res.json({ success: true, message: "Regenerating..." });

    (async () => {
      try {
        const zipBuffer = await generateDemoTemplate(request.spec as any);
        generatedZips.set(id, zipBuffer);
        await db.update(demoRequests).set({ status: "complete", updatedAt: new Date() }).where(eq(demoRequests.id, id));
        console.log(`✅ Regenerated request ${id} (${zipBuffer.length} bytes)`);
      } catch (err) {
        console.error(`❌ Regeneration failed for request ${id}:`, err);
        await db.update(demoRequests).set({ status: "complete", updatedAt: new Date() }).where(eq(demoRequests.id, id));
      }
    })();
  });

  app.post("/api/admin/demo-requests/:id/reject", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    await db.update(demoRequests)
      .set({ status: "rejected", adminNotes: notes || null, updatedAt: new Date() })
      .where(eq(demoRequests.id, id));

    await db.update(agentActions)
      .set({ status: "rejected", adminDecision: "reject", adminNotes: notes || null, updatedAt: new Date() })
      .where(eq(agentActions.requestId, id));

    res.json({ success: true });
  });

  // Fix existing repo metadata (one-time migration)
  app.post("/api/admin/fix-repo-metadata", requireAuth, requireAdmin, async (_req, res) => {
    const allRepos = await db.select().from(repositories);
    let fixed = 0;
    for (const repo of allRepos) {
      const ext = (repo.useCases as string[])?.[0]?.toLowerCase() || "";
      const name = (repo.name || "").toLowerCase();
      const hint = ext + " " + name;
      const dbInfo = hint.includes("dynamo") ? { type: "DynamoDB", ver: "On-Demand" }
        : hint.includes("neptune") ? { type: "Neptune", ver: "1.3" }
        : hint.includes("elasticache") || hint.includes("redis") ? { type: "ElastiCache", ver: "7.x" }
        : hint.includes("documentdb") ? { type: "DocumentDB", ver: "6.0" }
        : hint.includes("mysql") || hint.includes("aurora-mysql") ? { type: "Aurora MySQL", ver: "8.0" }
        : hint.includes("oracle") ? { type: "RDS Oracle", ver: "19c" }
        : { type: "Aurora PostgreSQL", ver: "17" };
      if (repo.databaseType !== dbInfo.type || repo.databaseVersion !== dbInfo.ver) {
        await db.update(repositories).set({ databaseType: dbInfo.type, databaseVersion: dbInfo.ver }).where(eq(repositories.id, repo.id));
        fixed++;
      }
    }
    res.json({ success: true, fixed, total: allRepos.length });
  });

  app.post("/api/admin/bulk-approve", requireAuth, requireAdmin, async (req, res) => {
    const { ids, notes } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array required" });

    for (const id of ids) {
      await db.update(demoRequests)
        .set({ status: "approved", adminNotes: notes || null, updatedAt: new Date() })
        .where(eq(demoRequests.id, id));
      await db.update(agentActions)
        .set({ status: "approved", adminDecision: "approve", updatedAt: new Date() })
        .where(eq(agentActions.requestId, id));
    }
    res.json({ success: true, count: ids.length });
  });

  app.get("/api/admin/agent-actions", requireAuth, requireAdmin, async (_req, res) => {
    const actions = await db.select().from(agentActions).orderBy(desc(agentActions.createdAt));
    res.json(actions);
  });

  app.post("/api/admin/agent-actions/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    await db.update(agentActions)
      .set({ status: "approved", adminDecision: "approve", adminNotes: notes || null, updatedAt: new Date() })
      .where(eq(agentActions.id, id));
    res.json({ success: true });
  });

  app.post("/api/admin/agent-actions/bulk-approve", requireAuth, requireAdmin, async (req, res) => {
    const { ids, notes } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array required" });

    for (const id of ids) {
      await db.update(agentActions)
        .set({ status: "approved", adminDecision: "approve", adminNotes: notes || null, updatedAt: new Date() })
        .where(eq(agentActions.id, id));
    }
    res.json({ success: true, count: ids.length });
  });

  // ── Bug Fix Agent ──

  app.post("/api/admin/run-bug-fix-agent", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const result = await runBugFixAgent();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Generative UI Agent endpoint ──
  app.post("/api/generator/agent", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { messages, specSnapshot, sessionId } = req.body ?? {};
    const lastUserMessage = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m?.role === "user")?.content
      : undefined;
    if (typeof lastUserMessage !== "string" || lastUserMessage.length === 0) {
      return res.status(400).json({ error: "messages[] must include at least one user message" });
    }
    try {
      const { runTurnFromMessage } = await import("./agent/loop");
      const result = await runTurnFromMessage({
        principal: { sub: user.sub, email: user.email },
        sessionId: typeof sessionId === "number" ? sessionId : undefined,
        userMessage: lastUserMessage,
        specSnapshot: specSnapshot || undefined,
      });
      res.json({ sessionId: result.sessionId, ...result.envelope });
    } catch (err: any) {
      console.error("Generator agent error:", err);
      res.json({
        sessionId: typeof sessionId === "number" ? sessionId : null,
        message: "I encountered an error. Please try again.",
        components: [{ type: "ErrorCard", title: "Agent Error", message: err.message || "Unknown error" }],
        specSnapshot: specSnapshot || null,
        phase: "error",
      });
    }
  });

  // ── Generative UI Agent — streaming (SSE) ──
  app.post("/api/generator/agent/stream", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { messages, specSnapshot, sessionId } = req.body ?? {};
    const lastUserMessage = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m?.role === "user")?.content
      : undefined;
    if (typeof lastUserMessage !== "string" || lastUserMessage.length === 0) {
      return res.status(400).json({ error: "messages[] must include at least one user message" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let aborted = false;
    req.on("close", () => {
      aborted = true;
    });

    try {
      const { runTurnFromMessage } = await import("./agent/loop");
      const result = await runTurnFromMessage({
        principal: { sub: user.sub, email: user.email },
        sessionId: typeof sessionId === "number" ? sessionId : undefined,
        userMessage: lastUserMessage,
        specSnapshot: specSnapshot || undefined,
        onEvent: (e) => {
          if (aborted) return;
          send(e.type, e);
        },
      });
      if (!aborted) {
        send("done", { sessionId: result.sessionId });
        res.end();
      }
    } catch (err: any) {
      if (!aborted) {
        send("error", { message: err?.message || "Unknown error" });
        res.end();
      }
    }
  });

  // Schedule bug fix agent to run hourly
  setInterval(() => {
    runBugFixAgent().catch(err => console.error("Scheduled bug fix agent failed:", err));
  }, 60 * 60 * 1000);

  // Nightly dedup: flag similar repos (runs every 24h)
  setInterval(async () => {
    try {
      const allRepos = await db.select().from(repositories).where(eq(repositories.status, "complete"));
      if (allRepos.length < 2) return;
      const duplicates: { keep: number; remove: number; reason: string }[] = [];
      for (let i = 0; i < allRepos.length; i++) {
        for (let j = i + 1; j < allRepos.length; j++) {
          const a = allRepos[i], b = allRepos[j];
          // Same name = exact duplicate
          if (a.name === b.name) {
            duplicates.push({ keep: a.id, remove: b.id, reason: `Exact duplicate: ${a.name}` });
            continue;
          }
          // Same extension + same industry keywords = likely duplicate
          const aUse = ((a.useCases as string[]) || []).join(",").toLowerCase();
          const bUse = ((b.useCases as string[]) || []).join(",").toLowerCase();
          const aName = (a.name || "").toLowerCase();
          const bName = (b.name || "").toLowerCase();
          if (aUse && aUse === bUse && a.databaseType === b.databaseType) {
            // Check name similarity (shared words)
            const aWords = new Set(aName.split("-").filter(w => w.length > 3));
            const bWords = new Set(bName.split("-").filter(w => w.length > 3));
            const shared = Array.from(aWords).filter(w => bWords.has(w)).length;
            if (shared >= 2) {
              duplicates.push({ keep: a.id, remove: b.id, reason: `Similar: ${a.name} ≈ ${b.name} (${shared} shared words, same extension)` });
            }
          }
        }
      }
      if (duplicates.length > 0) {
        console.log(`🔄 Dedup found ${duplicates.length} similar repos:`);
        for (const d of duplicates) {
          console.log(`   Keep #${d.keep}, flag #${d.remove}: ${d.reason}`);
          // Mark as duplicate (don't delete — admin reviews)
          await db.update(repositories).set({ status: "duplicate" }).where(eq(repositories.id, d.remove));
        }
      }
    } catch (err) {
      console.error("Nightly dedup failed:", err);
    }
  }, 24 * 60 * 60 * 1000);

  // ── P2.2: Async job submission ──

  app.post("/api/generator/agent/start", requireAuth, async (req, res) => {
    try {
      const { sessionId, userMessage, specSnapshot } = req.body;
      const principal = (req as any).principal;
      if (!userMessage) return res.status(400).json({ error: "userMessage required" });

      const crypto = await import("crypto");
      const idempotencyKey = crypto.createHash("sha256")
        .update(`${sessionId ?? "new"}:${userMessage}`)
        .digest("hex");

      // Check for existing job with same key
      const [existing] = await db.select().from(agentJobs)
        .where(eq(agentJobs.idempotencyKey, idempotencyKey));
      if (existing) {
        return res.json({ sessionId: existing.sessionId, jobId: existing.id, state: existing.state, result: existing.result });
      }

      // Create session if needed
      let sid = sessionId;
      if (!sid) {
        const { createSession } = await import("./agent/sessions");
        const s = await createSession(principal, specSnapshot);
        sid = s.id;
      }

      const turnIndex = 0;
      const [job] = await db.insert(agentJobs).values({
        sessionId: sid,
        turnIndex,
        idempotencyKey,
        payload: { sessionId: sid, principal, userMessage } as any,
      }).returning();

      res.json({ sessionId: sid, jobId: job.id, state: "ready" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/generator/agent/job/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const [job] = await db.select().from(agentJobs).where(eq(agentJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.get("/api/admin/queue-depth", requireAuth, requireAdmin, async (_req, res) => {
    const [row] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(agentJobs)
      .where(eq(agentJobs.state, "ready"));
    res.json({ ready: row?.count ?? 0 });
  });
}
