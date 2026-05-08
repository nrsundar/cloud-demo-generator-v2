import { z } from "zod";
import type { ToolSpec } from "./types";
import { getSkillPromptContext } from "../skills/extensions";
import { modelJson } from "./modelHelper";

const inputSchema = z.object({
  language: z.enum(["python", "typescript"]).default("python"),
  extension: z.string(),
  useCase: z.string(),
});

const outputSchema = z.object({
  language: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      purpose: z.string(),
      excerpt: z.string().describe("Representative snippet (≤ 40 lines) for preview."),
    }),
  ),
  endpoints: z
    .array(z.object({ method: z.string(), path: z.string(), description: z.string() }))
    .optional(),
});

export const generateAppCode: ToolSpec<typeof inputSchema, typeof outputSchema> = {
  name: "generateAppCode",
  description:
    "Produces a code preview (file list + representative snippets + API endpoints) for the demo app. " +
    "Returns just enough for the CodePreview component; full file content is rendered at ZIP time.",
  inputSchema,
  outputSchema,
  async execute(_principal, input) {
    const skill = getSkillPromptContext(input.extension);
    return modelJson<{
      language: string;
      files: Array<{ path: string; purpose: string; excerpt: string }>;
      endpoints?: Array<{ method: string; path: string; description: string }>;
    }>({
      systemPrompt:
        "You are a senior application developer. Return ONLY a JSON object — no prose, no code fences. " +
        "Schema: {language, files:[{path, purpose, excerpt}], endpoints?:[{method,path,description}]}. " +
        "Each excerpt must be ≤ 40 lines and self-contained.",
      userPrompt:
        `Outline a ${input.language} app for a Postgres '${input.extension}' demo: use case "${input.useCase}". ` +
        `Show 3–5 files (entry point, DB layer, route handlers, one feature). Include 3–5 REST endpoints.\n\n${skill}`,
      maxTokens: 2000,
    });
  },
};
