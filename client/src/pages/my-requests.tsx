import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Table from "@cloudscape-design/components/table";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import FormField from "@cloudscape-design/components/form-field";
import Textarea from "@cloudscape-design/components/textarea";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { apiRequest } from "../lib/queryClient";
import { API_BASE } from "../lib/config";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";

const STATUS_MAP: Record<string, { type: any; label: string }> = {
  pending: { type: "pending", label: "Pending" },
  clarifying: { type: "info", label: "Needs Your Input" },
  generating_spec: { type: "in-progress", label: "Generating Spec" },
  spec_ready: { type: "in-progress", label: "Awaiting Admin Review" },
  approved: { type: "success", label: "Approved" },
  generating: { type: "in-progress", label: "Generating Demo" },
  complete: { type: "success", label: "Complete" },
  rejected: { type: "error", label: "Rejected" },
};

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const { data: requests, isLoading } = useQuery<any[]>({
    queryKey: ["/api/demo-requests"],
    enabled: !!user,
  });

  const answerMutation = useMutation({
    mutationFn: async ({ id, answers }: { id: number; answers: Record<string, string> }) => {
      const res = await apiRequest("POST", `/api/demo-requests/${id}/answers`, { answers });
      return res.json();
    },
    onSuccess: () => {
      setFlash([{ type: "success", content: "Answers submitted! AI is generating the demo spec. An admin will review it.", dismissible: true, onDismiss: () => setFlash([]) }]);
      setSelectedRequest(null);
      setAnswers({});
      queryClient.invalidateQueries({ queryKey: ["/api/demo-requests"] });
    },
    onError: (err: any) => {
      setFlash([{ type: "error", content: err.message || "Failed to submit answers.", dismissible: true, onDismiss: () => setFlash([]) }]);
    },
  });

  if (!user) {
    return (
      <ContentLayout header={<Header variant="h1">My Requests</Header>}>
        <Box textAlign="center" padding="xxl">
          <Button onClick={() => navigate("/auth")}>Sign in to view your requests</Button>
        </Box>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout header={<Header variant="h1" description="Track your demo requests and answer AI-generated clarifying questions.">My Requests</Header>}>
      <SpaceBetween size="l">
        <Flashbar items={flash} />
        <Table
          columnDefinitions={[
            { id: "title", header: "Title", cell: (item: any) => item.title },
            { id: "extension", header: "Extension", cell: (item: any) => item.targetExtension || "—" },
            { id: "status", header: "Status", cell: (item: any) => {
              const s = STATUS_MAP[item.status] || { type: "pending", label: item.status };
              return <StatusIndicator type={s.type}>{s.label}</StatusIndicator>;
            }},
            { id: "created", header: "Created", cell: (item: any) => new Date(item.createdAt).toLocaleDateString() },
            { id: "action", header: "Action", cell: (item: any) => (
              item.status === "clarifying" && item.clarifyingQuestions?.length
                ? <Button variant="primary" onClick={() => { setSelectedRequest(item); setAnswers({}); }}>Answer Questions</Button>
                : item.status === "complete"
                ? <Button variant="primary" iconName="download" href={`${API_BASE}/api/demo-requests/${item.id}/download`}>Download</Button>
                : null
            )},
          ]}
          items={requests ?? []}
          loading={isLoading}
          loadingText="Loading requests..."
          empty={<Box textAlign="center" padding="l">No requests yet. <Button variant="link" onClick={() => navigate("/demo-request")}>Submit one</Button></Box>}
        />

        {selectedRequest && (
          <Modal
            visible={true}
            onDismiss={() => setSelectedRequest(null)}
            header={`Clarifying Questions — ${selectedRequest.title}`}
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="link" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                  <Button variant="primary" loading={answerMutation.isPending}
                    disabled={Object.keys(answers).length < (selectedRequest.clarifyingQuestions?.length || 0)}
                    onClick={() => answerMutation.mutate({ id: selectedRequest.id, answers })}>
                    Submit Answers
                  </Button>
                </SpaceBetween>
              </Box>
            }
          >
            <SpaceBetween size="l">
              {selectedRequest.clarifyingQuestions?.map((q: string, i: number) => (
                <FormField key={i} label={q}>
                  <Textarea value={answers[q] || ""} onChange={({ detail }) => setAnswers(prev => ({ ...prev, [q]: detail.value }))} rows={2} />
                </FormField>
              ))}
            </SpaceBetween>
          </Modal>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
