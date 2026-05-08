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


CREATE TABLE IF NOT EXISTS demo_requests (
  id SERIAL PRIMARY KEY,
  requester_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_extension TEXT,
  customer_industry TEXT,
  complexity TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  clarifying_questions JSONB,
  clarifying_answers JSONB,
  spec JSONB,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id SERIAL PRIMARY KEY,
  agent_type TEXT NOT NULL,
  trigger_source TEXT,
  request_id INTEGER REFERENCES demo_requests(id),
  input_data JSONB,
  proposed_plan JSONB,
  status TEXT NOT NULL DEFAULT 'proposed',
  admin_decision TEXT,
  admin_notes TEXT,
  execution_result JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'gathering',
  spec_snapshot JSON,
  last_event_id INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_sessions_user_recent_idx ON agent_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_steps (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES agent_sessions(id),
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL,
  content JSON,
  tool_calls JSON,
  tool_results JSON,
  tokens_in INTEGER,
  tokens_out INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_steps_session_turn_idx ON agent_steps (session_id, turn_index);
`;

export async function ensureSchema() {
  try {
    await pool.query(SCHEMA_SQL);
    console.log("✅ Database schema ready");
  } catch (err) {
    console.error("❌ Schema migration failed:", err);
  }
}
