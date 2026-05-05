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
import Icon from "@cloudscape-design/components/icon";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  { title: "⚡ Smart Generator", description: "Each repository is intelligently assembled based on your selected use case, complexity level, and deployment preferences — configured in seconds, not hours." },
  { title: "☁️ AWS Infrastructure", description: "Complete CloudFormation templates for Amazon RDS, Aurora, Lambda, ECS, and more — deploy to any AWS account with a single command." },
  { title: "🌐 Multi-Language", description: "Generated code in Python with idiomatic patterns, error handling, and comprehensive documentation. Additional languages coming soon." },
  { title: "📚 Learning Modules", description: "Structured learning paths with exercises, documentation, and hands-on examples tailored to different skill levels." },
  { title: "📦 Complete Packages", description: "Download ready-to-deploy ZIP repositories with infrastructure, application code, seed data, and deployment scripts." },
  { title: "🔧 Extensible", description: "Fork and add your own PostgreSQL demos — pgvector, PostGIS, pgRouting, or any PostgreSQL extension. More database engines coming soon." },
];

const USE_CASES = [
  { title: "Hybrid Search", description: "Semantic + lexical retrieval with pgvector on Aurora PostgreSQL", tags: ["pgvector", "OpenAI", "LangChain"], level: "Advanced" },
  { title: "Geospatial Analytics", description: "Location-based queries, distance calculations, and spatial indexing", tags: ["PostGIS", "QGIS", "Leaflet"], level: "Intermediate" },
  { title: "Time-Series Analytics", description: "Time-series data analysis with partitioning, window functions, and materialized views on Aurora PostgreSQL", tags: ["Partitioning", "Window Functions", "Grafana"], level: "Advanced" },
  { title: "Multi-Tenant SaaS", description: "Scalable multi-tenant architecture with row-level security", tags: ["RLS", "JWT", "REST API"], level: "Advanced" },
  { title: "Analytics Dashboard", description: "Business intelligence with complex queries, materialized views, and reporting", tags: ["Metabase", "PostgreSQL", "Docker"], level: "Intermediate" },
  { title: "High Availability", description: "Master-replica configurations with automatic failover and read scaling", tags: ["Aurora", "Read Replicas", "CloudWatch"], level: "Advanced" },
];

const STATS = [
  { value: "Any", label: "Extension" },
  { value: "AI Agent", label: "Powered By" },
  { value: "10+", label: "Modules/Demo" },
  { value: "1-Click", label: "AWS Deploy" },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Generate complete, deployable database demo repositories for customer engagements. Select a use case, configure your stack, and download a ready-to-run package — in minutes, not hours."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="primary" iconName="add-plus" onClick={() => navigate(user ? "/home" : "/auth")}>
                {user ? "Create Demo" : "Get Started"}
              </Button>
              <Button iconName="contact" onClick={() => navigate("/demo-request")}>Request Custom Demo</Button>
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

        {/* Features */}
        <div>
          <Box variant="h2" padding={{ bottom: "s" }}>What You Get</Box>
          <Cards
            cardDefinition={{
              header: (item) => <span style={{ fontSize: "16px" }}>{item.title}</span>,
              sections: [{ id: "desc", content: (item) => <Box color="text-body-secondary">{item.description}</Box> }],
            }}
            items={FEATURES}
            cardsPerRow={[{ cards: 1 }, { minWidth: 350, cards: 3 }]}
          />
        </div>

        {/* Use Cases */}
        <div>
          <Box variant="h2" padding={{ bottom: "s" }}>Available Use Cases</Box>
          <Cards
            cardDefinition={{
              header: (item) => (
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  <span style={{ fontSize: "15px", fontWeight: 700 }}>{item.title}</span>
                  <Badge color={item.level === "Advanced" ? "red" : "blue"}>{item.level}</Badge>
                </SpaceBetween>
              ),
              sections: [
                { id: "desc", content: (item) => <Box color="text-body-secondary">{item.description}</Box> },
                {
                  id: "tags",
                  content: (item) => (
                    <SpaceBetween direction="horizontal" size="xxs">
                      {item.tags.map((t) => <Badge key={t} color="grey">{t}</Badge>)}
                    </SpaceBetween>
                  ),
                },
              ],
            }}
            items={USE_CASES}
            cardsPerRow={[{ cards: 1 }, { minWidth: 350, cards: 3 }]}
          />
        </div>

        {/* AI-powered requests */}
        <Container header={<Header variant="h2">Request Any Demo</Header>}>
          <ColumnLayout columns={3}>
            <Box>
              <Box variant="h3">🤖 AI-Powered Generation</Box>
              <Box color="text-body-secondary">Describe what you need in plain English — our AI agent builds a complete learning package for your customer engagement</Box>
            </Box>
            <Box>
              <Box variant="h3">🔌 Any PostgreSQL Extension</Box>
              <Box color="text-body-secondary">pgvector, PostGIS, pgRouting, pg_cron, auto_explain, Apache AGE — or any extension your customer needs to evaluate</Box>
            </Box>
            <Box>
              <Box variant="h3">📚 Hands-On Enablement</Box>
              <Box color="text-body-secondary">Structured modules, working examples, and guided exercises — teach customers how to build with AWS databases, not just show them</Box>
            </Box>
          </ColumnLayout>
        </Container>

        {/* CTA */}
        <Container>
          <Box textAlign="center" padding={{ top: "l", bottom: "l" }}>
            <SpaceBetween size="m" alignItems="center">
              <Box variant="h1" fontSize="heading-xl">Ready to build your next customer demo?</Box>
              <Box color="text-body-secondary" fontSize="heading-s">
                Sign in, configure your demo, and download a complete repository in under two minutes.
              </Box>
              <Button variant="primary" iconName="add-plus" onClick={() => navigate(user ? "/home" : "/auth")}>
                {user ? "Go to Generator" : "Get Started Free"}
              </Button>
            </SpaceBetween>
          </Box>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
