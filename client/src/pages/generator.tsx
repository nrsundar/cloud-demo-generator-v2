import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";
import { API_BASE } from "../lib/config";
import { GenNode, SpecSnapshot, AgentMessage } from "../components/genui/types";
import { sendAgentTurn, pollRequestStatus, submitDemoRequest } from "../services/agent";

const EXAMPLES = [
  { icon: "🏥", title: "pgvector RAG demo for a healthcare CTO, pretty technical", sub: "Aurora PostgreSQL · pgvector · clinical notes" },
  { icon: "🎮", title: "DynamoDB single-table for a gaming leaderboard, exec audience", sub: "DynamoDB · single-table design · hot keys" },
  { icon: "📍", title: "PostGIS fleet tracking for a logistics customer", sub: "Aurora PostgreSQL · PostGIS · geofencing" },
  { icon: "🕸️", title: "Neptune fraud graph for fintech, architect-pitched", sub: "Neptune · Gremlin · entity resolution" },
];

export default function GeneratorPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("gen-messages") || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState<SpecSnapshot>(() => {
    try { return JSON.parse(sessionStorage.getItem("gen-spec") || '{"database":"","extensions":[],"useCase":""}'); } catch { return { database: "", extensions: [], useCase: "" }; }
  });
  const [phase, setPhase] = useState<string>(() => sessionStorage.getItem("gen-phase") || "idle");
  const [requestId, setRequestId] = useState<number | null>(() => {
    const v = sessionStorage.getItem("gen-requestId"); return v ? parseInt(v) : null;
  });
  const [sessionId, setSessionId] = useState<number | null>(() => {
    const v = sessionStorage.getItem("gen-sessionId"); return v ? parseInt(v) : null;
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { sessionStorage.setItem("gen-messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { sessionStorage.setItem("gen-spec", JSON.stringify(spec)); }, [spec]);
  useEffect(() => { sessionStorage.setItem("gen-phase", phase); }, [phase]);
  useEffect(() => { if (requestId) sessionStorage.setItem("gen-requestId", String(requestId)); }, [requestId]);
  useEffect(() => { if (sessionId) sessionStorage.setItem("gen-sessionId", String(sessionId)); }, [sessionId]);

  useEffect(() => {
    if (phase !== "generating" || !requestId) return;
    const interval = setInterval(async () => {
      try {
        const data = await pollRequestStatus(requestId);
        if (data.status === "complete") {
          setPhase("complete");
          clearInterval(interval);
          setMessages(prev => [...prev, {
            role: "assistant", content: "Done! Your demo package is ready.",
            components: [{ type: "ConfirmationCard", packageName: `cdg-${spec.extensions?.[0] || "demo"}`, fileCount: 47, actions: [
              { label: "Download ZIP", variant: "primary", href: `${API_BASE}/api/demo-requests/${requestId}/download` },
            ]}]
          }]);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [phase, requestId, spec]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    const userMsg: AgentMessage = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(""); setLoading(true);
    try {
      const result = await sendAgentTurn(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        spec,
        sessionId ?? undefined,
      );
      if (typeof result.sessionId === "number") setSessionId(result.sessionId);
      setMessages([...newMessages, { role: "assistant", content: result.message, components: result.components }]);
      if (result.specSnapshot) setSpec(result.specSnapshot as SpecSnapshot);
      setPhase(result.phase);
      if (result.phase === "generating" && result.specSnapshot) {
        const s = result.specSnapshot as SpecSnapshot;
        const req = await submitDemoRequest(s, user?.email || "");
        if (req.id) setRequestId(req.id);
      }
    } catch (err: any) {
      setMessages([...newMessages, { role: "assistant", content: `Error: ${err.message}`, components: [{ type: "ErrorCard", title: "Error", message: err.message }] }]);
    } finally { setLoading(false); }
  };

  const handleComponentChange = (id: string, value: any) => handleSend(`[Selected ${id}: ${value}]`);
  const handleRevise = (field: string) => setInput(`Change the ${field} to `);
  const handleNewSession = () => {
    ["gen-messages","gen-spec","gen-phase","gen-requestId","gen-sessionId"].forEach(k => sessionStorage.removeItem(k));
    setMessages([]); setSpec({ database: "", extensions: [], useCase: "" }); setPhase("idle"); setRequestId(null); setSessionId(null);
  };

  if (!user) return <div style={{ padding: 60, textAlign: "center" }}><button className="btn btn-primary" onClick={() => navigate("/auth")}>Sign in to use the Generator</button></div>;

  return (
    <div className="gen-shell">
      <div className="gen-canvas">
        {messages.length === 0 && (
          <div className="gen-empty">
            <span className="badge">✦ Generative UI · live preview</span>
            <h2>Describe the demo<br/><span className="grad">your customer needs.</span></h2>
            <p>Plain English works. The AI infers what it can, asks only for what's missing, and builds the whole package — infrastructure, code, modules, and demo script.</p>
            <div className="ex-prompts">
              {EXAMPLES.map((ex, i) => (
                <div key={i} className="ex-prompt" onClick={() => handleSend(ex.title)}>
                  <span className="ico">{ex.icon}</span>
                  <div><strong>{ex.title}</strong><em>{ex.sub}</em></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`turn ${msg.role === "user" ? "user" : "ai"}`}>
            <div className="avatar-bubble">{msg.role === "user" ? (user?.email?.[0]?.toUpperCase() || "U") : "✦"}</div>
            <div className="turn-body">
              <div className="turn-meta">
                <strong>{msg.role === "user" ? "You" : "DemoForge AI"}</strong>
                <span className="dot"></span>
                <span>{msg.role === "assistant" && i === messages.length - 1 && phase === "generating" ? "Generating" : "just now"}</span>
              </div>
              {msg.role === "user" ? (
                <div className="user-msg">{msg.content}</div>
              ) : (
                <>
                  <div className="ai-prose" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                  {msg.components?.map((node, j) => <RenderNode key={j} node={node} onChange={handleComponentChange} />)}
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="turn ai">
            <div className="avatar-bubble">✦</div>
            <div className="turn-body">
              <div className="turn-meta"><strong>DemoForge AI</strong><span className="dot"></span>thinking…</div>
              <div className="gen-progress"><h4><span className="spinner"></span>Processing your request</h4></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />

        <div className="composer">
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Refine the demo, ask a follow-up, or paste another scenario…"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} disabled={loading} />
          <div className="composer-actions">
            {messages.length > 0 && <button className="new-btn" onClick={handleNewSession} title="New session">✕</button>}
            <span className="hint">⏎ to send</span>
            <button className="send" onClick={() => handleSend()} disabled={loading || !input.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Rail */}
      <aside className="rail">
        <div className="spec">
          <div className="spec-head">
            <div className="label">Live spec snapshot</div>
            <h3>{spec.extensions?.[0] || "new demo"}{spec.useCase ? ` · ${spec.useCase}` : ""}</h3>
          </div>
          <div className="spec-body">
            {spec.database && <SpecRow label="Database" value={<span className="chip pri">{spec.database}</span>} onEdit={() => handleRevise("database")} />}
            {spec.extensions && spec.extensions.length > 0 && <SpecRow label="Extensions" value={spec.extensions.map(e => <span key={e} className="chip mono">{e}</span>)} onEdit={() => handleRevise("extensions")} />}
            {spec.useCase && <SpecRow label="Use case" value={spec.useCase} onEdit={() => handleRevise("use case")} />}
            {spec.industry && <SpecRow label="Industry" value={<span className="chip">{spec.industry}</span>} onEdit={() => handleRevise("industry")} />}
            {spec.audience && <SpecRow label="Audience" value={<span className="chip">{spec.audience}</span>} onEdit={() => handleRevise("audience")} />}
            {spec.durationMin && <SpecRow label="Duration" value={<span className="chip mono">{spec.durationMin} min</span>} onEdit={() => handleRevise("duration")} />}
            {spec.estCostHourly && <SpecRow label="Est. cost" value={<span className="chip mono">{spec.estCostHourly}</span>} />}
            {!spec.database && !spec.extensions?.length && !spec.useCase && <div style={{ padding: "16px 0", fontSize: 13, color: "var(--text-soft)" }}>Start a conversation and the spec will populate here.</div>}
          </div>
          <div className="spec-foot"><span className="pulse-dot"></span>Spec updates as you chat. Click any field to revise.</div>
        </div>
        <div className="legend">
          <strong>How to read this page</strong><br/>
          Each card under an AI turn is a <strong>generated component</strong> — type shown as a mono badge (<code>AudienceProfile</code>, <code>InfraPreview</code>…). The AI picks which components to render. A different prompt composes a different page.
        </div>
      </aside>
    </div>
  );
}

function SpecRow({ label, value, onEdit }: { label: string; value: any; onEdit?: () => void }) {
  return (
    <div className="spec-row">
      <div className="spec-key">{label}</div>
      <div className="spec-val">{value}{onEdit && <span className="spec-edit" onClick={onEdit}>edit</span>}</div>
    </div>
  );
}

function RenderNode({ node, onChange }: { node: GenNode; onChange: (id: string, value: any) => void }) {
  const [selected, setSelected] = useState("");
  const [sliderValue, setSliderValue] = useState<number | null>(null);

  switch (node.type) {
    case "AudienceProfile":
      return (
        <div className="q-card">
          <div className="q-head">
            <div><div className="q-label">Who's the primary audience?</div><div className="q-helper">Pick the role — modules and depth will adapt.</div></div>
            <span className="q-tag">AudienceProfile</span>
          </div>
          <div className="opt-grid">
            {node.presets.map(p => {
              const icon = p.value === "technical" || /architect/i.test(p.label) ? "🏗" : p.value === "executive" || /exec/i.test(p.label) ? "📊" : "‹/›";
              const bg = p.value === "technical" || /architect/i.test(p.label) ? "#dbeafe" : p.value === "executive" || /exec/i.test(p.label) ? "#fef3c7" : "#ede9fe";
              const fg = p.value === "technical" || /architect/i.test(p.label) ? "#2563eb" : p.value === "executive" || /exec/i.test(p.label) ? "#d97706" : "#7c3aed";
              return (
                <div key={p.value} className={`opt ${selected === p.value ? "selected" : ""}`} onClick={() => { setSelected(p.value); onChange(node.id, p.value); }}>
                  <div className="opt-icon" style={{ background: bg, color: fg }}>{icon}</div>
                  <div className="opt-title">{p.label}</div>
                  <div className="opt-desc">{p.description || ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "QuestionSingleSelect":
      return (
        <div className="q-card">
          <div className="q-head">
            <div><div className="q-label">{node.label}</div>{node.helper && <div className="q-helper">{node.helper}</div>}</div>
            <span className="q-tag">QuestionSingleSelect</span>
          </div>
          <div className="opt-grid">
            {node.options.map(o => (
              <div key={o.value} className={`opt ${selected === o.value ? "selected" : ""}`} onClick={() => { setSelected(o.value); onChange(node.id, o.value); }}>
                <div className="opt-title">{o.label}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "QuestionSlider":
      const val = sliderValue ?? Math.floor((node.min + node.max) / 2);
      const pct = ((val - node.min) / (node.max - node.min)) * 100;
      return (
        <div className="slider">
          <div className="slider-head">
            <div><div className="q-label">{node.label}</div>{node.helper && <div className="q-helper">{node.helper}</div>}</div>
            <div className="slider-value">{val} min</div>
          </div>
          <input type="range" min={node.min} max={node.max} step={node.step} value={val}
            onChange={e => { setSliderValue(parseInt(e.target.value)); }}
            onMouseUp={e => onChange(node.id, (e.target as HTMLInputElement).value)}
            onTouchEnd={e => onChange(node.id, (e.target as HTMLInputElement).value)}
            style={{ width: "100%", opacity: 0, height: 24, marginTop: -30, position: "relative", zIndex: 2 }} />
          <div className="slider-track" style={{ marginTop: 8 }}>
            <div className="slider-fill" style={{ width: `${pct}%` }}></div>
            <div className="slider-thumb" style={{ left: `${pct}%` }}></div>
          </div>
          <div className="slider-marks">
            {[node.min, Math.round((node.min + node.max) / 2), node.max].map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
      );

    case "ProgressTimeline":
      return (
        <div className="gen-progress">
          <h4><span className="spinner"></span>Building your demo</h4>
          {node.steps.map((s, i) => (
            <div key={i} className={`step-row ${s.status === "pending" ? "pending" : ""}`}>
              <div className={`step-dot ${s.status === "complete" ? "done" : s.status === "active" ? "running" : ""}`}></div>
              <span>{s.label}</span>
              <span className="t">{s.status === "complete" ? "✓" : s.status === "active" ? "..." : "queued"}</span>
            </div>
          ))}
        </div>
      );

    case "InfraPreview":
      return (
        <div className="preview-card">
          <div className="preview-head">
            <div className="preview-title"><span className="gen-badge infra">InfraPreview</span><span>{node.resources.length} resources{node.estimatedCost ? ` · est. ${node.estimatedCost}` : ""}</span></div>
          </div>
          <div className="preview-body">
            {node.resources.map((r, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < node.resources.length - 1 ? "1px dashed var(--border)" : "none", fontSize: 13 }}>
                <strong>{r.name}</strong> <span style={{ color: "var(--text-muted)", fontSize: 12 }}>· {r.type}</span>
                {r.detail && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{r.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      );

    case "SchemaPreview":
      return (
        <div className="preview-card">
          <div className="preview-head">
            <div className="preview-title"><span className="gen-badge schema">SchemaPreview</span><span>{node.tables.length} tables{node.seedRowCount ? ` · ${node.seedRowCount.toLocaleString()} seed rows` : ""}</span></div>
          </div>
          <div className="preview-body">
            {node.tables.map((t, i) => (
              <div key={i} style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: "var(--panel-2)", padding: "8px 12px", borderBottom: "1px solid var(--border)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600 }}>📋 {t.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, padding: "4px 0" }}>
                  {t.columns.map((c, j) => <div key={j} style={{ padding: "4px 12px", color: "var(--text)" }}>{c}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "CodePreview":
      return (
        <div className="preview-card">
          <div className="preview-head">
            <div className="preview-title"><span className="gen-badge code">CodePreview</span><span>{node.filename} · {node.language}</span></div>
          </div>
          <pre className="gen-code">{node.code}</pre>
        </div>
      );

    case "ModuleList":
      return (
        <div className="preview-card">
          <div className="preview-head">
            <div className="preview-title"><span className="gen-badge modules">ModuleList</span><span>{node.modules.length} modules</span></div>
          </div>
          <div className="preview-body">
            <div className="mods">
              {node.modules.map((m, i) => (
                <div key={i} className="mod">
                  <div className="mod-num">{String(i + 1).padStart(2, "0")}</div>
                  <div><div className="mod-title">{m.name}</div><div className="mod-desc">{m.description}</div></div>
                  {m.difficulty && <div className="mod-meta">{m.difficulty}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "CostEstimate":
      return (
        <div className="preview-card">
          <div className="preview-head">
            <div className="preview-title"><span className="gen-badge cost">CostEstimate</span><span>{node.hourly}/hr · {node.monthly}/mo</span></div>
          </div>
          <div className="preview-body">
            {node.breakdown.map((b, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: i < node.breakdown.length - 1 ? "1px dashed var(--border)" : "none" }}>
                <span>{b.service}</span><strong className="mono">{b.cost}</strong>
              </div>
            ))}
          </div>
        </div>
      );

    case "ConfirmationCard":
      return (
        <div className="confirm">
          <div className="confirm-inner">
            <h3>✦ Your demo package is ready</h3>
            <p><code style={{ fontFamily: "'JetBrains Mono',monospace", background: "rgba(255,255,255,.1)", padding: "1px 6px", borderRadius: 4, color: "#c4b5fd" }}>{node.packageName}</code>{node.fileCount ? ` · ${node.fileCount} files` : ""}{node.sizeKb ? ` · ${node.sizeKb} KB` : ""}</p>
            <div className="confirm-cta">
              {node.actions.map((a, i) => (
                <a key={i} className={a.variant === "primary" ? "btn btn-primary" : "btn-ghost-light"} href={a.href} target="_blank" rel="noopener">
                  {a.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      );

    case "ErrorCard":
      return (
        <div className="q-card" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
          <div className="q-label" style={{ color: "#b91c1c" }}>⚠ {node.title}</div>
          <div className="q-helper" style={{ color: "#b91c1c" }}>{node.message}</div>
          {node.suggestions?.map((s, i) => <div key={i} style={{ fontSize: 12, marginTop: 6 }}>💡 {s}</div>)}
        </div>
      );

    case "Markdown":
      return <div className="ai-prose" dangerouslySetInnerHTML={{ __html: node.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />;

    default:
      return <div className="ai-prose">{(node as any).text || ""}</div>;
  }
}
