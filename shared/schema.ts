import { pgTable, text, serial, integer, json, timestamp, index } from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull(),
  databaseVersion: text("database_version").notNull(),
  databaseType: text("database_type").notNull().default("RDS"),
  instanceType: text("instance_type").notNull().default("db.t4g.micro"),
  awsRegion: text("aws_region").notNull().default("us-east-2"),
  useCases: json("use_cases").$type<string[]>().notNull(),
  complexityLevel: text("complexity_level").notNull(),
  status: text("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  generatedFiles: json("generated_files").$type<GeneratedFile[]>().default([]),
  estimatedSize: text("estimated_size").default("50MB"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRepositorySchema = createInsertSchema(repositories).pick({
  name: true,
  language: true,
  databaseVersion: true,
  databaseType: true,
  instanceType: true,
  awsRegion: true,
  useCases: true,
  complexityLevel: true,
});

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;

export interface GeneratedFile {
  path: string;
  type: "folder" | "file";
  size?: number;
  content?: string;
  language?: string;
  status: "pending" | "generating" | "complete" | "error";
}

export const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const downloadLogs = pgTable("download_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  repositoryName: text("repository_name").notNull(),
  useCase: text("use_case").notNull(),
  language: text("language").notNull(),
  databaseVersion: text("database_version").notNull(),
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
});

export const feedbackRequests = pgTable("feedback_requests", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  demoType: text("demo_type").notNull(),
  priority: text("priority").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Agent System Tables ──

export const demoRequests = pgTable("demo_requests", {
  id: serial("id").primaryKey(),
  requesterEmail: text("requester_email").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetExtension: text("target_extension"),
  customerIndustry: text("customer_industry"),
  complexity: text("complexity"),
  status: text("status").notNull().default("pending"),
  clarifyingQuestions: json("clarifying_questions").$type<string[]>(),
  clarifyingAnswers: json("clarifying_answers").$type<Record<string, string>>(),
  spec: json("spec").$type<Record<string, any>>(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentActions = pgTable("agent_actions", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  triggerSource: text("trigger_source"),
  requestId: integer("request_id").references(() => demoRequests.id),
  inputData: json("input_data").$type<Record<string, any>>(),
  proposedPlan: json("proposed_plan").$type<Record<string, any>>(),
  status: text("status").notNull().default("proposed"),
  adminDecision: text("admin_decision"),
  adminNotes: text("admin_notes"),
  executionResult: json("execution_result").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDemoRequestSchema = createInsertSchema(demoRequests).pick({
  requesterEmail: true,
  title: true,
  description: true,
  targetExtension: true,
  customerIndustry: true,
  complexity: true,
});

export type DemoRequest = typeof demoRequests.$inferSelect;
export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;
export type AgentAction = typeof agentActions.$inferSelect;

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type DownloadLog = typeof downloadLogs.$inferSelect;
export type InsertDownloadLog = typeof downloadLogs.$inferInsert;
export type FeedbackRequest = typeof feedbackRequests.$inferSelect;
export type InsertFeedbackRequest = typeof feedbackRequests.$inferInsert;

// ── Agent Loop (P1.1) ──

export interface SpecSnapshot {
  database: string;
  extensions: string[];
  useCase: string;
  industry?: string;
  audience?: string;
  durationMin?: number;
  estCostHourly?: string;
}

export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: serial("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("default"),
    userId: text("user_id").notNull(),
    userEmail: text("user_email").notNull(),
    phase: text("phase").notNull().default("gathering"),
    specSnapshot: json("spec_snapshot").$type<SpecSnapshot>(),
    lastEventId: integer("last_event_id").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userRecentIdx: index("agent_sessions_user_recent_idx").on(t.userId, desc(t.createdAt)),
    tenantUserRecentIdx: index("agent_sessions_tenant_user_recent_idx").on(
      t.tenantId,
      t.userId,
      desc(t.createdAt),
    ),
  }),
);

export const agentSteps = pgTable(
  "agent_steps",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => agentSessions.id).notNull(),
    turnIndex: integer("turn_index").notNull(),
    role: text("role").notNull(),
    content: json("content"),
    toolCalls: json("tool_calls"),
    toolResults: json("tool_results"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    sessionTurnIdx: index("agent_steps_session_turn_idx").on(t.sessionId, t.turnIndex),
  }),
);

// ── P2.1: Tracing + Cost Accounting ──

export const agentTraces = pgTable(
  "agent_traces",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => agentSessions.id).notNull(),
    turnIndex: integer("turn_index").notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    status: text("status").notNull().default("running"), // 'running' | 'ok' | 'error' | 'budget_exceeded'
    totalTokensIn: integer("total_tokens_in").default(0),
    totalTokensOut: integer("total_tokens_out").default(0),
    totalLatencyMs: integer("total_latency_ms").default(0),
    estCostUsd: text("est_cost_usd"),
    errorKind: text("error_kind"),
    errorMessage: text("error_message"),
  },
  (t) => ({
    sessionTurnIdx: index("agent_traces_session_turn_idx").on(t.sessionId, t.turnIndex),
  }),
);

export const agentSpans = pgTable(
  "agent_spans",
  {
    id: serial("id").primaryKey(),
    traceId: integer("trace_id").references(() => agentTraces.id).notNull(),
    parentSpanId: integer("parent_span_id"),
    kind: text("kind").notNull(), // 'model' | 'tool' | 'safety'
    name: text("name").notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    durationMs: integer("duration_ms"),
    input: json("input"),
    output: json("output"),
    error: json("error"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    modelId: text("model_id"),
    cacheHit: text("cache_hit"),
    costUsd: text("cost_usd"),
  },
  (t) => ({
    traceStartIdx: index("agent_spans_trace_start_idx").on(t.traceId, t.startedAt),
  }),
);

export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = typeof agentSessions.$inferInsert;
export type AgentStep = typeof agentSteps.$inferSelect;
export type InsertAgentStep = typeof agentSteps.$inferInsert;
export type AgentTrace = typeof agentTraces.$inferSelect;
export type InsertAgentTrace = typeof agentTraces.$inferInsert;
export type AgentSpan = typeof agentSpans.$inferSelect;
export type InsertAgentSpan = typeof agentSpans.$inferInsert;
