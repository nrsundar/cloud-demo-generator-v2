import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import Modal from "@cloudscape-design/components/modal";
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
  { label: "PostgreSQL 17", value: "17" },
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
  { label: "Vector Database (pgVector)", value: "vector" },
  { label: "Geospatial Analytics (PostGIS)", value: "geospatial" },
  { label: "Network Routing (pgRouting)", value: "timeseries" },
  { label: "Full-text Search (pg_trgm)", value: "pg_trgm" },
  { label: "Job Scheduling (pg_cron)", value: "pg_cron" },
  { label: "Partition Management (pg_partman)", value: "pg_partman" },
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
  const [, navigate] = useLocation();
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

  // Split repos into AI-generated catalog and user-generated
  const catalogRepos = (repos ?? []).filter((r: any) => r.databaseType === "Aurora" && r.status === "complete");
  const userRepos = (repos ?? []).filter((r: any) => r.databaseType !== "Aurora");

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/repositories/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      setFlash([{ type: "success", content: "Demo removed from your list.", dismissible: true, onDismiss: () => setFlash([]) }]);
    },
  });

  const [cleanupModal, setCleanupModal] = useState<any>(null);
  const [deployModal, setDeployModal] = useState<any>(null);
  const [awsAccount, setAwsAccount] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-2");

  const handleCreate = () => {
    if (!useCases.length) {
      setFlash([{ type: "error", content: "Please select at least one use case.", dismissible: true, onDismiss: () => setFlash([]) }]);
      return;
    }
    const useCaseLabel = USE_CASES.find(u => u.value === useCases[0]?.value)?.label?.split("(")[0]?.trim() || "demo";
    createMutation.mutate({
      name: name || `${useCaseLabel.toLowerCase().replace(/\s+/g, "-")}-demo`,
      language: language?.value || "python",
      databaseType: dbType?.value || "Aurora",
      databaseVersion: dbVersion?.value || "16",
      instanceType: instanceType?.value || "db.t4g.medium",
      awsRegion: region?.value || "us-east-2",
      useCases: useCases.map((u: any) => u.value),
      complexityLevel: complexity?.value || "intermediate",
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
          description="Browse AI-generated demos or request a new one. Each package includes infrastructure, code, modules, and documentation."
        >
          Demo Generator
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Flashbar items={flash} />

        <Container header={<Header variant="h2" actions={<Button variant="primary" onClick={() => navigate("/demo-request")}>Request a New Demo</Button>}>Need a custom demo?</Header>}>
          <Box color="text-body-secondary">Describe what you need in plain English — the AI agent will ask clarifying questions, generate a spec, and build a complete package for any AWS database.</Box>
        </Container>

        {catalogRepos.length > 0 && (
          <Table
            header={<Header variant="h2" description="Ready-to-download demos built by our AI agent. No configuration needed." counter={`(${catalogRepos.length})`}>🤖 AI Demo Catalog</Header>}
            columnDefinitions={[
              { id: "name", header: "Name", cell: (item: any) => item.name },
              { id: "useCase", header: "Use Case", cell: (item: any) => (item.useCases as string[])?.[0] || "—" },
              { id: "dbType", header: "Database", cell: (item: any) => `${item.databaseType} ${item.databaseVersion}` },
              { id: "region", header: "Region", cell: (item: any) => item.awsRegion },
              {
                id: "actions", header: "",
                cell: (item: any) => (
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button variant="primary" iconName="download" onClick={() => handleDownload(item.id)}>Download</Button>
                    <Button onClick={() => setDeployModal(item)}>Deploy</Button>
                    <Button variant="link" onClick={() => setCleanupModal(item)}>Cleanup</Button>
                  </SpaceBetween>
                ),
              },
            ]}
            items={catalogRepos}
            loading={isLoading}
          />
        )}

        <Table
          header={<Header variant="h2" counter={`(${userRepos.length})`}>Your Generated Repositories</Header>}
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
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="inline-link" disabled={item.status !== "complete"} onClick={() => handleDownload(item.id)}>Download ZIP</Button>
                  <Button variant="inline-link" onClick={() => setCleanupModal(item)}>Cleanup</Button>
                </SpaceBetween>
              ),
            },
          ]}
          items={userRepos}
          loading={isLoading}
          loadingText="Loading repositories..."
          empty={<Box textAlign="center" padding="l">No repositories generated yet. Create one above or download from the AI Catalog.</Box>}
        />

        {deployModal && (
          <Modal visible={true} onDismiss={() => setDeployModal(null)} header={`Deploy: ${deployModal.name}`}
            footer={<Box float="right"><Button variant="link" onClick={() => setDeployModal(null)}>Close</Button></Box>}>
            <SpaceBetween size="m">
              <FormField label="AWS Account ID" description="The 12-digit account where you want to deploy this demo">
                <Input value={awsAccount} onChange={({ detail }) => setAwsAccount(detail.value)} placeholder="123456789012" />
              </FormField>
              <FormField label="Region">
                <Input value={awsRegion} onChange={({ detail }) => setAwsRegion(detail.value)} placeholder="us-east-2" />
              </FormField>
              <Box variant="h3">Option 1: CloudFormation Console Launch</Box>
              <Button variant="primary" iconName="external" onClick={() => {
                const url = `https://${awsRegion}.console.aws.amazon.com/cloudformation/home?region=${awsRegion}#/stacks/create/review?stackName=${deployModal.name}`;
                window.open(url, "_blank");
              }}>Open CloudFormation Console</Button>
              <Box color="text-body-secondary">Upload the <code>cloudformation/main.yaml</code> from the downloaded ZIP.</Box>
              <Box variant="h3">Option 2: CLI Deploy</Box>
              <Box variant="code"><pre>{`# Download and deploy
aws cloudformation create-stack \\
  --stack-name ${deployModal.name} \\
  --template-body file://cloudformation/main.yaml \\
  --parameters ParameterKey=DBPassword,ParameterValue=<password> \\
  --capabilities CAPABILITY_NAMED_IAM \\
  --region ${awsRegion}${awsAccount ? ` \\
  --profile <profile-for-${awsAccount}>` : ""}`}</pre></Box>
            </SpaceBetween>
          </Modal>
        )}

        {cleanupModal && (
          <Modal visible={true} onDismiss={() => setCleanupModal(null)} header={`Cleanup: ${cleanupModal.name}`}
            footer={<Box float="right"><SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setCleanupModal(null)}>Close</Button>
              <Button variant="primary" onClick={() => { deleteMutation.mutate(cleanupModal.id); setCleanupModal(null); }}>Remove from list</Button>
            </SpaceBetween></Box>}>
            <SpaceBetween size="m">
              <Box>To delete the deployed stack from your AWS account, run:</Box>
              <Box variant="code"><pre>{`aws cloudformation delete-stack \\
  --stack-name ${cleanupModal.name} \\
  --region ${cleanupModal.awsRegion || "us-east-2"}`}</pre></Box>
              <Box>To verify deletion is complete:</Box>
              <Box variant="code"><pre>{`aws cloudformation wait stack-delete-complete \\
  --stack-name ${cleanupModal.name} \\
  --region ${cleanupModal.awsRegion || "us-east-2"}`}</pre></Box>
              <Box color="text-body-secondary">This will delete the Aurora cluster, VPC, and all associated resources. Click "Remove from list" to also remove it from this dashboard.</Box>
            </SpaceBetween>
          </Modal>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
