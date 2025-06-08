import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Production-specific middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

(async () => {
  // Register API routes first
  const server = await registerRoutes(app);

  // Serve static files from dist/public
  const publicPath = path.resolve(__dirname, "public");
  app.use(express.static(publicPath));

  // Catch-all handler for SPA routing
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });

  // Use PORT environment variable or default to 5000
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  server.listen(port, "0.0.0.0", () => {
    console.log(`Production server running on port ${port}`);
  });
})();