import React, { useState } from "react";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";

const SLIDES = [
  {
    title: "Cloud Demo Generator",
    subtitle: "AI-Powered Enablement for AWS Database Demos",
    content: "Generate complete, deployable demo packages for any PostgreSQL extension — in minutes, not days.",
    footer: "Powered by Amazon Bedrock (Claude Opus 4.6)",
  },
  {
    title: "The Problem",
    subtitle: "",
    content: `• SAs spend hours building one-off demos for each customer engagement
• Every demo requires: infrastructure, code, data, documentation
• Demos are built from scratch — no reuse across the field
• Customers expect working, deployable examples — not slides`,
    footer: "",
  },
  {
    title: "The Solution",
    subtitle: "AI Agent builds demos from natural language",
    content: `1. Describe what you need → "pgvector fraud detection for fintech"
2. AI asks clarifying questions → audience, scale, features
3. AI generates full package → CloudFormation, Python, SQL, modules
4. Download & deploy → one-click to any AWS account`,
    footer: "Human-in-the-loop: Admin approves before generation",
  },
  {
    title: "What Gets Generated",
    subtitle: "Complete enablement package",
    content: `☁️ CloudFormation — VPC, Aurora PostgreSQL, Bastion, Security Groups
🐍 Application — Flask API with extension-specific endpoints
🗄️ Database — Schema, extensions, 20+ rows of industry-specific seed data
📚 Modules — 5-12 hands-on exercises with working examples
🎯 Demo Materials — Talking points, demo script, presentation guide
📖 Documentation — README, Getting Started, Git import instructions`,
    footer: "",
  },
  {
    title: "Industry-Specific",
    subtitle: "Data and code tailored to your customer",
    content: `• Healthcare → Patient records, clinical trial matching, HIPAA patterns
• Financial → Transaction data, fraud detection, time-series analytics
• Retail → Product catalogs, recommendation engines, search
• Manufacturing → IoT sensor data, fleet tracking, route optimization
• Technology → Embeddings, RAG pipelines, vector similarity`,
    footer: "Tell the AI your customer's industry — it generates relevant data",
  },
  {
    title: "Supported Databases",
    subtitle: "Any AWS managed database — not limited to PostgreSQL",
    content: `Amazon Aurora PostgreSQL — pgvector, PostGIS, pgRouting, pg_trgm, pg_cron, any extension
Amazon Aurora MySQL — JSON, full-text search, spatial
Amazon RDS — PostgreSQL, MySQL, Oracle, SQL Server, Db2
Amazon DynamoDB — Single-table design, event sourcing, streams
Amazon Neptune — Knowledge graphs, fraud detection, social networks
Amazon ElastiCache / MemoryDB — Caching, pub/sub, session management

Plus any extension or feature available on these engines.`,
    footer: "Describe your use case — the AI agent handles the rest",
  },
  {
    title: "Quality Assurance",
    subtitle: "12+ automated eval checks on every generated package",
    content: `✅ Python AST syntax validation
✅ CloudFormation structure verification
✅ SQL correctness (CREATE EXTENSION, tables, data)
✅ No hardcoded secrets
✅ No hallucinated functions (grounded with extension skills)
✅ No empty files or placeholder content
✅ Module completeness verification`,
    footer: "Failures auto-reported to Bug Tracker",
  },
  {
    title: "Architecture",
    subtitle: "",
    content: `Frontend: React + Cloudscape (AWS Console look)
Backend: Node.js + Express on ECS Fargate
Database: Amazon RDS PostgreSQL 16
Auth: Amazon Cognito
AI: Amazon Bedrock (Claude Opus 4.6)
Infra: CloudFormation, VPC, ALB, ECR`,
    footer: "Fully serverless — no EC2 instances to manage",
  },
  {
    title: "Get Started",
    subtitle: "",
    content: `1. Sign in at the app URL
2. Click "Request Demo"
3. Describe your customer's use case
4. Answer the AI's clarifying questions
5. Download from the AI Demo Catalog
6. Deploy to your customer's account

Questions? Check the User Guide tab.`,
    footer: "cloud-demo-generator.internal",
  },
];

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];

  return (
    <ContentLayout header={
      <Header variant="h1" actions={
        <SpaceBetween direction="horizontal" size="xs">
          <Button disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Previous</Button>
          <Box display="inline-block" padding={{ top: "xs" }}>{current + 1} / {SLIDES.length}</Box>
          <Button disabled={current === SLIDES.length - 1} onClick={() => setCurrent(current + 1)}>Next →</Button>
        </SpaceBetween>
      }>Presentation</Header>
    }>
      <Container>
        <div style={{ minHeight: "500px", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px" }}>
          <SpaceBetween size="l">
            <Box fontSize="display-l" fontWeight="bold">{slide.title}</Box>
            {slide.subtitle && <Box fontSize="heading-l" color="text-status-info">{slide.subtitle}</Box>}
            <Box fontSize="heading-m" style={{ whiteSpace: "pre-line", lineHeight: "1.8" }}>{slide.content}</Box>
            {slide.footer && <Box color="text-body-secondary" fontSize="body-s" padding={{ top: "xl" }}>{slide.footer}</Box>}
          </SpaceBetween>
        </div>
      </Container>
    </ContentLayout>
  );
}
