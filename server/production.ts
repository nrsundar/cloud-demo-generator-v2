import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { ensureSchema } from "./migrate";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for Amplify frontend
const ALLOWED_ORIGINS = [
  "https://main.d1s77hhl4y34ji.amplifyapp.com",
  "https://d1s77hhl4y34ji.amplifyapp.com",
  "http://localhost:3000",
  "http://localhost:5000",
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      console.log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  // Create tables before starting
  await ensureSchema();

  registerRoutes(app);

  // Error handler — don't crash the process
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err.message || err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message || "Internal Server Error" });
  });

  // Serve static files only in dev or if accessed directly (not Amplify setup)
  // In production with Amplify, redirect non-API requests to Amplify
  const AMPLIFY_URL = "https://main.d1s77hhl4y34ji.amplifyapp.com";
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicPath = path.resolve(__dirname, "public");

  if (process.env.AMPLIFY_URL || process.env.NODE_ENV === "production") {
    // Only serve API routes — redirect everything else to Amplify
    app.get("*", (_req, res) => {
      res.redirect(301, process.env.AMPLIFY_URL || AMPLIFY_URL);
    });
  } else {
    app.use(express.static(publicPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
  }

  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
})();
