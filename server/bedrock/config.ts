// Single source of truth for Bedrock model ID and region.
// Override at runtime via env vars (BEDROCK_MODEL_ID, AWS_REGION).

export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-opus-4-6-v1";

export const BEDROCK_REGION = process.env.AWS_REGION || "us-east-2";
