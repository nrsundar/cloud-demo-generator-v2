import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/useAuth";

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  pending: { cls: "pending", label: "PENDING" },
  clarifying: { cls: "review", label: "CLARIFYING" },
  generating_spec: { cls: "building", label: "BUILDING SPEC" },
  spec_ready: { cls: "review", label: "SPEC READY" },
  approved: { cls: "building", label: "APPROVED" },
  generating: { cls: "building", label: "GENERATING" },
  complete: { cls: "ready", label: "COMPLETE" },
  rejected: { cls: "failed", label: "REJECTED" },
  proposed: { cls: "review", label: "PROPOSED" },
  resolved: { cls: "ready", label: "RESOLVED" },
};

const chipColor = (ext: string) => {
  if (!ext) return "b";
  if (/pgvector|vector/i.test(ext)) return "b";
  if (/postgis|pgrouting/i.test(ext)) return "g";
  if (/dynamo|single-table/i.test(ext)) return "p";
  if (/neptune|graph|gremlin/i.test(ext)) return "c";
  if (/timescale|cron/i.test(ext)) return "o";
  if (/redis/i.test(ext)) return "r";
  return "b";
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionIds, setActionIds] = useState<number[]>([]);
  const [viewSpec, setViewSpec] = useState<any>(null);
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [answerFor, setAnswerFor] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: stats } = useQuery<any>({ queryKey: ["/api/analytics/stats"], retry: false, enabled: !!user?.isAdmin });
  const { data: repos } = useQuery<any[]>({ queryKey: ["/api/repositories"], retry: false, enabled: !!user?.isAdmin });
  const { data: feedback } = useQuery<any[]>({ queryKey: ["/api/feedback"], retry: false, enabled: !!user?.isAdmin });
  const { data: requests } = useQuery<any[]>({ queryKey: ["/api/admin/demo-requests"], retry: false, enabled: !!user?.isAdmin });
  const { data: actions } = useQuery<any[]>({ queryKey: ["/api/admin/agent-actions"], retry: false, enabled: !!user?.isAdmin });

  const approveRequest = useMutation({
    mutationFn: async (id: number) => { await apiRequest("POST", `/api/admin/demo-requests/${id}/approve`, {}); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] }),
  });
  const regenerateRequest = useMutation({
    mutationFn: async (id: number) => { await apiRequest("POST", `/api/admin/demo-requests/${id}/regenerate`, {}); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] }),
  });
  const rejectRequest = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => { await apiRequest("POST", `/api/admin/demo-requests/${id}/reject`, { notes }); },
    onSuccess: () => { setRejectFor(null); setRejectNotes(""); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] }); },
  });
  const bulkApprove = useMutation({
    mutationFn: async (ids: number[]) => { await apiRequest("POST", "/api/admin/bulk-approve", { ids }); },
    onSuccess: () => { setSelectedIds([]); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] }); },
  });
  const bulkRegenerate = useMutation({
    mutationFn: async (ids: number[]) => { for (const id of ids) await apiRequest("POST", `/api/admin/demo-requests/${id}/regenerate`, {}); },
    onSuccess: () => { setSelectedIds([]); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] }); },
  });
  const approveAction = useMutation({
    mutationFn: async (id: number) => { await apiRequest("POST", `/api/admin/agent-actions/${id}/approve`, {}); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-actions"] }),
  });
  const bulkApproveActions = useMutation({
    mutationFn: async (ids: number[]) => { await apiRequest("POST", "/api/admin/agent-actions/bulk-approve", { ids }); },
    onSuccess: () => { setActionIds([]); queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-actions"] }); },
  });
  const resolveAction = useMutation({
    mutationFn: async (id: number) => { await apiRequest("POST", `/api/admin/agent-actions/${id}/resolve`, {}); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-actions"] }),
  });
  const submitAnswers = useMutation({
    mutationFn: async ({ id, answers }: { id: number; answers: Record<string, string> }) => {
      const res = await apiRequest("POST", `/api/demo-requests/${id}/answers`, { answers });
      return res.json();
    },
    onSuccess: () => { setAnswerFor(null); setAnswers({}); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] }); },
  });
  const runBugFixAgent = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/run-bug-fix-agent", {})).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-actions"] }),
  });

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-soft)" }}>Loading...</div>;
  if (!user) return <div style={{ padding: 40, textAlign: "center" }}><button className="btn btn-primary" onClick={() => navigate("/auth")}>Sign in</button></div>;
  if (!user.isAdmin) return <div style={{ padding: 40, textAlign: "center", color: "var(--danger)" }}>Access denied. {user.email} is not in the admin group.</div>;

  const reqItems = requests || [];
  const actionItems = actions || [];
  const repoItems = repos || [];
  const feedbackItems = feedback || [];
  const bugItems = actionItems.filter(a => a.agentType === "bug_fix");
  const pendingCount = reqItems.filter(r => r.status === "spec_ready").length;

  const toggleSel = (id: number) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleActionSel = (id: number) => setActionIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <>
      <div className="page-head">
        <div><h1>Admin Dashboard</h1><p>Monitor demo generation — review requests, agent actions, repos, feedback, bugs.</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={() => runBugFixAgent.mutate()} disabled={runBugFixAgent.isPending}>
            {runBugFixAgent.isPending ? "Running..." : "🐛 Run Bug Fix Agent"}
          </button>
        </div>
      </div>

      {/* Ops summary tiles */}
      <div className="tiles" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="tile"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div className="v">{reqItems.length}</div><div className="lbl">Total Requests</div></div></div>
        <div className="tile t2"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div className="v">{pendingCount}</div><div className="lbl">Pending Review</div></div></div>
        <div className="tile t3"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div><div><div className="v">{repoItems.length}</div><div className="lbl">Repositories</div></div></div>
        <div className="tile t4"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div><div><div className="v">{feedbackItems.length}</div><div className="lbl">Feedback</div></div></div>
        <div className="tile t4"><div className="tile-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div><div className="v">{bugItems.length}</div><div className="lbl">Open Bugs</div></div></div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[["Demo Requests", reqItems.length], ["Agent Actions", actionItems.length], ["Repositories", repoItems.length], ["Feedback", feedbackItems.length], ["Bug Tracker", bugItems.length]].map(([label, count], i) => (
          <div key={i} className={`tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i as number)}>
            {label} <span className="count">{count}</span>
          </div>
        ))}
      </div>

      {/* Bulk bar (when items selected) */}
      {activeTab === 0 && selectedIds.length > 0 && (
        <div style={{ background: "linear-gradient(135deg,#eff6ff,#f5f3ff)", border: "1px solid #c7d2fe", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#4338ca" }}><strong>{selectedIds.length}</strong> of {reqItems.length} selected</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-success" onClick={() => bulkApprove.mutate(selectedIds)} disabled={bulkApprove.isPending}>✓ Approve</button>
            <button className="btn-ghost" onClick={() => bulkRegenerate.mutate(selectedIds)} disabled={bulkRegenerate.isPending}>⟳ Regenerate</button>
          </div>
        </div>
      )}

      {/* TAB 0: Demo Requests */}
      {activeTab === 0 && (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th style={{ width: 30 }}></th><th>Request</th><th>Requester</th><th>Extension</th><th>Database</th><th>Status</th><th>Created</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {reqItems.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-soft)" }}>No demo requests yet.</td></tr>}
              {reqItems.map((r: any) => {
                const st = STATUS_MAP[r.status] || { cls: "draft", label: r.status };
                const db = r.description?.match(/Aurora|DynamoDB|Neptune|ElastiCache|DocumentDB|PostgreSQL|MySQL/i)?.[0] || "—";
                return (
                  <tr key={r.id}>
                    <td><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSel(r.id)} /></td>
                    <td><div className="ttl">{r.title}</div><div className="sub">{r.customerIndustry || ""}{r.complexity ? ` · ${r.complexity}` : ""}</div></td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.requesterEmail}</td>
                    <td><span className={`ext-chip ${chipColor(r.targetExtension)}`}>{r.targetExtension || "—"}</span></td>
                    <td><span className="mono">{db}</span></td>
                    <td><span className={`badge-status ${st.cls}`}><span className="led"></span>{st.label}</span></td>
                    <td><span className="mono">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span></td>
                    <td className="actions">
                      {r.status === "clarifying" && <button className="btn-ghost" onClick={() => { setAnswerFor(r); setAnswers({}); }}>Answer</button>}
                      {r.spec && <button className="btn-ghost" onClick={() => setViewSpec(r)}>View Spec</button>}
                      {r.status === "spec_ready" && (<>
                        <button className="btn-success" onClick={() => approveRequest.mutate(r.id)}>Approve</button>
                        <button className="btn-danger" onClick={() => setRejectFor(r)}>Reject</button>
                      </>)}
                      {(r.status === "spec_ready" || r.status === "approved" || r.status === "complete") && r.spec && (
                        <button className="btn-ghost" onClick={() => regenerateRequest.mutate(r.id)} disabled={regenerateRequest.isPending}>Regenerate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 1: Agent Actions */}
      {activeTab === 1 && (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Agent</th><th>Trigger</th><th>Details</th><th>Tokens</th><th>Time</th><th>Status</th><th>Created</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {actionItems.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-soft)" }}>No actions yet.</td></tr>}
              {actionItems.map((a: any) => {
                const st = STATUS_MAP[a.status] || { cls: "draft", label: a.status };
                const plan = a.proposedPlan || {};
                const detail = a.agentType === "new_demo" ? (plan.name || plan.displayName || plan.title || "Demo spec")
                  : a.agentType === "bug_fix" ? (plan.title || plan.rootCause || "Fix proposal") : "—";
                const m = a.executionResult?.metrics;
                return (
                  <tr key={a.id}>
                    <td><span className="ext-chip b">{a.agentType}</span></td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.triggerSource || "—"}</td>
                    <td style={{ fontSize: 13 }}>{detail}</td>
                    <td><span className="mono">{m ? `${((m.totalInputTokens + m.totalOutputTokens) / 1000).toFixed(1)}K` : "—"}</span></td>
                    <td><span className="mono">{m ? `${(m.totalDurationMs / 1000).toFixed(0)}s` : "—"}</span></td>
                    <td><span className={`badge-status ${st.cls}`}><span className="led"></span>{st.label}</span></td>
                    <td><span className="mono">{new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span></td>
                    <td className="actions">
                      {a.proposedPlan && <button className="btn-ghost" onClick={() => setViewSpec({ title: `Action #${a.id}`, spec: a.proposedPlan })}>View Plan</button>}
                      {a.status === "proposed" && <button className="btn-success" onClick={() => approveAction.mutate(a.id)}>Approve</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Repositories */}
      {activeTab === 2 && (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Language</th><th>Database</th><th>Region</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {repoItems.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-soft)" }}>No repositories yet.</td></tr>}
              {repoItems.map((r: any) => {
                const st = STATUS_MAP[r.status] || { cls: "draft", label: r.status };
                return (
                  <tr key={r.id}>
                    <td><div className="ttl">{r.name}</div>{r.databaseType === "Aurora" && <div className="sub">🤖 AI Generated</div>}</td>
                    <td><span className="mono">{r.language}</span></td>
                    <td><span className="mono">{r.databaseType} {r.databaseVersion}</span></td>
                    <td><span className="mono">{r.awsRegion}</span></td>
                    <td><span className={`badge-status ${st.cls}`}><span className="led"></span>{st.label}</span></td>
                    <td><span className="mono">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Feedback */}
      {activeTab === 3 && (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Email</th><th>Demo Type</th><th>Priority</th><th>Message</th><th>Created</th></tr></thead>
            <tbody>
              {feedbackItems.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-soft)" }}>No feedback yet.</td></tr>}
              {feedbackItems.map((f: any) => (
                <tr key={f.id}>
                  <td style={{ fontSize: 12 }}>{f.email}</td>
                  <td><span className="mono">{f.demoType}</span></td>
                  <td><span className={`ext-chip ${f.priority === "urgent" ? "r" : f.priority === "high" ? "p" : "b"}`}>{f.priority}</span></td>
                  <td style={{ fontSize: 13, maxWidth: 400 }}>{f.message?.slice(0, 100)}{f.message?.length > 100 ? "..." : ""}</td>
                  <td><span className="mono">{new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: Bug Tracker — Self-Healing */}
      {activeTab === 4 && (
        <>
          <div className="info-banner">
            <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <div>
              <strong>Self-Healing System:</strong> The Bug Fix Agent scans all generated repositories hourly. When issues are detected, it proposes fixes with severity and root cause analysis. Upon approval, the system automatically applies the fix. If a fix requires downtime (e.g., database migration, CloudFormation update), you'll see a warning before proceeding.
            </div>
          </div>
          {actionIds.length > 0 && (
            <div style={{ background: "linear-gradient(135deg,#fef2f2,#fff7ed)", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "#b91c1c" }}><strong>{actionIds.length}</strong> bug(s) selected</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-success" onClick={() => bulkApproveActions.mutate(actionIds)} disabled={bulkApproveActions.isPending}>✓ Bulk Apply Fixes</button>
                <button className="btn-ghost" onClick={() => setActionIds([])}>Clear</button>
              </div>
            </div>
          )}
          <div className="table-card">
            <table className="tbl">
              <thead><tr><th style={{ width: 30 }}></th><th>Issue</th><th>Severity</th><th>Status</th><th>Requires Downtime</th><th>Detected</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>
                {bugItems.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--success)" }}>✅ No bugs detected. Agent scans hourly.</td></tr>}
                {bugItems.map((b: any) => {
                  const plan = b.proposedPlan || {};
                  const fix = (Array.isArray(plan) ? plan : plan.fixes || [])[0] || {};
                  const severity = fix.severity || "medium";
                  const st = STATUS_MAP[b.status] || { cls: "draft", label: b.status };
                  const needsDowntime = fix.requiresDowntime || fix.downtime || /migration|restart|redeploy/i.test(fix.description || "");
                  return (
                    <tr key={b.id}>
                      <td><input type="checkbox" checked={actionIds.includes(b.id)} onChange={() => toggleActionSel(b.id)} /></td>
                      <td><div className="ttl">{fix.title || plan.title || "Error detected"}</div><div className="sub">{fix.rootCause || fix.description || ""}</div></td>
                      <td><span className={`ext-chip ${severity === "critical" || severity === "high" ? "r" : severity === "medium" ? "p" : "o"}`}>{severity}</span></td>
                      <td><span className={`badge-status ${st.cls}`}><span className="led"></span>{st.label}</span></td>
                      <td>{needsDowntime ? <span style={{ color: "var(--warning)", fontWeight: 600, fontSize: 12 }}>⚠ Yes</span> : <span style={{ color: "var(--success)", fontSize: 12 }}>No</span>}</td>
                      <td><span className="mono">{new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span></td>
                      <td className="actions">
                        {b.proposedPlan && <button className="btn-ghost" onClick={() => setViewSpec({ title: "Bug Details & Proposed Fix", spec: b.proposedPlan })}>View Fix</button>}
                        {b.status === "proposed" && (
                          needsDowntime
                            ? <button className="btn-danger" onClick={() => { if (window.confirm(`⚠️ DOWNTIME WARNING\n\nApplying this fix may cause temporary service disruption.\n\nIssue: ${fix.title || "Bug fix"}\nSeverity: ${severity}\n\nThe system will:\n1. Apply the proposed fix\n2. Redeploy affected components\n3. Verify the fix\n\nProceed?`)) approveAction.mutate(b.id); }}>⚠ Apply Fix (Downtime)</button>
                            : <button className="btn-success" onClick={() => approveAction.mutate(b.id)}>✓ Apply Fix</button>
                        )}
                        {b.status === "approved" && (
                          <button className="btn-ghost" onClick={() => resolveAction.mutate(b.id)}>✓ Mark Resolved</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* View Spec modal */}
      {viewSpec && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setViewSpec(null); }}>
          <div className="modal" style={{ maxWidth: 860 }}>
            <div className="modal-head">
              <div><h3>Spec: {viewSpec.title}</h3></div>
              <button className="modal-close" onClick={() => setViewSpec(null)}>×</button>
            </div>
            <div className="modal-body">
              <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: 16, borderRadius: 8, fontSize: 12, maxHeight: "60vh", overflow: "auto" }}>{JSON.stringify(viewSpec.spec, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectFor && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setRejectFor(null); }}>
          <div className="modal">
            <div className="modal-head">
              <div><h3>Reject: {rejectFor.title}</h3></div>
              <button className="modal-close" onClick={() => setRejectFor(null)}>×</button>
            </div>
            <div className="modal-body">
              <textarea className="textarea" value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Reason for rejection (optional)" rows={4} />
            </div>
            <div className="modal-foot">
              <div></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setRejectFor(null)}>Cancel</button>
                <button className="btn-danger" style={{ padding: "9px 18px", fontSize: 13 }} onClick={() => rejectRequest.mutate({ id: rejectFor.id, notes: rejectNotes })}>Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Answer Questions modal */}
      {answerFor && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setAnswerFor(null); }}>
          <div className="modal">
            <div className="modal-head">
              <div><h3>Clarifying Questions — {answerFor.title}</h3><div className="sub">Answering on behalf of {answerFor.requesterEmail}</div></div>
              <button className="modal-close" onClick={() => setAnswerFor(null)}>×</button>
            </div>
            <div className="modal-body">
              {answerFor.clarifyingQuestions?.map((q: string, i: number) => (
                <div key={i} className="q-block">
                  <span className="q-num">QUESTION {String(i + 1).padStart(2, "0")}</span>
                  <p className="q-text">{q}</p>
                  <textarea className="textarea" value={answers[q] || ""} onChange={e => setAnswers(p => ({ ...p, [q]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <div></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setAnswerFor(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ padding: "9px 18px", fontSize: 13 }} disabled={submitAnswers.isPending} onClick={() => submitAnswers.mutate({ id: answerFor.id, answers })}>Submit Answers →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
