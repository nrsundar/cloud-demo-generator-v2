import React from "react";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Alert from "@cloudscape-design/components/alert";

export default function GuidePage() {
  return (
    <ContentLayout header={<Header variant="h1" description="Everything you need to know to request, generate, and deliver demos to customers.">User Guide</Header>}>
      <SpaceBetween size="l">
        <Alert type="info">This tool is for AWS field teams (SAs, TAMs, Sales Engineers). It generates hands-on enablement packages that teach customers how to build with PostgreSQL extensions on Aurora.</Alert>

        <Container header={<Header variant="h2">Quick Start (2 minutes)</Header>}>
          <SpaceBetween size="m">
            <Box><strong>1.</strong> Go to <strong>Request Demo</strong> in the left nav</Box>
            <Box><strong>2.</strong> Enter a title and description — describe what your customer needs</Box>
            <Box><strong>3.</strong> Optionally type the PostgreSQL extension (pgvector, PostGIS, etc.)</Box>
            <Box><strong>4.</strong> Submit — the AI agent generates clarifying questions</Box>
            <Box><strong>5.</strong> Answer the questions (check <strong>My Requests</strong>)</Box>
            <Box><strong>6.</strong> An admin approves → AI generates the full package</Box>
            <Box><strong>7.</strong> Download the ZIP from <strong>Generator → AI Demo Catalog</strong></Box>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">What's in the ZIP</Header>}>
          <ColumnLayout columns={2}>
            <SpaceBetween size="s">
              <Box variant="h3">Infrastructure</Box>
              <Box>• <code>cloudformation/main.yaml</code> — Full VPC + Aurora + Bastion</Box>
              <Box>• <code>cloudformation/parameters.json</code> — Deployment config</Box>
              <Box>• <code>deploy.sh</code> — One-command deployment script</Box>
            </SpaceBetween>
            <SpaceBetween size="s">
              <Box variant="h3">Application</Box>
              <Box>• <code>app.py</code> — Flask API with extension-specific endpoints</Box>
              <Box>• <code>requirements.txt</code> — Python dependencies</Box>
              <Box>• <code>.env.example</code> — Environment variables template</Box>
            </SpaceBetween>
            <SpaceBetween size="s">
              <Box variant="h3">Database</Box>
              <Box>• <code>database/setup.sql</code> — Schema, extensions, seed data</Box>
              <Box>• <code>database/migrations/</code> — Versioned migrations</Box>
            </SpaceBetween>
            <SpaceBetween size="s">
              <Box variant="h3">Learning & Demo</Box>
              <Box>• <code>modules/</code> — 5-12 hands-on modules with examples</Box>
              <Box>• <code>demo/</code> — Talking points, demo script, presentation guide</Box>
              <Box>• <code>GETTING_STARTED.md</code> — Setup + Git import instructions</Box>
            </SpaceBetween>
          </ColumnLayout>
        </Container>

        <Container header={<Header variant="h2">Deploying to a Customer Account</Header>}>
          <SpaceBetween size="m">
            <Box>After downloading the ZIP:</Box>
            <Box variant="code"><pre>{`# Unzip
unzip demo-name.zip -d demo-name && cd demo-name

# Deploy (requires AWS CLI configured with target account)
chmod +x deploy.sh
./deploy.sh

# Or manually:
aws cloudformation create-stack \\
  --stack-name <demo-name> \\
  --template-body file://cloudformation/main.yaml \\
  --parameters ParameterKey=DBPassword,ParameterValue=<password> \\
  --capabilities CAPABILITY_NAMED_IAM \\
  --region us-east-2`}</pre></Box>
            <Box><strong>Cleanup:</strong></Box>
            <Box variant="code"><pre>{`aws cloudformation delete-stack --stack-name <demo-name> --region us-east-2`}</pre></Box>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Supported Extensions</Header>}>
          <ColumnLayout columns={3}>
            <Box><strong>pgvector</strong> — AI/ML vector similarity, RAG, recommendations</Box>
            <Box><strong>PostGIS</strong> — Geospatial queries, distance, geofencing</Box>
            <Box><strong>pgRouting</strong> — Network routing, shortest path, TSP</Box>
            <Box><strong>pg_trgm</strong> — Fuzzy text search, typo tolerance</Box>
            <Box><strong>pg_cron</strong> — Job scheduling, automated maintenance</Box>
            <Box><strong>auto_explain</strong> — Query plan logging, performance tuning</Box>
          </ColumnLayout>
          <Box padding={{ top: "m" }} color="text-body-secondary">You can request ANY extension — the AI agent will generate a demo even for extensions not listed here.</Box>
        </Container>

        <Container header={<Header variant="h2">Tips for Better Demos</Header>}>
          <SpaceBetween size="s">
            <Box>• <strong>Be specific about the industry</strong> — "healthcare patient matching" generates better data than "vector search"</Box>
            <Box>• <strong>Mention the audience</strong> — "for a CTO" vs "for a DBA" produces different complexity levels</Box>
            <Box>• <strong>State the scale</strong> — "1M records" vs "100 records" affects index choices and architecture</Box>
            <Box>• <strong>Check the AI Demo Catalog first</strong> — a similar demo may already exist</Box>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">FAQ</Header>}>
          <SpaceBetween size="m">
            <Box><strong>Q: How long does generation take?</strong><br/>A: ~5 minutes after admin approval. You'll see it in the catalog when ready.</Box>
            <Box><strong>Q: Can I customize the generated code?</strong><br/>A: Yes — import the ZIP into GitHub/GitLab and modify freely. It's MIT-0 licensed.</Box>
            <Box><strong>Q: What if the generated code has issues?</strong><br/>A: The system runs 12+ eval checks. If issues slip through, report via the admin dashboard.</Box>
            <Box><strong>Q: Can I request demos for non-PostgreSQL databases?</strong><br/>A: Currently PostgreSQL only. Aurora MySQL and DynamoDB are on the roadmap.</Box>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
