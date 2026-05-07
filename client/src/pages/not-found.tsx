import React from "react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>404</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 15, margin: "0 0 24px" }}>Page not found.</p>
      <button className="btn btn-primary" onClick={() => navigate("/home")}>← Back to Dashboard</button>
    </div>
  );
}
