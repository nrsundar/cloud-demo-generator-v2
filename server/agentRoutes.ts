import { Express } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { demoRequests, agentActions, insertDemoRequestSchema } from "@shared/schema";
import { requireAuth, requireAdmin } from "./auth";
import { generateClarifyingQuestions, generateDemoSpec } from "./agent";

export function registerAgentRoutes(app: Express) {
  // ── User endpoints ──

  app.post("/api/demo-requests", requireAuth, async (req, res) => {
    try {
      const data = insertDemoRequestSchema.parse(req.body);
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

    // Save answers and generate spec
    await db.update(demoRequests)
      .set({ clarifyingAnswers: answers, status: "generating_spec", updatedAt: new Date() })
      .where(eq(demoRequests.id, id));

    try {
      const spec = await generateDemoSpec({
        title: request.title,
        description: request.description,
        targetExtension: request.targetExtension ?? undefined,
        customerIndustry: request.customerIndustry ?? undefined,
        complexity: request.complexity ?? undefined,
        clarifyingAnswers: answers,
      });

      await db.update(demoRequests)
        .set({ spec, status: "spec_ready", updatedAt: new Date() })
        .where(eq(demoRequests.id, id));

      // Create agent action for admin review
      await db.insert(agentActions).values({
        agentType: "new_demo",
        triggerSource: "user_request",
        requestId: id,
        inputData: { title: request.title, answers },
        proposedPlan: spec,
        status: "proposed",
      });

      res.json({ status: "spec_ready", spec });
    } catch (err: any) {
      console.error("Spec generation failed:", err);
      await db.update(demoRequests)
        .set({ status: "clarifying", updatedAt: new Date() })
        .where(eq(demoRequests.id, id));
      res.status(500).json({ error: "Spec generation failed. Please try again." });
    }
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
}
