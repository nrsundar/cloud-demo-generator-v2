import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";
import "../styles/shell.css";

const NAV = [
  { section: "Workspace", items: [
    { label: "Welcome", href: "/home", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
    { label: "Dashboard", href: "/home", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
    { label: "Generator", href: "/generator", icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" },
    { label: "My Requests", href: "/my-requests", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  ]},
  { section: "Resources", items: [
    { label: "User Guide", href: "/guide", icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" },
    { label: "Presentation", href: "/presentation", icon: "M2 3h20v14H2zM8 21h8M12 17v4" },
  ]},
  { section: "Management", items: [
    { label: "Admin Dashboard", href: "/admin", icon: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" },
  ]},
];

const BREADCRUMB: Record<string, string> = {
  "/": "Welcome", "/home": "Dashboard", "/generator": "Generator",
  "/my-requests": "My Requests", "/admin": "Admin Dashboard",
  "/guide": "User Guide", "/presentation": "Presentation", "/auth": "Sign In",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  if (location === "/auth") return <>{children}</>;

  const page = BREADCRUMB[location] || "Page";

  return (
    <div className="df-app">
      <aside className="df-sidebar">
        <div className="df-brand" onClick={() => navigate("/")}>
          <div className="df-brand-mark">DF</div>
          <div><div className="df-brand-name">DemoForge</div><div className="df-brand-sub">AI Demo Builder</div></div>
        </div>
        {NAV.map(s => (
          <div key={s.section} className="df-nav-section">
            <div className="df-nav-label">{s.section}</div>
            {s.items.map(item => (
              <div key={item.href} className={`df-nav-item ${location === item.href ? "active" : ""}`} onClick={() => navigate(item.href)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.icon}/></svg>
                {item.label}
              </div>
            ))}
          </div>
        ))}
        <div className="df-sidebar-footer">
          <h4>✨ Pro Tier</h4>
          <p>Unlimited demo generations and priority AI processing.</p>
          <span className="df-btn-mini">Upgrade Now</span>
        </div>
      </aside>

      <div className="df-main">
        <header className="df-topbar">
          <div className="df-breadcrumbs">
            <span>Workspace</span><span className="sep">/</span><strong>{page}</strong>
            {location === "/generator" && <span className="df-pill">✦ Generative UI</span>}
            {location === "/admin" && <span className="df-pill amber">⚡ Admin</span>}
          </div>
          <div className="df-top-actions">
            <div className="df-search-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Search demos, modules, docs…<kbd>⌘K</kbd>
            </div>
            <button className="df-icon-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></button>
            <button className="df-icon-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span className="df-dot"></span></button>
            {user ? (
              <div className="df-avatar" onClick={() => { logout(); navigate("/auth"); }}>
                <div className="df-avatar-img">{user.email?.[0]?.toUpperCase() || "U"}</div>
                <span className="df-avatar-name">{user.name || user.email?.split("@")[0]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            ) : (
              <button className="btn btn-outline" onClick={() => navigate("/auth")}>Sign In</button>
            )}
          </div>
        </header>
        <main className="df-content">{children}</main>
      </div>
    </div>
  );
}
