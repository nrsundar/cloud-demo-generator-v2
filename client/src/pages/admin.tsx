import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import Textarea from "@cloudscape-design/components/textarea";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [specModal, setSpecModal] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [selectedRequestIds, setSelectedRequestIds] = useState<number[]>([]);
  const [selectedActionIds, setSelectedActionIds] = useState<number[]>([]);

  if (loading) {
    return (
      <ContentLayout header={<Header variant="h1">Admin Dashboard</Header>}>
        <Box textAlign="center" padding="xxl"><StatusIndicator type="loading">Loading...</StatusIndicator></Box>
      </ContentLayout>
    );
  }

  if (!user) {
    return (
      <ContentLayout header={<Header variant="h1">Admin Dashboard</Header>}>
        <Alert type="warning" action={<Button onClick={() => navigate("/auth")}>Sign In</Button>}>
          You must be signed in to access the admin dashboard.
        </Alert>
      </ContentLayout>
    );
  }

  if (!user.isAdmin) {
    return (
      <ContentLayout header={<Header variant="h1">Admin Dashboard</Header>}>
        <Alert type="error">Access denied. Your account ({user.email}) is not in the admin group.</Alert>
      </ContentLayout>
    );
  }

  const { data: analytics, isLoading } = useQuery<any>({ queryKey: ["/api/analytics/stats"], retry: false });
  const { data: repositories } = useQuery<any[]>({ queryKey: ["/api/repositories"], retry: false });
  const { data: feedback } = useQuery<any[]>({ queryKey: ["/api/feedback"], retry: false });
  const { data: demoRequests } = useQuery<any[]>({ queryKey: ["/api/admin/demo-requests"], retry: false });
  const { data: agentActions } = useQuery<any[]>({ queryKey: ["/api/admin/agent-actions"], retry: false });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("POST", `/api/admin/demo-requests/${id}/approve`, {}); },
    onSuccess: () => {
      setFlash([{ type: "success", content: "Request approved.", dismissible: true, onDismiss: () => setFlash([]) }]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-actions"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await apiRequest("POST", `/api/admin/demo-requests/${id}/reject`, { notes });
    },
    onSuccess: () => {
      setFlash([{ type: "info", content: "Request rejected.", dismissible: true, onDismiss: () => setFlash([]) }]);
      setRejectModal(null); setRejectNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => { await apiRequest("POST", "/api/admin/bulk-approve", { ids }); },
    onSuccess: (_, ids) => {
      setFlash([{ type: "success", content: `${ids.length} request(s) approved.`, dismissible: true, onDismiss: () => setFlash([]) }]);
      setSelectedRequestIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-actions"] });
    },
  });

  const approveActionMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("POST", `/api/admin/agent-actions/${id}/approve`, {}); },
    onSuccess: () => {
      setFlash([{ type: "success", content: "Action approved.", dismissible: true, onDismiss: () => setFlash([]) }]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-actions"] });
    },
  });

  const bulkApproveActionsMutation = useMutation({
    mutationFn: async (ids: number[]) => { await apiRequest("POST", "/api/admin/agent-actions/bulk-approve", { ids }); },
    onSuccess: (_, ids) => {
      setFlash([{ type: "success", content: `${ids.length} action(s) approved.`, dismissible: true, onDismiss: () => setFlash([]) }]);
      setSelectedActionIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-actions"] });
    },
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { pending: "grey", clarifying: "blue", spec_ready: "blue", approved: "green", rejected: "red", complete: "green" };
    return <Badge color={(colors[status] || "grey") as any}>{status}</Badge>;
  };

  return (
    <ContentLayout header={<Header variant="h1" description="Monitor usage, manage demo requests, and review agent proposals.">Admin Dashboard</Header>}>
      <SpaceBetween size="l">
        <Flashbar items={flash} />

        <ColumnLayout columns={4} variant="text-grid">
          <StatCard label="Total Downloads" value={analytics?.totalDownloads ?? 0} />
          <StatCard label="Unique Users" value={analytics?.uniqueUsers ?? 0} />
          <StatCard label="Generated Repos" value={repositories?.length ?? 0} />
          <StatCard label="Pending Requests" value={demoRequests?.filter((r: any) => r.status === "spec_ready").length ?? 0} />
        </ColumnLayout>

        <Tabs tabs={[
          {
            label: "Demo Requests",
            id: "demo-requests",
            content: (
              <Table
                selectionType="multi"
                selectedItems={(demoRequests ?? []).filter((r: any) => selectedRequestIds.includes(r.id))}
                onSelectionChange={({ detail }) => setSelectedRequestIds(detail.selectedItems.map((i: any) => i.id))}
                header={
                  <Header actions={
                    <Button disabled={selectedRequestIds.length === 0} loading={bulkApproveMutation.isPending}
                      onClick={() => bulkApproveMutation.mutate(selectedRequestIds)}>
                      Bulk Approve ({selectedRequestIds.length})
                    </Button>
                  }>Demo Requests</Header>
                }
                columnDefinitions={[
                  { id: "title", header: "Title", cell: (item: any) => item.title },
                  { id: "requester", header: "Requester", cell: (item: any) => item.requesterEmail },
                  { id: "extension", header: "Extension", cell: (item: any) => item.targetExtension || "—" },
                  { id: "status", header: "Status", cell: (item: any) => statusBadge(item.status) },
                  { id: "created", header: "Created", cell: (item: any) => new Date(item.createdAt).toLocaleDateString() },
                  { id: "actions", header: "Actions", cell: (item: any) => (
                    <SpaceBetween direction="horizontal" size="xs">
                      {item.spec && <Button variant="link" onClick={() => setSpecModal(item)}>View Spec</Button>}
                      {item.status === "spec_ready" && (
                        <>
                          <Button variant="primary" onClick={() => approveMutation.mutate(item.id)} loading={approveMutation.isPending}>Approve</Button>
                          <Button onClick={() => setRejectModal(item)}>Reject</Button>
                        </>
                      )}
                    </SpaceBetween>
                  )},
                ]}
                items={demoRequests ?? []}
                loading={isLoading}
                empty={<Box textAlign="center" padding="l">No demo requests yet.</Box>}
              />
            ),
          },
          {
            label: "Agent Actions",
            id: "agent-actions",
            content: (
              <Table
                selectionType="multi"
                selectedItems={(agentActions ?? []).filter((a: any) => selectedActionIds.includes(a.id))}
                onSelectionChange={({ detail }) => setSelectedActionIds(detail.selectedItems.map((i: any) => i.id))}
                header={
                  <Header actions={
                    <Button disabled={selectedActionIds.length === 0} loading={bulkApproveActionsMutation.isPending}
                      onClick={() => bulkApproveActionsMutation.mutate(selectedActionIds)}>
                      Bulk Approve ({selectedActionIds.length})
                    </Button>
                  }>Agent Actions</Header>
                }
                columnDefinitions={[
                  { id: "type", header: "Agent", cell: (item: any) => <Badge>{item.agentType}</Badge> },
                  { id: "trigger", header: "Trigger", cell: (item: any) => item.triggerSource || "—" },
                  { id: "status", header: "Status", cell: (item: any) => statusBadge(item.status) },
                  { id: "created", header: "Created", cell: (item: any) => new Date(item.createdAt).toLocaleDateString() },
                  { id: "actions", header: "Actions", cell: (item: any) => (
                    item.status === "proposed"
                      ? <Button variant="primary" onClick={() => approveActionMutation.mutate(item.id)}>Approve</Button>
                      : null
                  )},
                ]}
                items={agentActions ?? []}
                loading={isLoading}
                empty={<Box textAlign="center" padding="l">No agent actions yet.</Box>}
              />
            ),
          },
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
                  { id: "status", header: "Status", cell: (item: any) => (
                    <StatusIndicator type={item.status === "complete" ? "success" : item.status === "error" ? "error" : "in-progress"}>
                      {item.status}
                    </StatusIndicator>
                  )},
                  { id: "created", header: "Created", cell: (item: any) => new Date(item.createdAt).toLocaleDateString() },
                ]}
                items={repositories ?? []}
                loading={isLoading}
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
                empty={<Box textAlign="center" padding="l">No feedback yet.</Box>}
              />
            ),
          },
        ]} />

        {/* Spec Preview Modal */}
        {specModal && (
          <Modal visible={true} onDismiss={() => setSpecModal(null)} header={`Spec: ${specModal.title}`} size="large">
            <Box variant="code"><pre style={{ whiteSpace: "pre-wrap", maxHeight: "60vh", overflow: "auto" }}>{JSON.stringify(specModal.spec, null, 2)}</pre></Box>
          </Modal>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <Modal visible={true} onDismiss={() => setRejectModal(null)} header={`Reject: ${rejectModal.title}`}
            footer={<Box float="right"><SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => rejectMutation.mutate({ id: rejectModal.id, notes: rejectNotes })}>Reject</Button>
            </SpaceBetween></Box>}>
            <Textarea value={rejectNotes} onChange={({ detail }) => setRejectNotes(detail.value)} placeholder="Reason for rejection (optional)" rows={3} />
          </Modal>
        )}
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
