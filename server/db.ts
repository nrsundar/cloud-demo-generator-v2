import { Pool, type PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readFileSync, existsSync } from "fs";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// In production, verify the RDS server certificate against the bundled AWS RDS
// global CA. The image (or local dev environment) places it at RDS_CA_BUNDLE_PATH;
// /etc/ssl/rds-global-bundle.pem is the default written by the Dockerfile.
function buildSslConfig(): PoolConfig["ssl"] {
  if (process.env.NODE_ENV !== "production") return undefined;
  const caPath = process.env.RDS_CA_BUNDLE_PATH || "/etc/ssl/rds-global-bundle.pem";
  if (existsSync(caPath)) {
    return { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true };
  }
  // Fallback: TLS still in use (sslmode=require on the URL also enforces transport),
  // but without server-cert verification. Log loudly so it's not silent.
  console.warn(
    `[db] RDS CA bundle not found at ${caPath}; falling back to TLS without server-cert verification.`,
  );
  return { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSslConfig(),
});
export const db = drizzle(pool, { schema });
