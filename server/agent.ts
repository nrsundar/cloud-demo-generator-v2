import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-2" });
const MODEL_ID = "us.anthropic.claude-opus-4-6-v1";

async function invokeModel(prompt: string, systemPrompt: string): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    body: new TextEncoder().encode(body),
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0]?.text || "";
}

export async function generateClarifyingQuestions(request: {
  title: string;
  description: string;
  targetExtension?: string;
  customerIndustry?: string;
  complexity?: string;
}): Promise<string[]> {
  const systemPrompt = `You are an expert PostgreSQL demo architect. Given a demo request, generate 3-5 clarifying questions to fully understand what the requester needs. Questions should cover: target audience technical level, specific PostgreSQL features needed, data volume expectations, deployment preferences, and integration requirements. Return ONLY a JSON array of question strings.`;

  const prompt = `Demo request:
Title: ${request.title}
Description: ${request.description}
Extension: ${request.targetExtension || "not specified"}
Industry: ${request.customerIndustry || "not specified"}
Complexity: ${request.complexity || "not specified"}

Generate clarifying questions as a JSON array:`;

  const response = await invokeModel(prompt, systemPrompt);
  try {
    const cleaned = response.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "");
    const match = cleaned.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return ["What specific PostgreSQL features are most important for your use case?",
            "What is the target audience's technical level?",
            "What data volume do you expect?"];
  }
}

export async function generateDemoSpec(request: {
  title: string;
  description: string;
  targetExtension?: string;
  customerIndustry?: string;
  complexity?: string;
  clarifyingAnswers?: Record<string, string>;
}): Promise<Record<string, any>> {
  const systemPrompt = `You are an expert PostgreSQL demo architect. Generate a complete demo specification that matches the existing template structure. The spec must include:
- name: short kebab-case name
- displayName: human-readable title
- extension: primary PG extension
- modules: array of 10+ module objects with {name, description, features[]}
- demoScripts: array of demo scenario descriptions
- dataModel: description of tables and relationships
- apiEndpoints: array of {method, path, description}
- cloudformationNotes: any special CFN requirements

Return ONLY valid JSON.`;

  const answersText = request.clarifyingAnswers
    ? Object.entries(request.clarifyingAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")
    : "No answers provided";

  const prompt = `Demo request:
Title: ${request.title}
Description: ${request.description}
Extension: ${request.targetExtension || "not specified"}
Industry: ${request.customerIndustry || "not specified"}
Complexity: ${request.complexity || "not specified"}

Clarifying Q&A:
${answersText}

Generate the full demo specification as JSON:`;

  const response = await invokeModel(prompt, systemPrompt);
  try {
    // Strip markdown code fences if present
    const cleaned = response.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "");
    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { error: "Failed to parse spec" };
  } catch {
    return { error: "Failed to generate spec", raw: response.slice(0, 500) };
  }
}
