import { pool } from "./db";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  database_version TEXT NOT NULL,
  database_type TEXT NOT NULL DEFAULT 'RDS',
  instance_type TEXT NOT NULL DEFAULT 'db.t4g.micro',
  aws_region TEXT NOT NULL DEFAULT 'us-east-2',
  use_cases JSONB NOT NULL,
  complexity_level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  generated_files JSONB DEFAULT '[]',
  estimated_size TEXT DEFAULT '50MB',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS download_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  repository_name TEXT NOT NULL,
  use_case TEXT NOT NULL,
  language TEXT NOT NULL,
  database_version TEXT NOT NULL,
  downloaded_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_requests (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  demo_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

export async function ensureSchema() {
  try {
    await pool.query(SCHEMA_SQL);
    console.log("✅ Database schema ready");
  } catch (err) {
    console.error("❌ Schema migration failed:", err);
  }
}
