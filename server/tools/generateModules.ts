import { z } from "zod";
import type { ToolSpec } from "./types";
import { modelJson } from "./modelHelper";

const inputSchema = z.object({
  extension: z.string(),
  useCase: z.string(),
  audience: z.enum(["devs", "dbas", "exec", "mixed"]).default("mixed"),
  durationMin: z.number().int().min(15).max(180).default(45),
});

const outputSchema = z.object({
  modules: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      durationMin: z.number().int(),
      learningGoals: z.array(z.string()),
    }),
  ),
});

export const generateModules: ToolSpec<typeof inputSchema, typeof outputSchema> = {
  name: "generateModules",
  description:
    "Designs a sequence of demo modules tuned for the audience and total duration. " +
    "Returns the array used by the ModuleList component.",
  inputSchema,
  outputSchema,
  async execute(_principal, input) {
    return modelJson<{
      modules: Array<{
        name: string;
        description: string;
        difficulty: "beginner" | "intermediate" | "advanced";
        durationMin: number;
        learningGoals: string[];
      }>;
    }>({
      systemPrompt:
        "You are a senior solutions architect designing a demo curriculum. Return ONLY a JSON object — no prose, no code fences. " +
        "Schema: {modules:[{name, description, difficulty, durationMin, learningGoals:[string]}]}.",
      userPrompt:
        `Design demo modules for extension '${input.extension}', use case "${input.useCase}", audience "${input.audience}", total ~${input.durationMin} min. ` +
        `Module durations should sum to ${input.durationMin} ± 10. Aim for 3–5 modules. Difficulty appropriate to audience.`,
      maxTokens: 1500,
    });
  },
};
