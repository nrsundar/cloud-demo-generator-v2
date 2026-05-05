import React from "react";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Cards from "@cloudscape-design/components/cards";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Badge from "@cloudscape-design/components/badge";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";

const STATS = [
  { value: "Any", label: "Use Case" },
  { value: "AI Agent", label: "Powered By" },
  { value: "10+", label: "Modules/Demo" },
  { value: "1-Click", label: "AWS Deploy" },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Describe", description: "Tell the AI what you need — an extension, an industry, a customer scenario. Plain English." },
  { step: "2", title: "Refine", description: "The agent asks clarifying questions to understand your audience, scale, and demo goals." },
  { step: "3", title: "Generate", description: "AI builds a complete enablement package — infrastructure, code, modules, exercises, and demo scripts." },
  { step: "4", title: "Deploy & Teach", description: "Download the ZIP, import to GitHub/GitLab, deploy with one command, and walk your customer through it." },
];

const EXAMPLES = [
  { title: "pgvector — Hybrid Search", description: "Semantic + lexical retrieval for RAG applications on Aurora PostgreSQL", tags: ["AI/ML", "Embeddings", "LangChain"] },
  { title: "PostGIS — Fleet Tracking", description: "Real-time geofencing, proximity queries, and delivery zone optimization", tags: ["Geospatial", "Logistics", "Maps"] },
  { title: "pgRouting — Network Analysis", description: "Shortest path, TSP, and failure impact analysis for telecom/utilities", tags: ["Graph", "Routing", "Infrastructure"] },
  { title: "pg_trgm — Fuzzy Search", description: "Trigram-based product search with typo tolerance for e-commerce", tags: ["Search", "Retail", "GIN Index"] },
  { title: "pg_cron — IoT Analytics", description: "Scheduled aggregations and data lifecycle for manufacturing sensor data", tags: ["Time-Series", "IoT", "Scheduling"] },
  { title: "auto_explain — Query Tuning", description: "Automatic query plan logging and performance optimization patterns", tags: ["DBA", "Performance", "Observability"] },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Describe any customer demo you need — our AI agent builds a complete enablement package with infrastructure, code, exercises, and documentation. For SAs, TAMs, and field teams."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="primary" iconName="gen-ai" onClick={() => navigate(user ? "/demo-request" : "/auth")}>
                Request a Demo
              </Button>
              {user && <Button onClick={() => navigate("/home")}>Browse Catalog</Button>}
            </SpaceBetween>
          }
        >
          Cloud Demo Generator
        </Header>
      }
    >
      <SpaceBetween size="xl">
        {/* Stats bar */}
        <Container>
          <ColumnLayout columns={4} variant="text-grid" minColumnWidth={120}>
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <Box variant="awsui-key-label" fontSize="body-s">{s.label}</Box>
                <Box variant="h2" fontSize="heading-l" fontWeight="bold">{s.value}</Box>
              </div>
            ))}
          </ColumnLayout>
        </Container>

        {/* How it works */}
        <Container header={<Header variant="h2">How It Works</Header>}>
          <ColumnLayout columns={4}>
            {HOW_IT_WORKS.map((item) => (
              <Box key={item.step}>
                <Box fontSize="display-l" fontWeight="bold" color="text-status-info">{item.step}</Box>
                <Box variant="h3">{item.title}</Box>
                <Box color="text-body-secondary">{item.description}</Box>
              </Box>
            ))}
          </ColumnLayout>
        </Container>

        {/* What the agent builds */}
        <Container header={<Header variant="h2">What the AI Agent Builds</Header>}>
          <ColumnLayout columns={3}>
            <Box>
              <Box variant="h3">☁️ AWS Infrastructure</Box>
              <Box color="text-body-secondary">CloudFormation templates — VPC, Aurora PostgreSQL, Bastion, Security Groups. Deploy to any account with one command.</Box>
            </Box>
            <Box>
              <Box variant="h3">📚 Learning Modules</Box>
              <Box color="text-body-secondary">10+ structured modules with README, working examples, and exercises. Teach customers to build, not just watch.</Box>
            </Box>
            <Box>
              <Box variant="h3">🎯 Demo Materials</Box>
              <Box color="text-body-secondary">Customer talking points, step-by-step demo scripts, and presentation guides tailored to your audience.</Box>
            </Box>
            <Box>
              <Box variant="h3">🐍 Application Code</Box>
              <Box color="text-body-secondary">Flask API with health checks, use-case endpoints, database connectivity, and error handling.</Box>
            </Box>
            <Box>
              <Box variant="h3">🗄️ Database Schema</Box>
              <Box color="text-body-secondary">Extension setup, table creation, seed data, and migrations — ready to run on Aurora PostgreSQL.</Box>
            </Box>
            <Box>
              <Box variant="h3">📖 Documentation</Box>
              <Box color="text-body-secondary">README, Getting Started guide, GitHub/GitLab import instructions, cleanup commands, and architecture notes.</Box>
            </Box>
          </ColumnLayout>
        </Container>

        {/* Examples */}
        <div>
          <Box variant="h2" padding={{ bottom: "s" }}>Examples of What's Been Built</Box>
          <Box color="text-body-secondary" padding={{ bottom: "m" }}>These are just examples — you can request any PostgreSQL extension, any industry, any use case.</Box>
          <Cards
            cardDefinition={{
              header: (item) => <span style={{ fontSize: "15px", fontWeight: 700 }}>{item.title}</span>,
              sections: [
                { id: "desc", content: (item) => <Box color="text-body-secondary">{item.description}</Box> },
                { id: "tags", content: (item) => (
                  <SpaceBetween direction="horizontal" size="xxs">
                    {item.tags.map((t) => <Badge key={t} color="grey">{t}</Badge>)}
                  </SpaceBetween>
                )},
              ],
            }}
            items={EXAMPLES}
            cardsPerRow={[{ cards: 1 }, { minWidth: 350, cards: 3 }]}
          />
        </div>

        {/* CTA */}
        <Container>
          <Box textAlign="center" padding={{ top: "l", bottom: "l" }}>
            <SpaceBetween size="m" alignItems="center">
              <Box variant="h1" fontSize="heading-xl">What demo does your customer need?</Box>
              <Box color="text-body-secondary" fontSize="heading-s">
                Describe it in plain English. The AI agent handles the rest — questions, spec, code, infrastructure, documentation.
              </Box>
              <Button variant="primary" iconName="gen-ai" onClick={() => navigate(user ? "/demo-request" : "/auth")}>
                Request a Demo
              </Button>
            </SpaceBetween>
          </Box>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
