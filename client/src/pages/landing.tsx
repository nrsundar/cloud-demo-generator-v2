import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  useEffect(() => { if (user && !loading) navigate("/home"); }, [user, loading]);
  if (loading) return null;

  return (
    <>
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          Welcome to <span style={{ background: "linear-gradient(120deg,var(--accent-from),var(--accent-to))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>DemoForge</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, margin: "0 0 28px", maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
          AI-powered demo generation for AWS database services. Describe what you need — the agent builds a complete, deployable package.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/auth")}>Get Started →</button>
      </div>

      <div className="stats-row" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="stat-card"><div className="label">Databases</div><div className="v">5+</div></div>
        <div className="stat-card s2"><div className="label">Extensions</div><div className="v">12+</div></div>
        <div className="stat-card s3"><div className="label">Build Time</div><div className="v">~8m</div></div>
        <div className="stat-card s4"><div className="label">Output</div><div className="v">ZIP</div></div>
      </div>
    </>
  );
}
