import React from "react";

export default function GuidePage() {
  return (
    <>
      <div className="page-head">
        <div><h1>User Guide</h1><p>Everything you need to know to get the most out of DemoForge.</p></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {[
          { icon: "🚀", title: "Getting Started", desc: "Describe a demo in plain English on the Generator page. The AI infers the database, extension, and audience from your prompt." },
          { icon: "✨", title: "Generative UI", desc: "The AI returns structured components (questions, previews, progress, confirmation) rendered inline. Each card's type is shown in the header." },
          { icon: "📋", title: "My Requests", desc: "Track the status of every demo. When the AI needs more info, click 'Answer Questions' to provide clarifications." },
          { icon: "📦", title: "Download & Deploy", desc: "Completed demos come as ZIP packages with CloudFormation, application code, learning modules, and documentation." },
          { icon: "🎯", title: "Best Practices", desc: "Be specific about the customer context and audience. 'pgvector for healthcare CTO pitch' works better than 'vector search demo'." },
          { icon: "🔒", title: "Admin Access", desc: "Admins can review specs, approve/reject requests, monitor agent actions, and track bugs. Sign in with an admin account." },
        ].map((item, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>{item.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}
