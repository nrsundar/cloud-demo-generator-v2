import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const MODEL_ID = "us.anthropic.claude-opus-4-6-v1";

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-2" });

export interface BedrockMessage {
  role: "user" | "assistant";
  content: unknown;
}

export interface BedrockToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface BedrockResponse {
  text: string;
  toolCalls: BedrockToolCall[];
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  raw: unknown;
}

export interface InvokeOptions {
  systemPrompt: string;
  messages: BedrockMessage[];
  tools?: unknown[];
  maxTokens?: number;
}

export async function invoke(opts: InvokeOptions): Promise<BedrockResponse> {
  const body: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.systemPrompt,
    messages: opts.messages,
  };
  if (opts.tools && opts.tools.length > 0) body.tools = opts.tools;

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    body: new TextEncoder().encode(JSON.stringify(body)),
  });

  const start = Date.now();
  const response = await client.send(command);
  const latencyMs = Date.now() - start;
  const parsed = JSON.parse(new TextDecoder().decode(response.body));

  const text = (parsed.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  const toolCalls: BedrockToolCall[] = (parsed.content ?? [])
    .filter((b: any) => b.type === "tool_use")
    .map((b: any) => ({ id: b.id, name: b.name, input: b.input ?? {} }));

  const usage = parsed.usage ?? {};
  return {
    text,
    toolCalls,
    tokensIn: usage.input_tokens ?? 0,
    tokensOut: usage.output_tokens ?? 0,
    latencyMs,
    raw: parsed,
  };
}
