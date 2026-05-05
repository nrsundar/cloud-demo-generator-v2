import React, { useState } from "react";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";

const SLIDES = [
  {
    title: "Cloud Demo Generator",
    subtitle: "AI-Powered Enablement for AWS Database Demos",
    bullets: [],
    note: "Powered by Amazon Bedrock (Claude Opus 4)",
  },
  {
    title: "The Problem",
    subtitle: "",
    bullets: [
      "SAs spend hours building one-off demos for each customer",
      "Every demo needs: infrastructure, code, data, documentation",
      "No reuse across the field — built from scratch every time",
      "Customers expect working, deployable examples — not slides",
    ],
    note: "",
  },
  {
    title: "The Solution",
    subtitle: "AI Agent builds demos from natural language",
    bullets: [
      "1. Describe what you need → \"pgvector fraud detection for fintech\"",
      "2. AI asks clarifying questions → audience, scale, features",
      "3. AI generates full package → CloudFormation, Python, SQL, modules",
      "4. Download & deploy → one-click to any AWS account",
    ],
    note: "Human-in-the-loop: Admin approves before generation",
  },
  {
    title: "What Gets Generated",
    subtitle: "Complete enablement package per demo",
    bullets: [
      "☁️  CloudFormation — VPC, database, compute, security groups",
      "🐍  Application — Flask API with database-specific endpoints",
      "🗄️  Database — Schema, extensions, industry-specific seed data",
      "📚  Modules — 10 hands-on exercises with working examples",
      "🎯  Demo Materials — Talking points, demo script, presentation guide",
      "📖  Documentation — README, Getting Started, Git import instructions",
    ],
    note: "",
  },
  {
    title: "Industry-Specific",
    subtitle: "Data and code tailored to your customer",
    bullets: [
      "Healthcare → Patient records, clinical trial matching, HIPAA",
      "Financial Services → Transactions, fraud detection, compliance",
      "Retail → Product catalogs, recommendations, search",
      "Manufacturing → IoT sensors, fleet tracking, route optimization",
      "Technology → Embeddings, RAG pipelines, multi-tenant SaaS",
    ],
    note: "Tell the AI your customer's industry — it generates relevant data",
  },
  {
    title: "Supported AWS Databases",
    subtitle: "",
    bullets: [
      "Aurora PostgreSQL — pgvector, PostGIS, pgRouting, pg_trgm, pg_cron, any extension",
      "Aurora MySQL — JSON, full-text search, spatial, read replicas",
      "Amazon DynamoDB — Single-table design, GSIs, streams, TTL",
      "Amazon Neptune — Knowledge graphs, Gremlin, SPARQL",
      "Amazon RDS — PostgreSQL, MySQL, Oracle, SQL Server, Db2",
      "ElastiCache / MemoryDB — Caching, pub/sub, leaderboards",
    ],
    note: "Describe your use case — the AI agent handles the rest",
  },
  {
    title: "Quality Assurance",
    subtitle: "12+ automated eval checks on every generated package",
    bullets: [
      "✅  Python AST syntax validation",
      "✅  CloudFormation YAML structure verification",
      "✅  SQL correctness — CREATE EXTENSION, tables, seed data",
      "✅  No hardcoded secrets (AWS keys, passwords)",
      "✅  No hallucinated functions — grounded with extension skills",
      "✅  No empty files or placeholder content",
      "✅  Module completeness — every module has README + example",
    ],
    note: "Failures auto-reported to Bug Tracker dashboard",
  },
  {
    title: "Architecture",
    subtitle: "",
    bullets: [
      "Frontend — React + Cloudscape Design System (AWS Console look)",
      "Backend — Node.js + Express on ECS Fargate",
      "Database — Amazon RDS PostgreSQL 16",
      "Auth — Amazon Cognito",
      "AI — Amazon Bedrock (Claude Opus 4)",
      "Infra — CloudFormation, VPC, ALB, ECR",
    ],
    note: "Fully serverless — no EC2 instances to manage",
  },
  {
    title: "Get Started",
    subtitle: "",
    bullets: [
      "1. Sign in at the app URL",
      "2. Click \"Request Demo\" in the left nav",
      "3. Describe your customer's use case in plain English",
      "4. Answer the AI's clarifying questions",
      "5. Admin approves → AI generates in ~10 minutes",
      "6. Download from the AI Demo Catalog",
      "7. Deploy to customer's account with one command",
    ],
    note: "Questions? Check the User Guide tab",
  },
];

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];

  return (
    <div style={{ background: "#0f1b2d", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navigation bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", borderBottom: "1px solid #2a3f5f" }}>
        <SpaceBetween direction="horizontal" size="xs">
          <Button disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Previous</Button>
          <Button disabled={current === SLIDES.length - 1} onClick={() => setCurrent(current + 1)}>Next →</Button>
        </SpaceBetween>
        <span style={{ color: "#8d99ae", fontSize: "16px" }}>{current + 1} / {SLIDES.length}</span>
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <h1 style={{ color: "#ffffff", fontSize: "52px", fontWeight: 700, margin: "0 0 16px 0", lineHeight: 1.2 }}>
          {slide.title}
        </h1>

        {slide.subtitle && (
          <h2 style={{ color: "#539bf5", fontSize: "28px", fontWeight: 400, margin: "0 0 40px 0" }}>
            {slide.subtitle}
          </h2>
        )}

        {slide.bullets.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "20px 0" }}>
            {slide.bullets.map((b, i) => (
              <li key={i} style={{ color: "#e2e8f0", fontSize: "24px", lineHeight: 1.8, padding: "4px 0" }}>
                {b}
              </li>
            ))}
          </ul>
        )}

        {slide.note && (
          <p style={{ color: "#8d99ae", fontSize: "18px", marginTop: "40px", fontStyle: "italic" }}>
            {slide.note}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 40px", borderTop: "1px solid #2a3f5f", textAlign: "center" }}>
        <span style={{ color: "#4a5568", fontSize: "14px" }}>Cloud Demo Generator v3.1.0 — Amazon Web Services</span>
      </div>
    </div>
  );
}
