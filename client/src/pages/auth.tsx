import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";
import "../styles/shell.css";

export default function AuthPage() {
  const { user, login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) { navigate("/home"); return null; }

  const handleSignIn = async () => {
    if (!email || !password) return setError("Email and password required.");
    setLoading(true); setError("");
    try { await login(email, password); navigate("/home"); }
    catch (e: any) { setError(e.message || "Sign in failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0b1020 0%, #0f1735 100%)", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, #3b82f6, #7c3aed)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 20, margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(124,58,237,0.5)" }}>DF</div>
          <h1 style={{ color: "#fff", margin: "0 0 6px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>Welcome to DemoForge</h1>
          <p style={{ color: "#93a3bd", margin: 0, fontSize: 14 }}>AI-powered demo generation for AWS databases.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Sign In</h2>

          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alias@amazon.com"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-strong)", borderRadius: 10, fontSize: 14, fontFamily: "inherit" }}
              onKeyDown={e => { if (e.key === "Enter") handleSignIn(); }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-strong)", borderRadius: 10, fontSize: 14, fontFamily: "inherit" }}
              onKeyDown={e => { if (e.key === "Enter") handleSignIn(); }} />
          </div>

          <button className="btn btn-primary" onClick={handleSignIn} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <div style={{ marginTop: 18, padding: 12, background: "linear-gradient(135deg,#eff6ff,#f5f3ff)", border: "1px solid #c7d2fe", borderRadius: 10, fontSize: 12, color: "#4338ca", lineHeight: 1.5 }}>
            <strong>ℹ Accounts are created by an administrator.</strong> Contact the team if you need access.
          </div>
        </div>
      </div>
    </div>
  );
}
