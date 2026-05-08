import { z } from "zod";
import type { ToolSpec } from "./types";
import { getSkillPromptContext } from "../skills/extensions";
import { modelJson } from "./modelHelper";

const inputSchema = z.object({
  extension: z.string(),
  useCase: z.string().describe("Plain-English use case, e.g. 'semantic search over support tickets'."),
  industry: z.string().optional(),
  complexity: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
});

const outputSchema = z.object({
  tables: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      columns: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          notes: z.string().optional(),
        }),
      ),
      sampleData: z.array(z.record(z.unknown())).optional(),
      indexes: z.array(z.string()).optional(),
    }),
  ),
  notes: z.string().optional(),
});

export const generateSchema: ToolSpec<typeof inputSchema, typeof outputSchema> = {
  name: "generateSchema",
  description:
    "Designs a Postgres schema (tables, columns, indexes) for the chosen extension and use case. " +
    "Returns a structured preview suitable for the SchemaPreview component.",
  inputSchema,
  outputSchema,
  async execute(_principal, input) {
    const skill = getSkillPromptContext(input.extension);
    return modelJson<{
      tables: Array<{
        name: string;
        purpose: string;
        columns: Array<{ name: string; type: string; notes?: string }>;
        sampleData?: Array<Record<string, unknown>>;
        indexes?: string[];
      }>;
      notes?: string;
    }>({
      systemPrompt:
        "You are a senior data modeler. Return ONLY a JSON object — no prose, no code fences. " +
        "Schema: {tables:[{name, purpose, columns:[{name,type,notes?}], sampleData?:[{...}], indexes?:[string]}], notes?}.",
      userPrompt:
        `Design a ${input.complexity} Postgres schema for use case "${input.useCase}" using extension '${input.extension}'.` +
        (input.industry ? ` Industry context: ${input.industry}.` : "") +
        ` Include 2–4 tables, 2–5 sample rows per table, and any indexes the extension requires.\n\n${skill}`,
      maxTokens: 2000,
    });
  },
};
