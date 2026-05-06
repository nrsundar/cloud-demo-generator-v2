import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { apiRequest } from "../lib/queryClient";
import { API_BASE } from "../lib/config";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";

const EXTENSIONS = [
  { value: "pgvector" }, { value: "postgis" }, { value: "pgrouting" },
  { value: "pg_cron" }, { value: "pg_partman" }, { value: "pg_trgm" },
  { value: "auto_explain" }, { value: "pg_stat_statements" },
  { value: "hstore" }, { value: "ltree" }, { value: "apache_age" }, { value: "timescaledb" },
  { value: "dynamodb" }, { value: "neptune" }, { value: "aurora-mysql" },
  { value: "elasticache-redis" }, { value: "documentdb" },
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
  const [matches, setMatches] = useState<any[]>([]);

  // Fetch catalog for client-side matching
  const { data: repos } = useQuery({ queryKey: ["/api/repositories"], enabled: !!user });

  // Find similar demos when extension or description changes
  useEffect(() => {
    if (!repos || repos.length === 0) return;
    const ext = extension.toLowerCase();
    const desc = description.toLowerCase();
    const found = repos.filter((r: any) => {
      const name = (r.name || "").toLowerCase();
      const useCases = ((r.useCases as string[]) || []).join(" ").toLowerCase();
      // Match by extension
      if (ext && (name.includes(ext) || useCases.includes(ext))) return true;
      // Match by keywords in description
      if (desc.length > 20) {
        const words = desc.split(/\s+/).filter((w: string) => w.length > 4);
        const matchCount = words.filter((w: string) => name.includes(w)).length;
        if (matchCount >= 2) return true;
      }
      return false;
    });
    setMatches(found.slice(0, 3));
  }, [extension, description, repos]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/demo-requests", {
        requesterEmail: user?.email || "",
        title, description,
        targetExtension: extension || undefined,
        customerIndustry: industry?.value,
        complexity: complexity?.value,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.existingMatch) {
        setFlash([{ type: "info", content: data.message, dismissible: true, onDismiss: () => setFlash([]),
          action: <Button onClick={() => navigate("/home")}>Go to Catalog</Button> }]);
        return;
      }
      setFlash([{ type: "success",
        content: data.clarifyingQuestions
          ? "Request submitted! AI has generated clarifying questions. Check 'My Requests' to answer them."
          : "Request submitted successfully. An admin will review it shortly.",
        dismissible: true, onDismiss: () => setFlash([]),
        action: <Button onClick={() => navigate("/my-requests")}>View My Requests</Button> }]);
      setTitle(""); setDescription(""); setExtension(""); setIndustry(null); setComplexity(null);
    },
    onError: (err: any) => {
      setFlash([{ type: "error", content: err.message || "Submission failed.", dismissible: true, onDismiss: () => setFlash([]) }]);
    },
  });

  if (!user) {
    return (
      <ContentLayout header={<Header variant="h1">Request a New Demo</Header>}>
        <Container><Button onClick={() => navigate("/auth")}>Sign in to submit a request</Button></Container>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout header={<Header variant="h1" description="Describe the demo you need. Our AI agent will generate clarifying questions, then produce a full spec for admin approval.">Request a New Demo</Header>}>
      <SpaceBetween size="l">
        <Flashbar items={flash} />

        {matches.length > 0 && (
          <Alert type="info" header="Similar demos already exist in the catalog">
            <SpaceBetween size="xs">
              <Box>One of these might already meet your needs:</Box>
              {matches.map((m: any) => (
                <Box key={m.id}>
                  <strong>{m.name}</strong> — {m.databaseType} {m.databaseVersion}
                  {" "}
                  <Button variant="inline-link" href={`${API_BASE}/api/repositories/${m.id}/zip`}>Download</Button>
                </Box>
              ))}
              <Box color="text-body-secondary" fontSize="body-s">If none of these match, continue with your request below.</Box>
            </SpaceBetween>
          </Alert>
        )}

        <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }}>
          <Form actions={<Button variant="primary" loading={submitMutation.isPending} disabled={!title || !description}>Submit Request</Button>}>
            <Container header={<Header variant="h2">Demo Details</Header>}>
              <SpaceBetween size="l">
                <FormField label="Title" description="Short name for this demo request">
                  <Input value={title} onChange={({ detail }) => setTitle(detail.value)} placeholder="e.g., Real-time fraud detection with pgvector" />
                </FormField>
                <FormField label="Description" description="Describe the use case, target audience, and what you want to demonstrate">
                  <Textarea value={description} onChange={({ detail }) => setDescription(detail.value)} rows={4}
                    placeholder="e.g., Need a demo showing how pgvector can be used for real-time fraud detection in financial transactions..." />
                </FormField>
                <FormField label="Database / Extension" description="Type any database engine or extension (optional)">
                  <Autosuggest value={extension} onChange={({ detail }) => setExtension(detail.value)}
                    options={EXTENSIONS} placeholder="e.g., pgvector, dynamodb, neptune, aurora-mysql" enteredTextLabel={v => `Use: "${v}"`} empty="Type any engine or extension" />
                </FormField>
                <FormField label="Customer Industry" description="Optional">
                  <Select selectedOption={industry} onChange={({ detail }) => setIndustry(detail.selectedOption)} options={INDUSTRIES} placeholder="Select industry" />
                </FormField>
                <FormField label="Complexity Level" description="Optional">
                  <Select selectedOption={complexity} onChange={({ detail }) => setComplexity(detail.selectedOption)} options={COMPLEXITY} placeholder="Select complexity" />
                </FormField>
              </SpaceBetween>
            </Container>
          </Form>
        </form>
      </SpaceBetween>
    </ContentLayout>
  );
}
