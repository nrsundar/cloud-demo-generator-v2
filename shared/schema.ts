import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
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

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type DownloadLog = typeof downloadLogs.$inferSelect;
export type InsertDownloadLog = typeof downloadLogs.$inferInsert;
export type FeedbackRequest = typeof feedbackRequests.$inferSelect;
export type InsertFeedbackRequest = typeof feedbackRequests.$inferInsert;
