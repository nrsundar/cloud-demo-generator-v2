import React, { useState } from "react";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Alert from "@cloudscape-design/components/alert";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  if (user) { navigate("/home"); return null; }

  const showError = (msg: string) => setFlash([{ type: "error", content: msg, dismissible: true, onDismiss: () => setFlash([]) }]);

  const handleSignIn = async () => {
    if (!email || !password) return showError("Email and password required.");
    setLoading(true);
    try { await login(email, password); navigate("/home"); }
    catch (e: any) { showError(e.message || "Sign in failed."); }
    finally { setLoading(false); }
  };

  return (
    <ContentLayout header={<Header variant="h1" description="Sign in to generate and download cloud infrastructure demos.">Welcome to DemoForge</Header>}>
      <SpaceBetween size="l">
        <Flashbar items={flash} />
        <ColumnLayout columns={2}>
          <Container header={<Header variant="h2">Sign In</Header>}>
            <SpaceBetween size="l">
              <Form actions={<Button variant="primary" loading={loading} onClick={handleSignIn}>Sign In</Button>}>
                <SpaceBetween size="l">
                  <FormField label="Email"><Input value={email} onChange={({ detail }) => setEmail(detail.value)} type="email" placeholder="alias@amazon.com" /></FormField>
                  <FormField label="Password"><Input value={password} onChange={({ detail }) => setPassword(detail.value)} type="password" /></FormField>
                </SpaceBetween>
              </Form>
              <Alert type="info">Accounts are created by an administrator. Contact the team if you need access.</Alert>
            </SpaceBetween>
          </Container>
          <Container header={<Header variant="h2">Why Sign In?</Header>}>
            <SpaceBetween size="m">
              <Box><Box variant="h4">📦 Generate Demo Repositories</Box><Box color="text-body-secondary">Configure and download complete PostgreSQL demo packages with CloudFormation, application code, and learning modules.</Box></Box>
              <Box><Box variant="h4">⚡ Deploy in Minutes</Box><Box color="text-body-secondary">Each demo includes a one-command CloudFormation deployment — Aurora PostgreSQL, VPC, bastion host, everything.</Box></Box>
              <Box><Box variant="h4">🤖 AI-Powered Demo Requests</Box><Box color="text-body-secondary">Request custom demos — our AI agent generates clarifying questions, builds a spec, and produces a full template on approval.</Box></Box>
              <Box><Box variant="h4">📊 Admin Dashboard</Box><Box color="text-body-secondary">Track downloads, monitor generated repositories, and manage agent proposals.</Box></Box>
            </SpaceBetween>
          </Container>
        </ColumnLayout>
      </SpaceBetween>
    </ContentLayout>
  );
}
