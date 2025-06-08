import { Express } from "express";
import { Storage } from "./storage";

// Temporary placeholder until Firebase Auth is wired up
const isAuthenticated = (req: any, res: any, next: any) => next();

export function registerRoutes(app: Express) {
  const storage = new Storage();

  app.get("/api/repositories/:id/zip", isAuthenticated, async (req, res) => {
    const repoId = parseInt(req.params.id);
    try {
      const zipBuffer = await storage.generateRepositoryZip(repoId);
      res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=repository-${repoId}.zip`,
      });
      res.send(zipBuffer);
    } catch (err) {
      console.error("ZIP download failed:", err);
      res.status(500).json({ error: "ZIP download failed." });
    }
  });
}