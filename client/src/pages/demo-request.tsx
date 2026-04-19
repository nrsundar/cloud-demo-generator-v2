import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import Select from "@cloudscape-design/components/select";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Container from "@cloudscape-design/components/container";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { apiRequest } from "../lib/queryClient";

const DEMO_TYPES = [
  { label: "Customer Presentation", value: "customer-presentation" },
  { label: "Technical Deep Dive", value: "technical-deep-dive" },
  { label: "Proof of Concept", value: "proof-of-concept" },
  { label: "Custom Use Case", value: "custom-use-case" },
];

const PRIORITY_LEVELS = [
  { label: "Urgent (24 hours)", value: "urgent" },
  { label: "High (2-3 days)", value: "high" },
  { label: "Normal (1 week)", value: "normal" },
  { label: "Low (2+ weeks)", value: "low" },
];

export default function DemoRequestPage() {
  const [email, setEmail] = useState("");
  const [demoType, setDemoType] = useState<any>(null);
  const [priority, setPriority] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ ...data, status: "pending" }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to submit request");
      return res.json();
    },
    onSuccess: () => {
      setFlash([{ type: "success", content: "Demo request submitted. We'll contact you within 24 hours.", dismissible: true, onDismiss: () => setFlash([]) }]);
      setEmail(""); setDemoType(null); setPriority(null); setMessage("");
    },
    onError: () => {
      setFlash([{ type: "error", content: "Submission failed. Please try again.", dismissible: true, onDismiss: () => setFlash([]) }]);
    },
  });

  const handleSubmit = () => {
    if (!email || !demoType || !priority || !message) {
      setFlash([{ type: "error", content: "Please fill in all required fields.", dismissible: true, onDismiss: () => setFlash([]) }]);
      return;
    }
    submitMutation.mutate({ email, demoType: demoType.value, priority: priority.value, message });
  };

  return (
    <ContentLayout
      header={<Header variant="h1" description="Request a custom cloud infrastructure demonstration.">Request Demo</Header>}
    >
      <SpaceBetween size="l">
        <Flashbar items={flash} />
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <Form
            actions={
              <Button variant="primary" loading={submitMutation.isPending} onClick={handleSubmit}>
                Submit Request
              </Button>
            }
          >
            <Container header={<Header variant="h2">Demo Request Details</Header>}>
              <SpaceBetween size="l">
                <FormField label="Contact Email">
                  <Input value={email} onChange={({ detail }) => setEmail(detail.value)} placeholder="you@example.com" type="email" />
                </FormField>
                <FormField label="Demo Type">
                  <Select selectedOption={demoType} onChange={({ detail }) => setDemoType(detail.selectedOption)} options={DEMO_TYPES} placeholder="Select demo type" />
                </FormField>
                <FormField label="Priority">
                  <Select selectedOption={priority} onChange={({ detail }) => setPriority(detail.selectedOption)} options={PRIORITY_LEVELS} placeholder="Select priority" />
                </FormField>
                <FormField label="Requirements">
                  <Textarea value={message} onChange={({ detail }) => setMessage(detail.value)} placeholder="Describe your specific requirements..." rows={6} />
                </FormField>
              </SpaceBetween>
            </Container>
          </Form>
        </form>
      </SpaceBetween>
    </ContentLayout>
  );
}
