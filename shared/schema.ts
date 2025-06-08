import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull(),
  databaseVersion: text("database_version").notNull(),
  databaseType: text("database_type").notNull().default("RDS"), // RDS or Aurora
  instanceType: text("instance_type").notNull().default("db.t3.medium"),
  awsRegion: text("aws_region").notNull().default("us-west-2"),
  useCases: json("use_cases").$type<string[]>().notNull(),
  complexityLevel: text("complexity_level").notNull(),
  status: text("status").notNull().default("pending"), // pending, queued, generating, complete, error
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

export interface RepositoryConfig {
  name: string;
  language: string;
  databaseVersion: string;
  databaseType: string;
  instanceType: string;
  awsRegion: string;
  useCases: string[];
  complexityLevel: string;
}

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;

export interface GeneratedFile {
  path: string;
  type: 'folder' | 'file';
  size?: number;
  content?: string;
  language?: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  order: number;
  documents: number;
  examples: number;
  exercises: number;
  estimatedHours: string;
  status: 'pending' | 'generating' | 'complete';
}

export interface DatasetInfo {
  name: string;
  description: string;
  format: string;
  size: string;
  features: string;
  icon: string;
  color: string;
  status: 'pending' | 'processing' | 'complete' | 'queued';
}

export interface RepositoryStats {
  totalFiles: number;
  modules: number;
  codeExamples: number;
  estimatedSize: string;
}

export interface Property {
  id: number;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: string;
  listingStatus: string;
  latitude: number;
  longitude: number;
  geom?: string; // PostGIS geometry as GeoJSON
  listingDate: Date;
  lastUpdated: Date;
}

export interface PropertySearchParams {
  propertyId: number;
  radiusMeters: number;
  maxResults?: number;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
}

// User management table for Replit Auth
export const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usage tracking table
export const downloadLogs = pgTable("download_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  repositoryName: text("repository_name").notNull(),
  useCase: text("use_case").notNull(),
  language: text("language").notNull(),
  databaseVersion: text("database_version").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
});

// Session storage table
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Feedback and demo request table
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
