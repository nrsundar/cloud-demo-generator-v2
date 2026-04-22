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
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  if (user) {
    navigate("/home");
    return null;
  }

  const handleSignIn = async () => {
    if (!email || !password) {
      setFlash([{ type: "error", content: "Email and password required.", dismissible: true, onDismiss: () => setFlash([]) }]);
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate("/home");
    } catch (e: any) {
      setFlash([{ type: "error", content: e.message || "Sign in failed.", dismissible: true, onDismiss: () => setFlash([]) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="Sign in to generate and download cloud infrastructure demos.">
          Welcome to Cloud Demo Generator
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Flashbar items={flash} />
        <ColumnLayout columns={2}>
          <Container header={<Header variant="h2">Sign In</Header>}>
            <Form actions={<Button variant="primary" loading={loading} onClick={handleSignIn}>Sign In</Button>}>
              <SpaceBetween size="l">
                <FormField label="Email">
                  <Input value={email} onChange={({ detail }) => setEmail(detail.value)} type="email" placeholder="you@example.com" />
                </FormField>
                <FormField label="Password">
                  <Input value={password} onChange={({ detail }) => setPassword(detail.value)} type="password" placeholder="Enter your password" />
                </FormField>
              </SpaceBetween>
            </Form>
            <Box padding={{ top: "s" }} color="text-body-secondary" fontSize="body-s">
              Contact your administrator to request an account.
            </Box>
          </Container>

          <Container header={<Header variant="h2">Why Sign In?</Header>}>
            <SpaceBetween size="m">
              <Box>
                <Box variant="h4">📦 Generate Demo Repositories</Box>
                <Box color="text-body-secondary">Configure and download complete PostgreSQL demo packages with CloudFormation, application code, and learning modules.</Box>
              </Box>
              <Box>
                <Box variant="h4">⚡ Deploy in Minutes</Box>
                <Box color="text-body-secondary">Each demo includes a one-command CloudFormation deployment — Aurora PostgreSQL, VPC, bastion host, everything.</Box>
              </Box>
              <Box>
                <Box variant="h4">🔧 3 Use Cases Available</Box>
                <Box color="text-body-secondary">pgvector (hybrid search), PostGIS (geospatial), and pgRouting (transportation routing) — with more coming soon.</Box>
              </Box>
            </SpaceBetween>
          </Container>
        </ColumnLayout>
      </SpaceBetween>
    </ContentLayout>
  );
}
