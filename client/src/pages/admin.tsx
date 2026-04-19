import React from "react";
import { useQuery } from "@tanstack/react-query";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Table from "@cloudscape-design/components/table";
import Tabs from "@cloudscape-design/components/tabs";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Badge from "@cloudscape-design/components/badge";

export default function AdminPage() {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/analytics/stats"],
    retry: false,
  });

  const { data: repositories } = useQuery<any[]>({
    queryKey: ["/api/repositories"],
    retry: false,
  });

  const { data: feedback } = useQuery<any[]>({
    queryKey: ["/api/feedback"],
    retry: false,
  });

  return (
    <ContentLayout
      header={<Header variant="h1" description="Analytics and management for Cloud Demo Generator v3.">Admin Dashboard</Header>}
    >
      <SpaceBetween size="l">
        <ColumnLayout columns={4} variant="text-grid">
          <StatCard label="Total Downloads" value={analytics?.totalDownloads ?? 0} />
          <StatCard label="Unique Users" value={analytics?.uniqueUsers ?? 0} />
          <StatCard label="Generated Repos" value={repositories?.length ?? 0} />
          <StatCard label="Feedback Requests" value={analytics?.feedbackCount ?? 0} />
        </ColumnLayout>

        <Tabs
          tabs={[
            {
              label: "Repositories",
              id: "repos",
              content: (
                <Table
                  columnDefinitions={[
                    { id: "name", header: "Name", cell: (item: any) => item.name },
                    { id: "language", header: "Language", cell: (item: any) => item.language },
                    { id: "dbType", header: "Database", cell: (item: any) => `${item.databaseType} ${item.databaseVersion}` },
                    { id: "region", header: "Region", cell: (item: any) => item.awsRegion },
                    {
                      id: "status", header: "Status",
                      cell: (item: any) => (
                        <StatusIndicator type={item.status === "complete" ? "success" : item.status === "error" ? "error" : "in-progress"}>
                          {item.status}
                        </StatusIndicator>
                      ),
                    },
                    { id: "created", header: "Created", cell: (item: any) => new Date(item.createdAt).toLocaleDateString() },
                  ]}
                  items={repositories ?? []}
                  loading={isLoading}
                  loadingText="Loading..."
                  empty={<Box textAlign="center" padding="l">No repositories yet.</Box>}
                />
              ),
            },
            {
              label: "Feedback",
              id: "feedback",
              content: (
                <Table
                  columnDefinitions={[
                    { id: "email", header: "Email", cell: (item: any) => item.email },
                    { id: "demoType", header: "Demo Type", cell: (item: any) => item.demoType },
                    { id: "priority", header: "Priority", cell: (item: any) => <Badge color={item.priority === "urgent" ? "red" : item.priority === "high" ? "blue" : "grey"}>{item.priority}</Badge> },
                    { id: "message", header: "Message", cell: (item: any) => item.message?.slice(0, 80) + (item.message?.length > 80 ? "..." : "") },
                    { id: "created", header: "Created", cell: (item: any) => new Date(item.createdAt).toLocaleDateString() },
                  ]}
                  items={feedback ?? []}
                  loading={isLoading}
                  loadingText="Loading..."
                  empty={<Box textAlign="center" padding="l">No feedback yet.</Box>}
                />
              ),
            },
            {
              label: "Use Cases",
              id: "usecases",
              content: (
                <Table
                  columnDefinitions={[
                    { id: "useCase", header: "Use Case", cell: (item: any) => item.useCase },
                    { id: "count", header: "Count", cell: (item: any) => item.count },
                  ]}
                  items={analytics?.topUseCases ?? []}
                  loading={isLoading}
                  loadingText="Loading..."
                  empty={<Box textAlign="center" padding="l">No data yet.</Box>}
                />
              ),
            },
          ]}
        />
      </SpaceBetween>
    </ContentLayout>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Container>
      <Box variant="awsui-key-label">{label}</Box>
      <Box variant="h1">{value}</Box>
    </Container>
  );
}
