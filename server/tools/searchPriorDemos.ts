import { z } from "zod";
import { sql, desc, eq, and, or, ilike } from "drizzle-orm";
import { db } from "../db";
import { repositories } from "@shared/schema";
import type { ToolSpec } from "./types";

const inputSchema = z.object({
  query: z.string().min(1).describe("Natural-language query — extension name, industry, use case, etc."),
  limit: z.number().int().min(1).max(20).optional(),
});

const outputSchema = z.object({
  query: z.string(),
  demos: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      databaseType: z.string(),
      databaseVersion: z.string(),
      complexity: z.string(),
      useCases: z.array(z.string()),
      similarity: z.number(),
    }),
  ),
});

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((t) => t.length >= 3);
}

export const searchPriorDemos: ToolSpec<typeof inputSchema, typeof outputSchema> = {
  name: "searchPriorDemos",
  description:
    "Searches prior completed demo packages by name, database, or use case. " +
    "Use early in a conversation to surface 'we already have something close' before generating a new package.",
  inputSchema,
  outputSchema,
  async execute(_principal, input) {
    const limit = input.limit ?? 5;
    const tokens = tokenize(input.query);
    if (tokens.length === 0) {
      return { query: input.query, demos: [] };
    }

    const conditions = tokens.map((t) =>
      or(
        ilike(repositories.name, `%${t}%`),
        ilike(repositories.databaseType, `%${t}%`),
        sql`${repositories.useCases}::text ilike ${`%${t}%`}`,
      ),
    );

    const rows = await db
      .select()
      .from(repositories)
      .where(and(eq(repositories.status, "complete"), or(...conditions)))
      .orderBy(desc(repositories.createdAt))
      .limit(limit);

    const demos = rows.map((r) => {
      const useCases = (r.useCases as string[] | null) ?? [];
      const haystack = `${r.name} ${r.databaseType} ${useCases.join(" ")}`.toLowerCase();
      const hits = tokens.filter((t) => haystack.includes(t)).length;
      const similarity = tokens.length > 0 ? hits / tokens.length : 0;
      return {
        id: r.id,
        name: r.name,
        databaseType: r.databaseType,
        databaseVersion: r.databaseVersion,
        complexity: r.complexityLevel,
        useCases,
        similarity: Number(similarity.toFixed(2)),
      };
    });

    demos.sort((a, b) => b.similarity - a.similarity);
    return { query: input.query, demos };
  },
};
