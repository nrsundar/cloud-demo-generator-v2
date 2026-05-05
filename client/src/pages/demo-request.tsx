import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import Autosuggest from "@cloudscape-design/components/autosuggest";
import Select from "@cloudscape-design/components/select";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Container from "@cloudscape-design/components/container";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";

const EXTENSIONS = [
  { value: "pgvector" },
  { value: "postgis" },
  { value: "pgrouting" },
  { value: "pg_cron" },
  { value: "pg_partman" },
  { value: "pg_trgm" },
  { value: "auto_explain" },
  { value: "pg_stat_statements" },
  { value: "hstore" },
  { value: "ltree" },
  { value: "apache_age" },
  { value: "timescaledb" },
];

const INDUSTRIES = [
  { label: "Financial Services", value: "financial" },
  { label: "Healthcare & Life Sciences", value: "healthcare" },
  { label: "Retail & E-commerce", value: "retail" },
  { label: "Media & Entertainment", value: "media" },
  { label: "Manufacturing & IoT", value: "manufacturing" },
  { label: "Public Sector", value: "public_sector" },
  { label: "Other", value: "other" },
];

const COMPLEXITY = [
  { label: "Basic — Single extension, simple schema", value: "basic" },
  { label: "Intermediate — Multiple features, moderate data", value: "intermediate" },
  { label: "Advanced — Multi-extension, complex workflows", value: "advanced" },
];

export default function DemoRequestPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [extension, setExtension] = useState("");
  const [industry, setIndustry] = useState<any>(null);
  const [complexity, setComplexity] = useState<any>(null);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/demo-requests", {
        requesterEmail: user?.email || "",
        title,
        description,
        targetExtension: extension || undefined,
        customerIndustry: industry?.value,
        complexity: complexity?.value,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setFlash([{
        type: "success",
        content: data.clarifyingQuestions
          ? "Request submitted! AI has generated clarifying questions. Check 'My Requests' to answer them."
          : "Request submitted successfully. An admin will review it shortly.",
        dismissible: true,
        onDismiss: () => setFlash([]),
        action: <Button onClick={() => navigate("/my-requests")}>View My Requests</Button>,
      }]);
      setTitle(""); setDescription(""); setExtension(""); setIndustry(null); setComplexity(null);
    },
    onError: (err: any) => {
      setFlash([{ type: "error", content: err.message || "Submission failed.", dismissible: true, onDismiss: () => setFlash([]) }]);
    },
  });

  if (!user) {
    return (
      <ContentLayout header={<Header variant="h1">Request a New Demo</Header>}>
        <Container>
          <Button onClick={() => navigate("/auth")}>Sign in to submit a request</Button>
        </Container>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      header={<Header variant="h1" description="Describe the PostgreSQL demo you need. Our AI agent will generate clarifying questions, then produce a full spec for admin approval.">Request a New Demo</Header>}
    >
      <SpaceBetween size="l">
        <Flashbar items={flash} />
        <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }}>
          <Form
            actions={
              <Button variant="primary" loading={submitMutation.isPending}
                disabled={!title || !description}>
                Submit Request
              </Button>
            }
          >
            <Container header={<Header variant="h2">Demo Details</Header>}>
              <SpaceBetween size="l">
                <FormField label="Title" description="Short name for this demo request">
                  <Input value={title} onChange={({ detail }) => setTitle(detail.value)} placeholder="e.g., Real-time fraud detection with pgvector" />
                </FormField>
                <FormField label="Description" description="Describe the use case, target audience, and what you want to demonstrate">
                  <Textarea value={description} onChange={({ detail }) => setDescription(detail.value)} rows={4}
                    placeholder="e.g., Need a demo showing how pgvector can be used for real-time fraud detection in financial transactions. Target audience is technical decision makers at banks..." />
                </FormField>
                <FormField label="PostgreSQL Extension" description="Type any extension name or pick from suggestions (optional)">
                  <Autosuggest value={extension} onChange={({ detail }) => setExtension(detail.value)}
                    options={EXTENSIONS} placeholder="e.g., auto_explain, pgvector, postgis" enteredTextLabel={v => `Use: "${v}"`} empty="Type any extension name" />
                </FormField>
                <FormField label="Customer Industry" description="Optional">
                  <Select selectedOption={industry} onChange={({ detail }) => setIndustry(detail.selectedOption)}
                    options={INDUSTRIES} placeholder="Select industry" />
                </FormField>
                <FormField label="Complexity Level" description="Optional">
                  <Select selectedOption={complexity} onChange={({ detail }) => setComplexity(detail.selectedOption)}
                    options={COMPLEXITY} placeholder="Select complexity" />
                </FormField>
              </SpaceBetween>
            </Container>
          </Form>
        </form>
      </SpaceBetween>
    </ContentLayout>
  );
}
