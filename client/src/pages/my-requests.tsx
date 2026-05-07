import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { API_BASE } from "../lib/config";
import { useAuth } from "../hooks/useAuth";

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  pending: { cls: "draft", label: "DRAFT" },
  clarifying: { cls: "review", label: "NEEDS ANSWERS" },
  generating_spec: { cls: "building", label: "BUILDING SPEC" },
  spec_ready: { cls: "pending", label: "AWAITING REVIEW" },
  approved: { cls: "building", label: "APPROVED" },
  generating: { cls: "building", label: "GENERATING" },
  complete: { cls: "ready", label: "READY" },
  rejected: { cls: "failed", label: "REJECTED" },
};

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: requests, isLoading } = useQuery<any[]>({ queryKey: ["/api/demo-requests"], enabled: !!user });

  const answerMutation = useMutation({
    mutationFn: async ({ id, answers }: { id: number; answers: Record<string, string> }) => {
      const res = await apiRequest("POST", `/api/demo-requests/${id}/answers`, { answers });
      return res.json();
    },
    onSuccess: () => { setSelectedRequest(null); setAnswers({}); queryClient.invalidateQueries({ queryKey: ["/api/demo-requests"] }); },
  });

  if (!user) return <div style={{ textAlign: "center", padding: 60 }}><button className="btn btn-primary" onClick={() => navigate("/auth")}>Sign in to view requests</button></div>;

  const items = requests || [];
  const awaiting = items.filter(r => r.status === "clarifying").length;
  const ready = items.filter(r => r.status === "complete").length;
  const building = items.filter(r => ["generating_spec", "generating", "approved"].includes(r.status)).length;

  const chipColor = (ext: string) => {
    if (/pgvector|vector/i.test(ext)) return "b";
    if (/postgis|pgrouting/i.test(ext)) return "g";
    if (/dynamo|single-table/i.test(ext)) return "p";
    if (/neptune|graph/i.test(ext)) return "c";
    if (/timescale|cron/i.test(ext)) return "o";
    return "b";
  };

  return (
    <>
      <div className="page-head">
        <div><h1>My Requests</h1><p>Track every demo you've requested — from queued to ready-to-pitch.</p></div>
        <button className="btn btn-primary" onClick={() => navigate("/generator")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg>
          New request
        </button>
      </div>

      {/* Info banner explaining the flow */}
      <div className="info-banner">
        <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <div>
          <strong>How it works:</strong> After you answer the clarifying questions, the AI agent generates a full demo spec → an admin reviews and approves it → the system builds your complete package (infrastructure, code, modules, docs). You'll see the status update here in real-time. Ready demos can be downloaded as a ZIP.
        </div>
      </div>

      {/* Summary tiles */}
      <div className="tiles">
        <div className="tile"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div className="v">{items.length}</div><div className="lbl">Total</div></div></div>
        <div className="tile t2"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div className="v">{awaiting}</div><div className="lbl">Awaiting answers</div></div></div>
        <div className="tile t3"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><div><div className="v">{ready}</div><div className="lbl">Ready</div></div></div>
        <div className="tile t4"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/></svg></div><div><div className="v">{building}</div><div className="lbl">Building</div></div></div>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="tbl-tools">
          <div className="left">
            <span className="filter-pill active">All <span className="n">{items.length}</span></span>
            {awaiting > 0 && <span className="filter-pill">Awaiting <span className="n">{awaiting}</span></span>}
            {ready > 0 && <span className="filter-pill">Ready <span className="n">{ready}</span></span>}
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th style={{ width: "32%" }}>Title</th><th>Extension</th><th>Database</th><th>Status</th><th>Created</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-soft)" }}>Loading...</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-soft)" }}>No requests yet. <span style={{ color: "var(--primary)", cursor: "pointer" }} onClick={() => navigate("/generator")}>Create one</span></td></tr>}
            {items.map((r: any) => {
              const st = STATUS_MAP[r.status] || { cls: "draft", label: r.status };
              const ext = r.targetExtension || "—";
              const db = r.description?.match(/Aurora|DynamoDB|Neptune|ElastiCache|DocumentDB|PostgreSQL|MySQL/i)?.[0] || "Aurora PostgreSQL";
              return (
                <tr key={r.id}>
                  <td>
                    <div className="ttl">{r.title}</div>
                    <div className="sub">{r.customerIndustry || ""}{r.complexity ? ` · ${r.complexity}` : ""}</div>
                  </td>
                  <td><span className={`ext-chip ${chipColor(ext)}`}>{ext}</span></td>
                  <td><span className="mono">{db}</span></td>
                  <td><span className={`badge-status ${st.cls}`}><span className="led"></span>{st.label}</span></td>
                  <td><span className="mono">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</span></td>
                  <td className="actions">
                    {r.status === "clarifying" && r.clarifyingQuestions?.length ? (
                      <button className="answer-btn" onClick={() => { setSelectedRequest(r); setAnswers({}); }}>Answer Questions <span style={{ background: "rgba(255,255,255,.2)", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>{r.clarifyingQuestions.length}</span></button>
                    ) : r.status === "complete" ? (
                      <a className="btn-ghost" href={`${API_BASE}/api/demo-requests/${r.id}/download`}>⬇ Download</a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Answer Questions Modal */}
      {selectedRequest && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelectedRequest(null); }}>
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3>✦ A few clarifying questions</h3>
                <div className="sub">The AI agent needs more info before it can build your demo.</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                  <span className={`ext-chip ${chipColor(selectedRequest.targetExtension || "")}`}>{selectedRequest.targetExtension || "demo"}</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedRequest.title}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {selectedRequest.clarifyingQuestions?.map((q: string, i: number) => (
                <div key={i} className="q-block">
                  <span className="q-num">QUESTION {String(i + 1).padStart(2, "0")}</span>
                  <p className="q-text">{q}</p>
                  <textarea className="textarea" value={answers[q] || ""} onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))} placeholder="Type your answer..." />
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                <span>{Object.values(answers).filter(v => v.trim()).length} / {selectedRequest.clarifyingQuestions?.length || 0}</span>
                <div style={{ width: 120, height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg,var(--accent-from),var(--accent-to))", borderRadius: 999, width: `${(Object.values(answers).filter(v => v.trim()).length / (selectedRequest.clarifyingQuestions?.length || 1)) * 100}%` }}></div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setSelectedRequest(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ padding: "9px 18px", fontSize: 13 }} disabled={answerMutation.isPending || Object.values(answers).filter(v => v.trim()).length < (selectedRequest.clarifyingQuestions?.length || 0)} onClick={() => answerMutation.mutate({ id: selectedRequest.id, answers })}>
                  {answerMutation.isPending ? "Submitting..." : "Submit answers →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
