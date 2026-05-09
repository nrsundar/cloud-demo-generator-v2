import { z } from "zod";
import type { ToolSpec } from "./types";
import { getExtensionSkill, getSkillPromptContext } from "../skills/extensions";
import { modelJson } from "./modelHelper";

const inputSchema = z.object({
  database: z.string().describe("e.g. 'aurora-postgres', 'rds-postgres'."),
  extension: z.string().describe("Primary extension to enable, e.g. 'pgvector'."),
  region: z.string().default("us-east-2"),
  instanceType: z.string().default("db.t4g.medium"),
  engineVersion: z.string().default("17"),
});

const outputSchema = z.object({
  summary: z.string(),
  resources: z.array(
    z.object({
      logicalId: z.string(),
      type: z.string(),
      purpose: z.string(),
    }),
  ),
  parameters: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
      noEcho: z.boolean().optional(),
    }),
  ),
  outputs: z.array(z.object({ name: z.string(), description: z.string() })),
  sharedPreloadLibraries: z.array(z.string()),
});

export const generateCFTemplate: ToolSpec<typeof inputSchema, typeof outputSchema> = {
  name: "generateCFTemplate",
  description:
    "Produces a structured CloudFormation preview (resources, parameters, outputs) for an AWS-managed Postgres demo. " +
    "Use this once specSnapshot has database + validated extension. The preview powers the InfraPreview component; " +
    "the full YAML is generated later when the user approves the package.",
  inputSchema,
  outputSchema,
  async execute(_principal, input) {
    const skill = getSkillPromptContext(input.extension);
    const skillEntry = getExtensionSkill(input.extension);
    const declared = skillEntry?.cfnParameters?.SharedPreloadLibraries;
    const sharedLibs = declared && declared.length > 0 ? declared.split(",").map((s) => s.trim()) : [];
    const result = await modelJson<{
      summary: string;
      resources: Array<{ logicalId: string; type: string; purpose: string }>;
      parameters: Array<{ name: string; type: string; description: string; noEcho?: boolean }>;
      outputs: Array<{ name: string; description: string }>;
    }>({
      systemPrompt:
        "You are a CloudFormation expert. Return ONLY a JSON object — no prose, no code fences. " +
        "Schema: {summary, resources:[{logicalId,type,purpose}], parameters:[{name,type,description,noEcho?}], outputs:[{name,description}]}.",
      userPrompt:
        `Outline the CFN resources for a ${input.database} ${input.engineVersion} demo with extension '${input.extension}' in ${input.region}, instance ${input.instanceType}. ` +
        `Include VPC (2 AZs, public+private), the DB cluster (private, encrypted), parameter group enabling the extension, bastion host on Amazon Linux 2023 with SSM, security groups (bastion→db only), and a master-password Parameter (NoEcho).`,
      maxTokens: 1500,
    });
    return { ...result, sharedPreloadLibraries: sharedLibs };
  },
};
