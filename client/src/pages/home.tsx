import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/useAuth";

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: repos, isLoading } = useQuery<any[]>({ queryKey: ["/api/repositories"], enabled: !!user });
  const catalogRepos = (repos ?? []).filter((r: any) => r.status === "complete");

  const handleDownload = async (id: number) => {
    const res = await apiRequest("GET", `/api/repositories/${id}/zip`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `demo-${id}.zip`; a.click();
    window.URL.revokeObjectURL(url);
  };

  const chipColor = (name: string) => {
    if (/pgvector|vector/i.test(name)) return "b";
    if (/postgis|pgrouting|route/i.test(name)) return "g";
    if (/dynamo|single-table/i.test(name)) return "p";
    if (/neptune|graph|gremlin/i.test(name)) return "c";
    if (/redis|elasticache/i.test(name)) return "r";
    return "o";
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, <span style={{ background: "linear-gradient(120deg,var(--accent-from),var(--accent-to))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{user?.name || user?.email?.split("@")[0] || "there"}</span>
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>Here's what's happening with your demo pipeline.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/generator")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg>
          New Demo
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="label">Demos Generated</div><div className="v">{catalogRepos.length}</div></div>
        <div className="stat-card s2"><div className="label">Ready to Pitch</div><div className="v">{catalogRepos.length}</div></div>
        <div className="stat-card s3"><div className="label">Avg Build Time</div><div className="v">~8m</div></div>
        <div className="stat-card s4"><div className="label">Databases</div><div className="v">5</div></div>
      </div>

      <div className="section-head">
        <div><h2>🤖 AI Demo Catalog</h2><p>Ready-to-download demos built by the AI agent. No configuration needed.</p></div>
      </div>

      <div className="table-card">
        <div className="tbl-tools">
          <div className="left">
            <span className="filter-pill active">All <span className="n">{catalogRepos.length}</span></span>
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Name</th><th>Extension</th><th>Database</th><th>Region</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-soft)" }}>Loading...</td></tr>}
            {!isLoading && catalogRepos.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-soft)" }}>No demos yet. Generate one from the Generator.</td></tr>}
            {catalogRepos.map((r: any) => (
              <tr key={r.id}>
                <td><div className="ttl">{r.name}</div></td>
                <td><span className={`ext-chip ${chipColor((r.useCases as string[])?.[0] || r.name)}`}>{(r.useCases as string[])?.[0] || "—"}</span></td>
                <td><span className="mono">{r.databaseType} {r.databaseVersion}</span></td>
                <td><span className="mono">{r.awsRegion}</span></td>
                <td className="actions">
                  <button className="btn-ghost" onClick={() => handleDownload(r.id)}>⬇ Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
