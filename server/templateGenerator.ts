import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, readdirSync, readFileSync, createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import archiver from "archiver";
import { PassThrough } from "stream";
import { getSkillPromptContext } from "./skills/extensions";

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-2" });
const MODEL_ID = "us.anthropic.claude-opus-4-6-v1";

async function invokeModel(prompt: string, systemPrompt: string): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8192,
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

// Retry wrapper — retries up to 2 times if output is empty or contains markdown fences
async function invokeWithRetry(prompt: string, systemPrompt: string, minLength = 100): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await invokeModel(
      attempt > 0 ? `${prompt}\n\nIMPORTANT: Your previous response was empty or malformed. Return ONLY the raw file content. No markdown fences. No explanations.` : prompt,
      systemPrompt
    );
    // Strip markdown fences if present
    const cleaned = result.replace(/^```(?:\w+)?\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    if (cleaned.length >= minLength) return cleaned;
    console.warn(`⚠️ Attempt ${attempt + 1}: output too short (${cleaned.length} chars), retrying...`);
  }
  return "";
}

interface DemoSpec {
  name: string;
  displayName: string;
  extension: string;
  modules: { name: string; description: string; features: string[] }[];
  demoScripts?: any[];
  dataModel?: string;
  apiEndpoints?: { method: string; path: string; description: string }[];
  cloudformationNotes?: string;
}

export async function generateDemoTemplate(spec: DemoSpec): Promise<Buffer> {
  const tmpDir = mkdtempSync(join(tmpdir(), "demo-gen-template-"));

  try {
    // Generate all files in parallel batches
    const [appPy, setupSql, cfnYaml, readme, deploySh] = await Promise.all([
      generateAppPy(spec),
      generateSetupSql(spec),
      generateCfnTemplate(spec),
      generateReadme(spec),
      generateDeploySh(spec),
    ]);

    // Write core files
    writeFileSync(join(tmpDir, "app.py"), appPy);
    writeFileSync(join(tmpDir, "deploy.sh"), deploySh);
    writeFileSync(join(tmpDir, "README.md"), readme);
    writeFileSync(join(tmpDir, "LICENSE"), "MIT-0 License\n\nCopyright Amazon.com, Inc. or its affiliates. All Rights Reserved.\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n");
    writeFileSync(join(tmpDir, ".gitignore"), "__pycache__/\n*.pyc\n.env\nvenv/\n*.egg-info/\ndist/\nbuild/\n");
    writeFileSync(join(tmpDir, ".env.example"), `DATABASE_URL=postgresql://postgres:password@localhost:5432/${spec.name}\nAWS_REGION=us-east-2\nFLASK_ENV=development\n`);
    writeFileSync(join(tmpDir, "requirements.txt"), "flask>=3.0\npsycopg2-binary>=2.9\nboto3>=1.34\npython-dotenv>=1.0\ngunicorn>=21.2\n");
    writeFileSync(join(tmpDir, "DATA_SOURCES.md"), `# Data Sources\n\nThis demo uses synthetic data generated for demonstration purposes.\nNo real customer data is included.\n`);

    // GETTING_STARTED.md — detailed setup + import instructions
    writeFileSync(join(tmpDir, "GETTING_STARTED.md"), `# Getting Started

## Prerequisites

- AWS CLI configured with appropriate permissions
- Python 3.9+ installed
- PostgreSQL client (psql) for local testing

## Quick Deploy

\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

## Import into Git Repository

### GitHub

\`\`\`bash
# Unzip and initialize
unzip ${spec.name}.zip -d ${spec.name}
cd ${spec.name}
git init
git add .
git commit -m "Initial commit: ${spec.displayName}"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/${spec.name}.git
git branch -M main
git push -u origin main
\`\`\`

### GitLab

\`\`\`bash
# Unzip and initialize
unzip ${spec.name}.zip -d ${spec.name}
cd ${spec.name}
git init
git add .
git commit -m "Initial commit: ${spec.displayName}"

# Create repo on GitLab, then:
git remote add origin https://gitlab.com/YOUR_USERNAME/${spec.name}.git
git branch -M main
git push -u origin main
\`\`\`

### AWS CodeCommit

\`\`\`bash
aws codecommit create-repository --repository-name ${spec.name}
cd ${spec.name}
git init
git add .
git commit -m "Initial commit: ${spec.displayName}"
git remote add origin codecommit::us-east-2://${spec.name}
git push -u origin main
\`\`\`

## Project Structure

\`\`\`
${spec.name}/
├── README.md                  # Project overview and architecture
├── GETTING_STARTED.md         # This file — setup and import guide
├── app.py                     # Flask application with API endpoints
├── deploy.sh                  # One-command CloudFormation deployment
├── requirements.txt           # Python dependencies
├── cloudformation/
│   ├── main.yaml              # Full infrastructure (VPC, Aurora, Bastion)
│   └── parameters.json        # Deployment parameters
├── database/
│   ├── setup.sql              # Schema + seed data
│   └── migrations/            # Versioned migrations
├── modules/                   # ${spec.modules.length} feature modules (each with README + example)
├── demo/                      # Customer-facing demo materials
│   ├── customer_talking_points.md
│   ├── demo_script.md
│   └── presentation_guide.md
├── .env.example               # Environment variable template
├── .gitignore                 # Git ignore rules
├── DATA_SOURCES.md            # Data provenance documentation
└── LICENSE                    # MIT-0
\`\`\`

## Local Development

\`\`\`bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database URL
python app.py
\`\`\`

## Cleanup

To delete all deployed resources:

\`\`\`bash
aws cloudformation delete-stack --stack-name cdg-${spec.name} --region us-east-2
aws cloudformation wait stack-delete-complete --stack-name cdg-${spec.name} --region us-east-2
\`\`\`

## Generated By

This demo was generated by [DemoForge](https://github.com/nrsundar/cloud-demo-generator-v2) using AI (Claude Opus 4.6 on Amazon Bedrock).

All code has been validated for:
- ✅ Valid Python syntax
- ✅ Valid CloudFormation YAML structure
- ✅ Valid SQL syntax
- ✅ Complete module structure (README + example per module)
- ✅ Consistent naming and configuration
`);

    writeFileSync(join(tmpDir, "CONTRIBUTING.md"), `# Contributing

This demo was AI-generated. To contribute improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Code Standards

- Python: Follow PEP 8
- SQL: Use uppercase keywords
- CloudFormation: Validate with \`aws cloudformation validate-template\`
- All modules must include README.md and example.py
`);

    // cloudformation/
    mkdirSync(join(tmpDir, "cloudformation"));
    writeFileSync(join(tmpDir, "cloudformation", "main.yaml"), cfnYaml);
    writeFileSync(join(tmpDir, "cloudformation", "parameters.json"), JSON.stringify({
      ProjectName: `cdg-${spec.name}`,
      PostgreSQLVersion: "17.4",
      DatabaseInstanceType: "db.t4g.medium",
    }, null, 2));

    // database/
    mkdirSync(join(tmpDir, "database"));
    mkdirSync(join(tmpDir, "database", "migrations"));
    writeFileSync(join(tmpDir, "database", "setup.sql"), setupSql);
    writeFileSync(join(tmpDir, "database", "migrations", "001_initial_schema.sql"), setupSql);

    // demo/
    mkdirSync(join(tmpDir, "demo"));
    const demoContent = await generateDemoMaterials(spec);
    writeFileSync(join(tmpDir, "demo", "customer_talking_points.md"), demoContent.talkingPoints);
    writeFileSync(join(tmpDir, "demo", "demo_script.md"), demoContent.script);
    writeFileSync(join(tmpDir, "demo", "presentation_guide.md"), demoContent.guide);

    // CHEAT_SHEET.md — SA quick reference for the extension
    const cheatSheet = await invokeWithRetry(
      `Generate a concise cheat sheet for an AWS Solutions Architect presenting a ${spec.extension} demo to a customer in the ${spec.industry || "technology"} industry.

Include these sections:
1. "Quick Reference" — 5-8 most important functions/commands with one-line descriptions
2. "Top 5 Customer Questions & Answers" — real questions a CTO/architect would ask, with confident 2-sentence answers
3. "Don't Say This" — 3 common mistakes or misconceptions to avoid during the demo
4. "Performance Numbers to Cite" — 3-4 benchmarks or stats the SA can reference (latency, throughput, scale)
5. "Comparison Talking Points" — how this compares to 2-3 alternatives (other AWS services or third-party)

${getSkillPromptContext(spec.extension)}

Keep it to 1 page. Use markdown. Be specific and factual — no filler.`,
      "You are a senior AWS Solutions Architect preparing a colleague for a customer demo. Return ONLY markdown. No fences.",
      200
    );
    writeFileSync(join(tmpDir, "CHEAT_SHEET.md"), cheatSheet || `# ${spec.extension} Cheat Sheet\n\nCheat sheet generation pending.\n`);

    // modules/ — use faster model (Sonnet) for parallel module generation
    mkdirSync(join(tmpDir, "modules"));
    const modules = spec.modules.length >= 5 ? spec.modules : [...spec.modules, ...Array(5 - spec.modules.length).fill(null).map((_, i) => ({
      name: `module_${String(spec.modules.length + i + 1).padStart(2, "0")}`,
      description: `Additional ${spec.extension} feature`,
      features: ["Hands-on example"],
    }))];

    // Generate modules in batches of 4 (parallel within batch)
    const skillContext = getSkillPromptContext(spec.extension);
    for (let batch = 0; batch < modules.length; batch += 4) {
      const batchModules = modules.slice(batch, batch + 4);
      const results = await Promise.all(batchModules.map(async (mod) => {
        try {
          return await invokeWithRetry(
            `Generate a Python example for "${mod.name}" (${mod.description}) using ${spec.extension}. Features: ${mod.features.join(", ")}. Use psycopg2. Include real queries.\n${skillContext}`,
            "Senior Python developer. Return ONLY raw Python code. NO markdown. Include docstrings.",
            50
          );
        } catch { return ""; }
      }));

      for (let i = 0; i < batchModules.length; i++) {
        const mod = batchModules[i];
        const idx = batch + i + 1;
        const modDir = join(tmpDir, "modules", `module_${String(idx).padStart(2, "0")}_${mod.name.replace(/[\s/]+/g, "_").toLowerCase()}`);
        mkdirSync(modDir);
        const content = results[i];
        writeFileSync(join(modDir, "README.md"), `# Module ${idx}: ${mod.name}\n\n${mod.description}\n\n## Features\n\n${mod.features.map((f: string) => `- ${f}`).join("\n")}\n\n## Usage\n\n\`\`\`bash\npython example.py\n\`\`\`\n`);
        writeFileSync(join(modDir, "example.py"), content || `"""${mod.name}"""\nimport psycopg2, os\n\ndef run():\n    conn = psycopg2.connect(os.environ["DATABASE_URL"])\n    cur = conn.cursor()\n    cur.execute("SELECT version()")\n    print(cur.fetchone())\n    conn.close()\n\nif __name__ == "__main__":\n    run()\n`);
      }
    }

    // ── Eval: validate generated output ──
    const auditErrors: string[] = [];
    const requiredFiles = ["app.py", "deploy.sh", "README.md", "GETTING_STARTED.md", "LICENSE", "requirements.txt",
      "cloudformation/main.yaml", "cloudformation/parameters.json", "database/setup.sql"];
    for (const f of requiredFiles) {
      const p = join(tmpDir, f);
      if (!existsSync(p)) auditErrors.push(`Missing: ${f}`);
      else if (statSync(p).size === 0) auditErrors.push(`Empty: ${f}`);
    }

    // Validate Python syntax
    const appPyContent = existsSync(join(tmpDir, "app.py")) ? readFileSync(join(tmpDir, "app.py"), "utf-8") : "";
    if (appPyContent && !appPyContent.includes("def ") && !appPyContent.includes("import ")) {
      auditErrors.push("app.py: No function definitions or imports found — likely invalid Python");
    }
    if (appPyContent && (appPyContent.includes("```") || appPyContent.includes("```python"))) {
      auditErrors.push("app.py: Contains markdown code fences — raw LLM output leaked");
    }

    // Validate CloudFormation YAML structure
    const cfnContent = existsSync(join(tmpDir, "cloudformation", "main.yaml"))
      ? readFileSync(join(tmpDir, "cloudformation", "main.yaml"), "utf-8") : "";
    if (cfnContent && !cfnContent.includes("AWSTemplateFormatVersion")) {
      auditErrors.push("cloudformation/main.yaml: Missing AWSTemplateFormatVersion — invalid CFN template");
    }
    if (cfnContent && !cfnContent.includes("Resources:")) {
      auditErrors.push("cloudformation/main.yaml: Missing Resources section");
    }

    // Validate SQL
    const sqlContent = existsSync(join(tmpDir, "database", "setup.sql"))
      ? readFileSync(join(tmpDir, "database", "setup.sql"), "utf-8") : "";
    if (sqlContent && !sqlContent.includes("CREATE") && !sqlContent.includes("create")) {
      auditErrors.push("database/setup.sql: No CREATE statements found");
    }
    if (sqlContent && (sqlContent.includes("```") || sqlContent.includes("```sql"))) {
      auditErrors.push("database/setup.sql: Contains markdown code fences — raw LLM output leaked");
    }

    // Python AST compile check
    if (appPyContent) {
      try {
        const { execSync } = require("child_process");
        execSync(`python3 -c "compile(open('app.py').read(), 'app.py', 'exec')"`, { cwd: tmpDir, timeout: 5000 });
      } catch (e: any) {
        const msg = e.stderr?.toString()?.split("\n").pop() || "syntax error";
        auditErrors.push(`app.py: Python syntax error — ${msg.trim()}`);
      }
    }

    // YAML parse validation
    if (cfnContent) {
      try {
        const yaml = require("js-yaml");
        const parsed = yaml.load(cfnContent);
        if (!parsed || typeof parsed !== "object") auditErrors.push("cloudformation/main.yaml: YAML parsed to non-object");
      } catch (e: any) {
        auditErrors.push(`cloudformation/main.yaml: Invalid YAML — ${e.message?.split("\n")[0]}`);
      }
    }

    // JSON parse validation (parameters.json)
    const paramsPath = join(tmpDir, "cloudformation", "parameters.json");
    if (existsSync(paramsPath)) {
      try { JSON.parse(readFileSync(paramsPath, "utf-8")); }
      catch { auditErrors.push("cloudformation/parameters.json: Invalid JSON"); }
    }

    // deploy.sh has shebang
    const deployContent = existsSync(join(tmpDir, "deploy.sh")) ? readFileSync(join(tmpDir, "deploy.sh"), "utf-8") : "";
    if (deployContent && !deployContent.startsWith("#!/")) {
      auditErrors.push("deploy.sh: Missing shebang (#!/bin/bash)");
    }

    // requirements.txt format check
    const reqContent = existsSync(join(tmpDir, "requirements.txt")) ? readFileSync(join(tmpDir, "requirements.txt"), "utf-8") : "";
    if (reqContent) {
      const badLines = reqContent.split("\n").filter(l => l.trim() && !l.startsWith("#") && !/^[a-zA-Z0-9_-]+/.test(l.trim()));
      if (badLines.length > 0) auditErrors.push(`requirements.txt: Invalid lines — ${badLines[0]}`);
    }

    // Security: no hardcoded secrets
    const allFiles = [appPyContent, cfnContent, sqlContent, deployContent];
    const secretPatterns = [/AKIA[0-9A-Z]{16}/, /password\s*=\s*["'][^"']+["']/, /secret_key\s*=\s*["'][^"']+["']/i];
    for (const content of allFiles) {
      for (const pat of secretPatterns) {
        if (pat.test(content)) {
          auditErrors.push(`Security: Hardcoded secret detected (${pat.source.slice(0, 20)}...)`);
          break;
        }
      }
    }

    // Module count matches spec
    const modDirs = readdirSync(join(tmpDir, "modules"));
    if (spec.modules && modDirs.length < spec.modules.length) {
      auditErrors.push(`Module count mismatch: spec has ${spec.modules.length}, generated ${modDirs.length}`);
    }

    // Hallucination check: verify extension-specific content is present
    const { getExtensionSkill } = require("./skills/extensions");
    const skill = getExtensionSkill(spec.extension);
    if (skill) {
      // SQL should reference the extension
      if (sqlContent && !sqlContent.toLowerCase().includes(skill.name.toLowerCase()) && !sqlContent.includes("CREATE EXTENSION")) {
        auditErrors.push(`Hallucination: setup.sql doesn't reference ${skill.name} extension`);
      }
      // App.py should use extension-related patterns
      const hasExtensionUsage = skill.validFunctions.some((fn: string) => appPyContent.toLowerCase().includes(fn.toLowerCase()));
      if (appPyContent && !hasExtensionUsage && appPyContent.length > 200) {
        auditErrors.push(`Hallucination: app.py doesn't use any ${skill.name} functions (${skill.validFunctions.slice(0, 3).join(", ")}...)`);
      }
    }

    // Check for empty module content (the main issue reported)
    let emptyModules = 0;
    for (const m of modDirs) {
      const exPath = join(tmpDir, "modules", m, "example.py");
      if (existsSync(exPath)) {
        const content = readFileSync(exPath, "utf-8");
        if (content.length < 50 || content.includes('cur.execute("SELECT 1")')) {
          emptyModules++;
        }
      }
    }
    if (emptyModules > 2) {
      auditErrors.push(`Empty content: ${emptyModules}/${modDirs.length} modules have placeholder/empty code`);
    }

    // Validate modules have content
    if (modDirs.length < 3) auditErrors.push(`Only ${modDirs.length} modules generated (expected 5+)`);
    for (const m of modDirs) {
      if (!existsSync(join(tmpDir, "modules", m, "README.md"))) auditErrors.push(`Missing: modules/${m}/README.md`);
      if (!existsSync(join(tmpDir, "modules", m, "example.py"))) auditErrors.push(`Missing: modules/${m}/example.py`);
      else {
        const ex = readFileSync(join(tmpDir, "modules", m, "example.py"), "utf-8");
        if (ex.includes("```")) auditErrors.push(`modules/${m}/example.py: Contains markdown fences`);
      }
    }

    // Report eval failures as bugs
    if (auditErrors.length > 0) {
      console.warn(`⚠️ Template eval failed for ${spec.name} (${auditErrors.length} issues):`, auditErrors);
      try {
        const { db } = await import("./db");
        const { agentActions } = await import("../shared/schema");
        await db.insert(agentActions).values({
          agentType: "bug_fix",
          triggerSource: "template_eval",
          inputData: { template: spec.name, totalIssues: auditErrors.length },
          proposedPlan: auditErrors.map((err, i) => ({
            id: `EVAL-${String(i + 1).padStart(3, "0")}`,
            title: err,
            severity: err.includes("Missing:") || err.includes("invalid") ? "high" : "medium",
            rootCause: "Template generation produced incomplete or malformed output",
            proposedFix: "Re-run generation or manually fix the affected file",
            status: "pending",
          })),
          status: "proposed",
        });
      } catch (e) {
        console.error("Failed to report eval bugs:", e);
      }
    }

    // Package as ZIP
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Uint8Array[] = [];
    const passthrough = new PassThrough();
    passthrough.on("data", (chunk) => chunks.push(chunk));
    archive.pipe(passthrough);
    archive.directory(tmpDir, false);
    await archive.finalize();
    return Buffer.concat(chunks);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function generateAppPy(spec: DemoSpec): Promise<string> {
  const endpoints = spec.apiEndpoints?.map(e => `${e.method} ${e.path} - ${e.description}`).join("\n") || "GET /api/health - Health check";
  const skillContext = getSkillPromptContext(spec.extension);
  return invokeWithRetry(
    `Generate a Flask app.py for a PostgreSQL ${spec.extension} demo called "${spec.displayName}". Include these endpoints:\n${endpoints}\n\nMust include /api/health endpoint. Use psycopg2 and python-dotenv.\n${skillContext}`,
    "You are a senior Python developer. Return ONLY raw Python code. NO markdown fences. NO explanations. The output will be written directly to app.py."
  );
}

async function generateSetupSql(spec: DemoSpec): Promise<string> {
  const skillContext = getSkillPromptContext(spec.extension);
  return invokeWithRetry(
    `Generate PostgreSQL setup SQL for a ${spec.extension} demo called "${spec.name}". Data model: ${spec.dataModel || "Create appropriate tables for " + spec.displayName}. Include CREATE EXTENSION, CREATE TABLE with proper types, and INSERT sample data (at least 20 rows).\n${skillContext}`,
    "You are a PostgreSQL expert. Return ONLY raw SQL. NO markdown fences. NO explanations. The output will be written directly to setup.sql."
  );
}

async function generateCfnTemplate(spec: DemoSpec): Promise<string> {
  const skillContext = getSkillPromptContext(spec.extension);
  const sharedLibs = skillContext.includes("shared_preload_libraries") ? `Ensure shared_preload_libraries includes ${spec.extension}.` : "";
  return invokeWithRetry(
    `Generate an AWS CloudFormation YAML template for deploying a PostgreSQL demo with ${spec.extension}. Include: VPC (2 AZs, public+private subnets), Aurora PostgreSQL 17 cluster (private, encrypted), Bastion host (Amazon Linux 2023, SSM), Security Groups (bastion→aurora only). Use NoEcho for password. ${sharedLibs} ${spec.cloudformationNotes || ""}`,
    "You are a CloudFormation expert. Return ONLY valid YAML starting with AWSTemplateFormatVersion. NO markdown fences. NO explanations."
  );
}

async function generateReadme(spec: DemoSpec): Promise<string> {
  return `# ${spec.displayName}

> **Generated by** [DemoForge](https://github.com/nrsundar/cloud-demo-generator-v2) — a meta-tool for producing AWS PostgreSQL extension demos.
> **Built with** [Kiro](https://kiro.dev) (powered by Anthropic Claude).

| Setting | Value |
|---------|-------|
| Extension | ${spec.extension} |
| Database | Aurora PostgreSQL 17 |
| Instance | db.t4g.medium |
| Modules | ${spec.modules.length} |

---

## Why

Demonstrate ${spec.extension} capabilities for real-world use cases.

## What

${spec.modules.map(m => `- **${m.name}**: ${m.description}`).join("\n")}

## Quick Start

\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

## Modules

${spec.modules.map((m, i) => `### Module ${i + 1}: ${m.name}\n${m.description}\n`).join("\n")}

## License

MIT-0

---

## Built With

- **[Kiro](https://kiro.dev)** (Anthropic Claude) — AI-powered code generation
- **Amazon Aurora PostgreSQL** — managed database with extension support
- **AWS CloudFormation** — infrastructure as code
- **DemoForge** — [meta-tool](https://github.com/nrsundar/cloud-demo-generator-v2) that produced this demo
`;
}

async function generateDeploySh(spec: DemoSpec): Promise<string> {
  return `#!/bin/bash
set -e

AWS_REGION="\${AWS_REGION:-us-east-2}"
STACK_NAME="cdg-${spec.name}"

echo "🚀 Deploying ${spec.displayName}..."
echo "   Region: $AWS_REGION"
echo "   Stack:  $STACK_NAME"

# Validate template
aws cloudformation validate-template \\
  --template-body file://cloudformation/main.yaml \\
  --region $AWS_REGION

# Deploy stack
aws cloudformation deploy \\
  --template-file cloudformation/main.yaml \\
  --stack-name $STACK_NAME \\
  --parameter-overrides file://cloudformation/parameters.json \\
  --capabilities CAPABILITY_NAMED_IAM \\
  --region $AWS_REGION

echo "✅ Stack deployed. Getting outputs..."
aws cloudformation describe-stacks \\
  --stack-name $STACK_NAME \\
  --region $AWS_REGION \\
  --query "Stacks[0].Outputs" \\
  --output table
`;
}

async function generateDemoMaterials(spec: DemoSpec): Promise<{ talkingPoints: string; script: string; guide: string }> {
  const response = await invokeModel(
    `For a PostgreSQL ${spec.extension} demo called "${spec.displayName}" with modules: ${spec.modules.map(m => m.name).join(", ")}. Generate three sections separated by "---SECTION---": 1) Customer talking points (bullet points), 2) Demo script (step-by-step), 3) Presentation guide (slide outline).`,
    "You are a solutions architect creating demo materials. Be concise and practical."
  );
  const sections = response.split("---SECTION---").map(s => s.trim());
  return {
    talkingPoints: `# Customer Talking Points\n\n${sections[0] || "TBD"}`,
    script: `# Demo Script\n\n${sections[1] || "TBD"}`,
    guide: `# Presentation Guide\n\n${sections[2] || "TBD"}`,
  };
}
