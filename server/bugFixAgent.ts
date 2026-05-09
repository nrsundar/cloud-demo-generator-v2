import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { db } from "./db";
import { agentActions } from "@shared/schema";
import { BEDROCK_MODEL_ID, BEDROCK_REGION } from "./bedrock/config";

const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const cwLogs = new CloudWatchLogsClient({ region: BEDROCK_REGION });
const LOG_GROUP = "/ecs/demo-gen";

async function invokeModel(prompt: string, systemPrompt: string): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });
  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    body: new TextEncoder().encode(body),
  });
  const response = await bedrock.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0]?.text || "";
}

async function getRecentErrors(): Promise<string[]> {
  try {
    const now = Date.now();
    const response = await cwLogs.send(new FilterLogEventsCommand({
      logGroupName: LOG_GROUP,
      startTime: now - 24 * 60 * 60 * 1000, // last 24h
      filterPattern: "?ERROR ?error ?Error ?failed ?Failed ?exception ?Exception",
      limit: 50,
    }));
    return (response.events || []).map(e => e.message || "").filter(Boolean);
  } catch (err) {
    console.error("Failed to fetch CloudWatch logs:", err);
    return [];
  }
}

export async function runBugFixAgent(): Promise<{ proposalCount: number }> {
  const errors = await getRecentErrors();
  if (errors.length === 0) {
    console.log("🔍 Bug Fix Agent: No errors found in last 24h");
    return { proposalCount: 0 };
  }

  const errorSummary = errors.slice(0, 30).join("\n");

  const response = await invokeModel(
    `Analyze these application errors from a Node.js/Express ECS service (DemoForge v3.1.0). Group related errors, identify root causes, and propose fixes.\n\nErrors:\n${errorSummary}\n\nReturn a JSON array of fix proposals: [{\"id\": \"BUG-001\", \"title\": \"...\", \"rootCause\": \"...\", \"proposedFix\": \"...\", \"severity\": \"critical|high|medium|low\", \"affectedFile\": \"...\", \"status\": \"pending\"}]`,
    "You are a senior Node.js/TypeScript developer analyzing production errors. Be specific about file paths and code changes needed. Assign sequential IDs starting from BUG-001. Return ONLY valid JSON."
  );

  let proposals: any[] = [];
  try {
    const match = response.match(/\[[\s\S]*\]/);
    proposals = match ? JSON.parse(match[0]) : [];
  } catch {
    console.error("Bug Fix Agent: Failed to parse proposals");
    return { proposalCount: 0 };
  }

  // Create agent actions for each proposal
  for (const proposal of proposals) {
    await db.insert(agentActions).values({
      agentType: "bug_fix",
      triggerSource: "scheduled",
      inputData: { errorCount: errors.length, sampleErrors: errors.slice(0, 5) },
      proposedPlan: proposal,
      status: "proposed",
    });
  }

  console.log(`🐛 Bug Fix Agent: Created ${proposals.length} fix proposals`);
  return { proposalCount: proposals.length };
}
