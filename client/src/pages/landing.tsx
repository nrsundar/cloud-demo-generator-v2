import React from "react";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Cards from "@cloudscape-design/components/cards";
import Button from "@cloudscape-design/components/button";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  { title: "AI-Powered Smart Generator", description: "Each repo is intelligently assembled based on your selected use case, complexity level, and deployment preferences." },
  { title: "AWS Cloud Infrastructure", description: "Complete CloudFormation and Terraform templates for Amazon RDS, Aurora, Lambda, ECS, and more." },
  { title: "Multi-Language Support", description: "Generated code examples in Python, JavaScript, TypeScript, and Go with comprehensive documentation." },
  { title: "Learning Modules", description: "Structured learning paths with exercises, documentation, and hands-on examples for different skill levels." },
  { title: "Complete ZIP Packages", description: "Download ready-to-deploy repositories with infrastructure code, application code, and deployment scripts." },
  { title: "Production Ready", description: "Security best practices, monitoring, and scalability features built into every generated demonstration." },
];

const USE_CASES = [
  { title: "Geospatial Analytics", description: "PostGIS-powered location analytics with real estate and mapping demos", tags: "PostGIS · QGIS · Leaflet" },
  { title: "Time-Series Analytics", description: "Financial data analysis with TimescaleDB extensions", tags: "TimescaleDB · Grafana · Python" },
  { title: "Vector Database (pgVector)", description: "AI/ML applications with vector similarity search", tags: "pgVector · OpenAI · LangChain" },
  { title: "Multi-Tenant SaaS", description: "Scalable multi-tenant architecture with row-level security", tags: "RLS · JWT · REST API" },
  { title: "Analytics Dashboard", description: "Business intelligence with complex queries and reporting", tags: "Metabase · PostgreSQL · Docker" },
  { title: "High Availability Setup", description: "Master-replica configurations with automatic failover", tags: "Aurora · Read Replicas · CloudWatch" },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Build production-ready cloud demo templates in seconds — powered by AI and real-world best practices."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="primary" onClick={() => navigate(user ? "/home" : "/auth")}>
                {user ? "Go to Generator" : "Get Started"}
              </Button>
              <Button onClick={() => navigate("/demo-request")}>Request Custom Demo</Button>
            </SpaceBetween>
          }
        >
          Cloud Demo Generator v3
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Box variant="p" color="text-body-secondary">
          Currently supporting: Amazon RDS PostgreSQL &amp; Aurora PostgreSQL. Expanding to all AWS services.
        </Box>

        <Header variant="h2">Features</Header>
        <Cards
          cardDefinition={{ header: (item) => item.title, sections: [{ id: "desc", content: (item) => item.description }] }}
          items={FEATURES}
          cardsPerRow={[{ cards: 1 }, { minWidth: 400, cards: 3 }]}
        />

        <Header variant="h2">Popular Use Cases</Header>
        <Cards
          cardDefinition={{
            header: (item) => item.title,
            sections: [
              { id: "desc", content: (item) => item.description },
              { id: "tags", header: "Technologies", content: (item) => item.tags },
            ],
          }}
          items={USE_CASES}
          cardsPerRow={[{ cards: 1 }, { minWidth: 400, cards: 3 }]}
        />

        <Box textAlign="center" padding={{ top: "xl", bottom: "xl" }}>
          <SpaceBetween size="s" alignItems="center">
            <Box variant="h2" color="text-label">Ready to Create Your First Demo?</Box>
            <Button variant="primary" onClick={() => navigate(user ? "/home" : "/auth")}>
              {user ? "Go to Generator" : "Sign In to Start"}
            </Button>
          </SpaceBetween>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
}
