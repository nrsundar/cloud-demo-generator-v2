import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import Multiselect from "@cloudscape-design/components/multiselect";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/useAuth";

const LANGUAGES = [
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Go", value: "go" },
];

const DB_TYPES = [
  { label: "Amazon RDS PostgreSQL", value: "RDS" },
  { label: "Amazon Aurora PostgreSQL", value: "Aurora" },
];

const DB_VERSIONS = [
  { label: "PostgreSQL 16", value: "16" },
  { label: "PostgreSQL 15", value: "15" },
  { label: "PostgreSQL 14", value: "14" },
];

const INSTANCE_TYPES = [
  { label: "db.t4g.micro (Free tier)", value: "db.t4g.micro" },
  { label: "db.t4g.medium", value: "db.t4g.medium" },
  { label: "db.r6g.large", value: "db.r6g.large" },
  { label: "db.r6g.xlarge", value: "db.r6g.xlarge" },
];

const REGIONS = [
  { label: "US East (Ohio)", value: "us-east-2" },
  { label: "US East (N. Virginia)", value: "us-east-1" },
  { label: "US West (Oregon)", value: "us-west-2" },
  { label: "EU (Ireland)", value: "eu-west-1" },
];

const USE_CASES = [
  { label: "Geospatial Analytics (PostGIS)", value: "geospatial" },
  { label: "Network Routing (pgRouting)", value: "timeseries" },
  { label: "Vector Database (pgVector)", value: "vector" },
  { label: "Multi-Tenant SaaS", value: "multitenant" },
  { label: "Analytics Dashboard", value: "analytics" },
  { label: "High Availability Setup", value: "ha" },
];

const COMPLEXITY = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export default function HomePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<any>(null);
  const [dbType, setDbType] = useState<any>(null);
  const [dbVersion, setDbVersion] = useState<any>(null);
  const [instanceType, setInstanceType] = useState<any>(null);
  const [region, setRegion] = useState<any>(null);
  const [useCases, setUseCases] = useState<any[]>([]);
  const [complexity, setComplexity] = useState<any>(null);

  const { data: repos, isLoading } = useQuery<any[]>({
    queryKey: ["/api/repositories"],
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      const hasInProgress = data?.some((r: any) => r.status !== "complete" && r.status !== "error");
      return hasInProgress ? 3000 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/repositories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      setFlash([{ type: "success", content: "Repository generation started!", dismissible: true, onDismiss: () => setFlash([]) }]);
      setName("");
      setLanguage(null); setDbType(null); setDbVersion(null);
      setInstanceType(null); setRegion(null); setUseCases([]); setComplexity(null);
    },
    onError: (e: any) => {
      setFlash([{ type: "error", content: e.message || "Failed to create repository.", dismissible: true, onDismiss: () => setFlash([]) }]);
    },
  });

  const handleCreate = () => {
    if (!name || !language || !dbType || !dbVersion || !instanceType || !region || !useCases.length || !complexity) {
      setFlash([{ type: "error", content: "All fields are required.", dismissible: true, onDismiss: () => setFlash([]) }]);
      return;
    }
    createMutation.mutate({
      name,
      language: language.value,
      databaseType: dbType.value,
      databaseVersion: dbVersion.value,
      instanceType: instanceType.value,
      awsRegion: region.value,
      useCases: useCases.map((u: any) => u.value),
      complexityLevel: complexity.value,
    });
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await apiRequest("GET", `/api/repositories/${id}/zip`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repository-${id}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setFlash([{ type: "error", content: `Download failed: ${e.message}`, dismissible: true, onDismiss: () => setFlash([]) }]);
    }
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Configure your demo repository and generate a complete, downloadable package with infrastructure, code, data, and documentation."
          info={<Box color="text-status-info" display="inline">Tip: Select multiple use cases to create a comprehensive demo.</Box>}
        >
          Demo Generator
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Flashbar items={flash} />

        <Container header={<Header variant="h2">New Repository</Header>}>
          <Form actions={<Button variant="primary" loading={createMutation.isPending} onClick={handleCreate}>Generate Repository</Button>}>
            <SpaceBetween size="l">
              <FormField label="Repository Name">
                <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="my-postgres-demo" />
              </FormField>
              <ColumnLayout columns={2}>
                <FormField label="Language">
                  <Select selectedOption={language} onChange={({ detail }) => setLanguage(detail.selectedOption)} options={LANGUAGES} placeholder="Select language" />
                </FormField>
                <FormField label="Complexity">
                  <Select selectedOption={complexity} onChange={({ detail }) => setComplexity(detail.selectedOption)} options={COMPLEXITY} placeholder="Select level" />
                </FormField>
              </ColumnLayout>
              <ColumnLayout columns={2}>
                <FormField label="Database Type">
                  <Select selectedOption={dbType} onChange={({ detail }) => setDbType(detail.selectedOption)} options={DB_TYPES} placeholder="Select type" />
                </FormField>
                <FormField label="Database Version">
                  <Select selectedOption={dbVersion} onChange={({ detail }) => setDbVersion(detail.selectedOption)} options={DB_VERSIONS} placeholder="Select version" />
                </FormField>
              </ColumnLayout>
              <ColumnLayout columns={2}>
                <FormField label="Instance Type">
                  <Select selectedOption={instanceType} onChange={({ detail }) => setInstanceType(detail.selectedOption)} options={INSTANCE_TYPES} placeholder="Select instance" />
                </FormField>
                <FormField label="AWS Region">
                  <Select selectedOption={region} onChange={({ detail }) => setRegion(detail.selectedOption)} options={REGIONS} placeholder="Select region" />
                </FormField>
              </ColumnLayout>
              <FormField label="Use Cases">
                <Multiselect selectedOptions={useCases} onChange={({ detail }) => setUseCases([...detail.selectedOptions])} options={USE_CASES} placeholder="Select use cases" />
              </FormField>
            </SpaceBetween>
          </Form>
        </Container>

        <Table
          header={<Header variant="h2" counter={`(${repos?.length ?? 0})`}>Generated Repositories</Header>}
          columnDefinitions={[
            { id: "name", header: "Name", cell: (item: any) => item.name },
            { id: "language", header: "Language", cell: (item: any) => item.language },
            { id: "dbType", header: "Database", cell: (item: any) => `${item.databaseType} ${item.databaseVersion}` },
            { id: "region", header: "Region", cell: (item: any) => item.awsRegion },
            {
              id: "status", header: "Status",
              cell: (item: any) => (
                <StatusIndicator type={item.status === "complete" ? "success" : item.status === "error" ? "error" : "in-progress"}>
                  {item.status} {item.status !== "complete" && item.status !== "error" ? `(${item.progress}%)` : ""}
                </StatusIndicator>
              ),
            },
            {
              id: "actions", header: "Actions",
              cell: (item: any) => (
                <Button variant="inline-link" disabled={item.status !== "complete"} onClick={() => handleDownload(item.id)}>
                  Download ZIP
                </Button>
              ),
            },
          ]}
          items={repos ?? []}
          loading={isLoading}
          loadingText="Loading repositories..."
          empty={<Box textAlign="center" padding="l">No repositories generated yet. Create one above.</Box>}
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
