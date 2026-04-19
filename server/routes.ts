import { Express } from "express";
import { Storage } from "./storage";
import { insertRepositorySchema } from "@shared/schema";
import { requireAuth, requireAdmin } from "./auth";

const storage = new Storage();

export function registerRoutes(app: Express) {
  // Public
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Authenticated
  app.post("/api/repositories", requireAuth, async (req, res) => {
    try {
      const data = insertRepositorySchema.parse(req.body);
      const repo = await storage.createRepository(data);
      setTimeout(async () => {
        await storage.updateRepositoryStatus(repo.id, "generating", 50);
        setTimeout(() => storage.updateRepositoryStatus(repo.id, "complete", 100), 3000);
      }, 2000);
      res.json(repo);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/repositories", requireAuth, async (_req, res) => {
    const repos = await storage.listRepositories();
    res.json(repos);
  });

  app.get("/api/repositories/:id", requireAuth, async (req, res) => {
    const repo = await storage.getRepository(parseInt(req.params.id));
    if (!repo) return res.status(404).json({ error: "Not found" });
    res.json(repo);
  });

  app.get("/api/repositories/:id/zip", requireAuth, async (req, res) => {
    try {
      const zipBuffer = await storage.generateRepositoryZip(parseInt(req.params.id));
      res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=repository-${req.params.id}.zip`,
      });
      res.send(zipBuffer);
    } catch (err) {
      console.error("ZIP download failed:", err);
      res.status(500).json({ error: "ZIP download failed." });
    }
  });

  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const fb = await storage.createFeedback(req.body);
      res.json(fb);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/feedback", requireAuth, requireAdmin, async (_req, res) => {
    const list = await storage.listFeedback();
    res.json(list);
  });

  app.get("/api/analytics/stats", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAnalytics();
      res.json(stats);
    } catch {
      res.json({ totalDownloads: 0, uniqueUsers: 0, topUseCases: [], topLanguages: [], feedbackCount: 0 });
    }
  });
}
