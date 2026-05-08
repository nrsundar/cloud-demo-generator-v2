import { z } from "zod";
import type { ToolSpec } from "./types";

// AWS-managed Postgres extension support matrix.
// Sources: AWS RDS PostgreSQL "supported extensions" pages and Aurora PostgreSQL release notes.
// Conservative — when in doubt we mark as unsupported and let the agent surface alternatives.

type EngineId = "rds-postgres" | "aurora-postgres";

interface ExtensionSupport {
  // Engine major version (e.g. "13", "14", "15", "16", "17"). "*" means all currently-supported majors.
  engines: Record<EngineId, string[] | "*">;
  notes?: string;
}

const SUPPORT: Record<string, ExtensionSupport> = {
  pgvector: {
    engines: {
      "rds-postgres": ["15", "16", "17"],
      "aurora-postgres": ["15", "16", "17"],
    },
    notes: "Available on RDS PG ≥ 15.2 and Aurora PG ≥ 15.3. Earlier majors are not supported.",
  },
  postgis: {
    engines: { "rds-postgres": "*", "aurora-postgres": "*" },
    notes: "Available on all currently-supported majors.",
  },
  pgrouting: {
    engines: { "rds-postgres": "*", "aurora-postgres": "*" },
    notes: "Requires PostGIS to be enabled first.",
  },
  pg_trgm: {
    engines: { "rds-postgres": "*", "aurora-postgres": "*" },
  },
  pg_cron: {
    engines: {
      "rds-postgres": ["13", "14", "15", "16", "17"],
      "aurora-postgres": ["14", "15", "16", "17"],
    },
    notes: "Must be added to shared_preload_libraries via a custom DB parameter group; requires reboot.",
  },
  auto_explain: {
    engines: { "rds-postgres": "*", "aurora-postgres": "*" },
    notes: "Loaded via session_preload_libraries or LOAD; not added to extensions catalog (no CREATE EXTENSION).",
  },
  pg_stat_statements: {
    engines: { "rds-postgres": "*", "aurora-postgres": "*" },
  },
  hstore: {
    engines: { "rds-postgres": "*", "aurora-postgres": "*" },
  },
  citext: {
    engines: { "rds-postgres": "*", "aurora-postgres": "*" },
  },
  uuid_ossp: {
    engines: { "rds-postgres": "*", "aurora-postgres": "*" },
    notes: "Extension name is 'uuid-ossp' (with hyphen) in CREATE EXTENSION.",
  },
  // Examples of things SAs sometimes ask for that are NOT on AWS-managed PG:
  pg_repack: {
    engines: { "rds-postgres": [], "aurora-postgres": [] },
    notes: "Not available on RDS or Aurora Postgres. Closest managed equivalent is pg_squeeze (also unsupported); use VACUUM FULL during a maintenance window or migrate via Blue/Green.",
  },
  timescaledb: {
    engines: { "rds-postgres": [], "aurora-postgres": [] },
    notes: "Not supported on AWS-managed Postgres. Alternatives: pg_partman (partitioning) + pgvector or hypertable-shaped CFN logic, or migrate to Timescale Cloud.",
  },
  citus: {
    engines: { "rds-postgres": [], "aurora-postgres": [] },
    notes: "Not supported on AWS-managed Postgres. Alternative: Aurora Limitless Database (preview) for distributed Postgres.",
  },
};

// Aliases / common misspellings → canonical key.
const ALIASES: Record<string, string> = {
  vector: "pgvector",
  "uuid-ossp": "uuid_ossp",
  uuidossp: "uuid_ossp",
  "post-gis": "postgis",
  "pg-trgm": "pg_trgm",
  "pg-cron": "pg_cron",
  "pg-repack": "pg_repack",
  "pg_stat_statement": "pg_stat_statements",
  "auto-explain": "auto_explain",
  "timescale": "timescaledb",
};

// Suggested alternatives keyed by intent the SA likely had.
const ALTERNATIVES: Record<string, string[]> = {
  pg_repack: ["pg_partman", "VACUUM FULL during maintenance", "Blue/Green deployment"],
  timescaledb: ["pg_partman", "pgvector (if vector use case)"],
  citus: ["aurora-limitless-database", "rds-postgres + pg_partman"],
};

const ENGINES: EngineId[] = ["rds-postgres", "aurora-postgres"];

const inputSchema = z.object({
  extension: z.string().min(1).describe("Extension name as the user wrote it, e.g. 'pgvector', 'TimescaleDB'."),
  engine: z.enum(["rds-postgres", "aurora-postgres", "postgres"]).describe("AWS-managed Postgres engine. 'postgres' = check both."),
  engineVersion: z.string().optional().describe("Major version, e.g. '15', '16'. Optional — omit to ask 'is it supported on any current version?'."),
});

const supportEntrySchema = z.object({
  engine: z.enum(["rds-postgres", "aurora-postgres"]),
  supported: z.boolean(),
  supportedVersions: z.array(z.string()),
});

const outputSchema = z.object({
  extension: z.string(),
  canonicalName: z.string(),
  knownToCatalog: z.boolean(),
  support: z.array(supportEntrySchema),
  notes: z.string().optional(),
  alternatives: z.array(z.string()),
  decision: z.enum(["supported", "unsupported", "version-mismatch", "unknown"]),
});

function canonicalize(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return ALIASES[k] ?? k;
}

function checkOne(entry: ExtensionSupport, engine: EngineId, version?: string): { supported: boolean; supportedVersions: string[] } {
  const v = entry.engines[engine];
  if (v === "*") return { supported: true, supportedVersions: ["*"] };
  if (!Array.isArray(v) || v.length === 0) return { supported: false, supportedVersions: [] };
  if (!version) return { supported: true, supportedVersions: v };
  return { supported: v.includes(version), supportedVersions: v };
}

export const validateExtension: ToolSpec<typeof inputSchema, typeof outputSchema> = {
  name: "validateExtension",
  description:
    "Verifies whether a Postgres extension is available on AWS-managed RDS Postgres and/or Aurora Postgres for a given engine version. " +
    "ALWAYS call this before adding any extension to specSnapshot.extensions. " +
    "Returns supported versions per engine, and alternative extensions when unsupported.",
  inputSchema,
  outputSchema,
  async execute(_principal, input) {
    const canonical = canonicalize(input.extension);
    const entry = SUPPORT[canonical];
    const targetEngines: EngineId[] = input.engine === "postgres" ? ENGINES : [input.engine as EngineId];

    if (!entry) {
      return {
        extension: input.extension,
        canonicalName: canonical,
        knownToCatalog: false,
        support: targetEngines.map((e) => ({ engine: e, supported: false, supportedVersions: [] })),
        notes: "Extension is not in the AWS-managed Postgres compatibility catalog. Treat as unsupported until verified against current AWS docs.",
        alternatives: [],
        decision: "unknown" as const,
      };
    }

    const support = targetEngines.map((engine) => {
      const r = checkOne(entry, engine, input.engineVersion);
      return { engine, supported: r.supported, supportedVersions: r.supportedVersions };
    });

    const anySupported = support.some((s) => s.supported);
    const anyHasVersions = support.some((s) => s.supportedVersions.length > 0);
    let decision: "supported" | "unsupported" | "version-mismatch" | "unknown";
    if (anySupported) decision = "supported";
    else if (anyHasVersions) decision = "version-mismatch";
    else decision = "unsupported";

    return {
      extension: input.extension,
      canonicalName: canonical,
      knownToCatalog: true,
      support,
      notes: entry.notes,
      alternatives: ALTERNATIVES[canonical] ?? [],
      decision,
    };
  },
};
