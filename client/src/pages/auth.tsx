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
import Tabs from "@cloudscape-design/components/tabs";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Alert from "@cloudscape-design/components/alert";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, login, register, confirm } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  if (user) { navigate("/home"); return null; }

  const showError = (msg: string) => setFlash([{ type: "error", content: msg, dismissible: true, onDismiss: () => setFlash([]) }]);
  const showSuccess = (msg: string) => setFlash([{ type: "success", content: msg, dismissible: true, onDismiss: () => setFlash([]) }]);

  const handleSignIn = async () => {
    if (!email || !password) return showError("Email and password required.");
    setLoading(true);
    try { await login(email, password); navigate("/home"); }
    catch (e: any) { showError(e.message || "Sign in failed."); }
    finally { setLoading(false); }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) return showError("All fields required.");
    if (!email.endsWith("@amazon.com")) return showError("Only @amazon.com email addresses can register.");
    setLoading(true);
    try { await register(email, password, name); setPendingEmail(email); setTab("confirm"); showSuccess("Account created! Check your email for a verification code."); }
    catch (e: any) { showError(e.message || "Sign up failed."); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!code) return showError("Verification code required.");
    setLoading(true);
    try { await confirm(pendingEmail || email, code); showSuccess("Email verified! You can now sign in."); setTab("signin"); }
    catch (e: any) { showError(e.message || "Verification failed."); }
    finally { setLoading(false); }
  };

  return (
    <ContentLayout header={<Header variant="h1" description="Sign in to generate and download cloud infrastructure demos.">Welcome to Cloud Demo Generator</Header>}>
      <SpaceBetween size="l">
        <Flashbar items={flash} />
        <ColumnLayout columns={2}>
          <Container>
            <Tabs activeTabId={tab} onChange={({ detail }) => setTab(detail.activeTabId)} tabs={[
              { id: "signin", label: "Sign In", content: (
                <Box padding={{ top: "s" }}>
                  <Form actions={<SpaceBetween direction="horizontal" size="xs"><Button variant="primary" loading={loading} onClick={handleSignIn}>Sign In</Button><Button variant="link" onClick={() => setTab("signup")}>Create account</Button></SpaceBetween>}>
                    <SpaceBetween size="l">
                      <FormField label="Email"><Input value={email} onChange={({ detail }) => setEmail(detail.value)} type="email" placeholder="alias@amazon.com" /></FormField>
                      <FormField label="Password"><Input value={password} onChange={({ detail }) => setPassword(detail.value)} type="password" /></FormField>
                    </SpaceBetween>
                  </Form>
                </Box>
              )},
              { id: "signup", label: "Create Account", content: (
                <Box padding={{ top: "s" }}>
                  <SpaceBetween size="l">
                    <Alert type="info">Registration is restricted to <strong>@amazon.com</strong> email addresses.</Alert>
                    <Form actions={<SpaceBetween direction="horizontal" size="xs"><Button variant="primary" loading={loading} onClick={handleSignUp}>Create Account</Button><Button variant="link" onClick={() => setTab("signin")}>Already have an account?</Button></SpaceBetween>}>
                      <SpaceBetween size="l">
                        <FormField label="Full Name"><Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="Your Name" /></FormField>
                        <FormField label="Email" constraintText="Must be an @amazon.com address"><Input value={email} onChange={({ detail }) => setEmail(detail.value)} type="email" placeholder="alias@amazon.com" /></FormField>
                        <FormField label="Password" description="Min 8 chars, uppercase, lowercase, number"><Input value={password} onChange={({ detail }) => setPassword(detail.value)} type="password" /></FormField>
                      </SpaceBetween>
                    </Form>
                  </SpaceBetween>
                </Box>
              )},
              { id: "confirm", label: "Verify Email", content: (
                <Box padding={{ top: "s" }}>
                  <Form actions={<Button variant="primary" loading={loading} onClick={handleConfirm}>Verify</Button>}>
                    <SpaceBetween size="l">
                      <FormField label="Email"><Input value={pendingEmail || email} onChange={({ detail }) => setPendingEmail(detail.value)} type="email" /></FormField>
                      <FormField label="Verification Code" description="Check your @amazon.com email"><Input value={code} onChange={({ detail }) => setCode(detail.value)} placeholder="123456" /></FormField>
                    </SpaceBetween>
                  </Form>
                </Box>
              )},
            ]} />
          </Container>
          <Container header={<Header variant="h2">Why Sign In?</Header>}>
            <SpaceBetween size="m">
              <Box><Box variant="h4">📦 Generate Demo Repositories</Box><Box color="text-body-secondary">Configure and download complete PostgreSQL demo packages with CloudFormation, application code, and learning modules.</Box></Box>
              <Box><Box variant="h4">⚡ Deploy in Minutes</Box><Box color="text-body-secondary">Each demo includes a one-command CloudFormation deployment — Aurora PostgreSQL, VPC, bastion host, everything.</Box></Box>
              <Box><Box variant="h4">🔧 3 Use Cases Available</Box><Box color="text-body-secondary">pgvector (hybrid search), PostGIS (geospatial), and pgRouting (transportation routing).</Box></Box>
              <Box><Box variant="h4">📊 Admin Dashboard</Box><Box color="text-body-secondary">Track downloads, monitor generated repositories, and manage demo requests.</Box></Box>
            </SpaceBetween>
          </Container>
        </ColumnLayout>
      </SpaceBetween>
    </ContentLayout>
  );
}
