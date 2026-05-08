import { z } from "zod";
import type { ToolSpec } from "./types";

interface ExtensionEntry {
  name: string;
  description: string;
  ga: boolean;
  defaultUseCases: string[];
}

const CATALOG: Record<string, ExtensionEntry[] | string> = {
  postgres: [
    {
      name: "pgvector",
      description: "Vector similarity search via L2, cosine, or inner product. Backbone for RAG and semantic search.",
      ga: true,
      defaultUseCases: ["semantic search", "RAG", "recommendations"],
    },
    {
      name: "postgis",
      description: "Geospatial types and operators (ST_*). Standard for any lat/lon or geometry workload.",
      ga: true,
      defaultUseCases: ["geospatial", "logistics", "store locator"],
    },
    {
      name: "pgrouting",
      description: "Graph routing on top of PostGIS — Dijkstra, A*, K-shortest paths.",
      ga: true,
      defaultUseCases: ["route planning", "supply chain", "network analysis"],
    },
    {
      name: "pg_trgm",
      description: "Trigram-based fuzzy text similarity and indexed LIKE.",
      ga: true,
      defaultUseCases: ["fuzzy search", "deduplication", "typo tolerance"],
    },
    {
      name: "pg_cron",
      description: "In-database cron scheduling. Requires shared_preload_libraries.",
      ga: true,
      defaultUseCases: ["periodic maintenance", "scheduled refresh", "cleanup jobs"],
    },
    {
      name: "auto_explain",
      description: "Automatically logs execution plans for slow queries.",
      ga: true,
      defaultUseCases: ["query tuning", "production diagnostics"],
    },
  ],
  "aurora-postgres": "postgres",
  "aurora-postgresql": "postgres",
  mysql: [],
  "aurora-mysql": [],
  oracle: [],
  sqlserver: [],
  "sql-server": [],
  dynamodb: [],
  neptune: [],
  elasticache: [],
  redis: [],
  documentdb: [],
};

const inputSchema = z.object({
  database: z.string().min(1).describe("Database engine, e.g. 'postgres', 'aurora-postgres', 'dynamodb'."),
});

const outputSchema = z.object({
  database: z.string(),
  extensions: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      ga: z.boolean(),
      defaultUseCases: z.array(z.string()),
    }),
  ),
});

function normalize(database: string): string {
  return database.trim().toLowerCase().replace(/\s+/g, "-");
}

function resolve(key: string): ExtensionEntry[] {
  const seen = new Set<string>();
  let cur: unknown = CATALOG[key];
  while (typeof cur === "string" && !seen.has(cur)) {
    seen.add(cur);
    cur = CATALOG[cur];
  }
  return Array.isArray(cur) ? cur : [];
}

export const lookupExtensions: ToolSpec<typeof inputSchema, typeof outputSchema> = {
  name: "lookupExtensions",
  description:
    "Returns the catalog of available extensions/add-ons for a given database engine. " +
    "Use this when the user has chosen a database but not specified which extension to demo.",
  inputSchema,
  outputSchema,
  async execute(_principal, input) {
    const key = normalize(input.database);
    return { database: key, extensions: resolve(key) };
  },
};
