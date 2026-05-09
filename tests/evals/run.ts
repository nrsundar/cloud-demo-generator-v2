import { readFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { readdirSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Fixture {
  id: string;
  prompt: string;
  expectedSpec: { database: string; extensions: string[]; useCase: string; industry?: string };
  expectedComponents: string[];
  tags: string[];
}

interface ScoreResult {
  fixtureId: string;
  tier: "1" | "2";
  score: number;
  passed: boolean;
  rationale: string;
}

function loadFixtures(): Fixture[] {
  const dir = resolve(__dirname, "fixtures");
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const fixtures: Fixture[] = [];
  for (const file of files) {
    const lines = readFileSync(join(dir, file), "utf-8").split("\n").filter(Boolean);
    for (const line of lines) fixtures.push(JSON.parse(line));
  }
  return fixtures;
}

function scoreTier1(fixture: Fixture, envelope: any): ScoreResult {
  let score = 100;
  const issues: string[] = [];

  // Check spec fields
  if (!envelope.specSnapshot) {
    return { fixtureId: fixture.id, tier: "1", score: 0, passed: false, rationale: "No specSnapshot in envelope" };
  }

  const spec = envelope.specSnapshot;
  if (spec.database?.toLowerCase() !== fixture.expectedSpec.database.toLowerCase()) {
    score -= 30;
    issues.push(`database: got '${spec.database}', expected '${fixture.expectedSpec.database}'`);
  }

  const exts = (spec.extensions ?? []).map((e: string) => e.toLowerCase());
  for (const expected of fixture.expectedSpec.extensions) {
    if (!exts.includes(expected.toLowerCase())) {
      score -= 20;
      issues.push(`missing extension: ${expected}`);
    }
  }

  // Check components
  const componentTypes = (envelope.components ?? []).map((c: any) => c.type);
  for (const expected of fixture.expectedComponents) {
    if (!componentTypes.includes(expected)) {
      score -= 10;
      issues.push(`missing component: ${expected}`);
    }
  }

  return {
    fixtureId: fixture.id,
    tier: "1",
    score: Math.max(0, score),
    passed: score >= 70,
    rationale: issues.length > 0 ? issues.join("; ") : "All checks passed",
  };
}

async function main() {
  const suite = process.argv.includes("--full") ? "full" : "fast";
  console.log(`\n🧪 DemoForge Eval Harness (suite=${suite})\n`);

  const fixtures = loadFixtures();
  console.log(`Loaded ${fixtures.length} fixtures\n`);

  // For now, just validate fixture structure (actual agent invocation requires DB)
  let passed = 0;
  let failed = 0;

  for (const f of fixtures) {
    if (!f.id || !f.prompt || !f.expectedSpec || !f.expectedComponents) {
      console.log(`  ❌ ${f.id ?? "unknown"} — invalid fixture structure`);
      failed++;
    } else {
      console.log(`  ✅ ${f.id} — fixture valid (${f.tags.join(", ")})`);
      passed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${fixtures.length} fixtures`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { loadFixtures, scoreTier1, type Fixture, type ScoreResult };
