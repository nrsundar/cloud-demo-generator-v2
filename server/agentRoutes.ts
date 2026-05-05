import { Express } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { demoRequests, agentActions, repositories, insertDemoRequestSchema } from "@shared/schema";
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

      // Check if a similar demo already exists
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
        await db.insert(repositories).values({
          name: specData.name || request.title,
          language: "python",
          databaseVersion: "16",
          databaseType: "Aurora",
          instanceType: "db.t4g.medium",
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

  // Schedule bug fix agent to run daily (every 24h)
  setInterval(() => {
    runBugFixAgent().catch(err => console.error("Scheduled bug fix agent failed:", err));
  }, 24 * 60 * 60 * 1000);
}
