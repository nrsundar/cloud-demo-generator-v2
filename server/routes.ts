import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRepositorySchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireFirebaseAuth, requireAdmin } from "./firebaseAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Analytics endpoint (admin only) - using simplified auth for Firebase
  app.get('/api/analytics/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDownloadStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get signed-in users (admin only)
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = (storage as any).getSignedInUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Track user sign-in (called when Firebase auth succeeds)
  app.post('/api/track-signin', async (req, res) => {
    try {
      const { email } = req.body;
      if (email) {
        (storage as any).trackUserSignIn(email);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking sign-in:", error);
      res.status(500).json({ message: "Failed to track sign-in" });
    }
  });

  // Clear all repositories (for development)
  app.delete("/api/repositories/clear", async (req, res) => {
    try {
      (storage as any).clearAll();
      res.json({ message: "All repositories cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear repositories" });
    }
  });

  // Get all repositories
  app.get("/api/repositories", async (req, res) => {
    try {
      const repositories = await storage.getAllRepositories();
      res.json(repositories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  // Get repository by ID
  app.get("/api/repositories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      res.json(repository);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repository" });
    }
  });

  // Create new repository with analytics tracking
  app.post("/api/repositories", async (req, res) => {
    try {
      const validatedData = insertRepositorySchema.parse(req.body);
      const repository = await storage.createRepository(validatedData);
      
      // Track analytics if user is authenticated
      if (req.isAuthenticated && req.isAuthenticated()) {
        try {
          const userId = (req.user as any)?.claims?.sub;
          if (userId) {
            await storage.logDownload({
              userId,
              repositoryName: repository.name,
              useCase: repository.useCases[0] || 'Unknown',
              language: repository.language,
              databaseVersion: repository.databaseVersion,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
            });
          }
        } catch (analyticsError) {
          console.log('Analytics tracking failed:', analyticsError);
        }
      }
      
      res.status(201).json(repository);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid repository data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create repository" });
    }
  });

  // Generate repository content
  app.post("/api/repositories/:id/generate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      // Start generation process (async)
      storage.generateRepositoryContent(id);
      
      res.json({ message: "Generation started", repositoryId: id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start generation" });
    }
  });

  // Get repository statistics
  app.get("/api/repositories/:id/stats", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const stats = await storage.getRepositoryStats(id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repository stats" });
    }
  });

  // Get learning modules
  app.get("/api/repositories/:id/modules", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const modules = await storage.getLearningModules(id);
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning modules" });
    }
  });

  // Get datasets
  app.get("/api/repositories/:id/datasets", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const datasets = await storage.getDatasets(id);
      res.json(datasets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch datasets" });
    }
  });

  // Download repository as ZIP
  app.get("/api/repositories/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      if (repository.status !== "complete") {
        return res.status(400).json({ message: "Repository generation not complete" });
      }
      
      // Log download with user email for analytics
      const userEmail = req.query.userEmail as string;
      if (userEmail) {
        try {
          await storage.logDownload({
            userId: userEmail,
            userEmail: userEmail,
            repositoryName: repository.name,
            useCase: repository.useCases[0] || 'General',
            language: repository.language,
            downloadedAt: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
          });
        } catch (analyticsError) {
          console.log('Download analytics tracking failed:', analyticsError);
        }
      }
      
      const zipBuffer = await storage.generateRepositoryZip(id);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${repository.name}-v1.0.zip"`);
      res.setHeader('Content-Length', zipBuffer.length);
      
      res.send(zipBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate download" });
    }
  });

  // Feedback and demo request endpoints
  app.post("/api/feedback", async (req, res) => {
    try {
      const { email, demoType, priority, message } = req.body;
      
      if (!email || !demoType || !priority || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const feedback = await storage.submitFeedback({
        email,
        demoType,
        priority,
        message,
        status: "pending"
      });
      
      res.json({ success: true, id: feedback.id });
    } catch (error) {
      console.error("Feedback submission error:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Admin routes for feedback management
  app.get("/api/admin/feedback", async (req, res) => {
    try {
      const feedback = await storage.getAllFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Enhanced analytics for admin dashboard
  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const stats = await storage.getDownloadStats();
      res.json(stats);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Admin users endpoint
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = storage.getSignedInUsers();
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
