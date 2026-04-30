import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationCenter({ dark = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("as_read_notifications") || "[]"); } catch { return []; }
  });
  
  const containerRef = useRef(null);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  const { activities, alerts, clearAll } = useNotifications();

  // Persist read status
  useEffect(() => {
    localStorage.setItem("as_read_notifications", JSON.stringify(readIds));
  }, [readIds]);

  const allNotifications = useMemo(() => {
    const list = [
      ...alerts.map(a => ({ ...a, id: `alert-${a.id}`, category: "System", type: "alert", realTime: Date.now() })),
      ...activities.map(act => ({ ...act, category: act.category || "System", realTime: new Date(act.time).getTime() }))
    ]
    .filter(n => !readIds.includes(n.id))
    .sort((a, b) => b.realTime - a.realTime);

    if (activeTab === "All") return list;
    return list.filter(n => n.category === activeTab);
  }, [activities, alerts, activeTab]);

  const hasUnreadGlobal = useMemo(() => {
    const ids = [
      ...alerts.map(a => `alert-${a.id}`),
      ...activities.map(act => act.id)
    ];
    return ids.some(id => !readIds.includes(id));
  }, [activities, alerts, readIds]);

  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const groups = { Today: [], Yesterday: [], Earlier: [] };

    allNotifications.forEach(n => {
      const t = n.realTime;
      if (t >= today) groups.Today.push(n);
      else if (t >= yesterday) groups.Yesterday.push(n);
      else groups.Earlier.push(n);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [allNotifications]);

  const markAllRead = () => {
    const ids = allNotifications.map(n => n.id || `alert-${n.id}`);
    setReadIds([...new Set([...readIds, ...ids])]);
  };

  const handleNotifyClick = (n) => {
    const id = n.id;
    if (!readIds.includes(id)) {
      setReadIds(prev => [...prev, id]);
    }
    
    if (n.action) n.action();
    else if (n.id.includes("renewals")) navigate("/subscriptions");
    else if (n.id.includes("idle")) navigate("/restaurants/list");
    else navigate("/dashboard");
    
    setIsOpen(false);
  };

  const timeLabel = (time) => {
    const d = new Date(time);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div ref={containerRef}>
      {/* Trigger Bell */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: 44, height: 44, borderRadius: 14,
          border: `1px solid ${dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)"}`,
          background: dark ? "rgba(255,255,255,0.1)" : "#f8fafc",
          color: dark ? "white" : "#1e293b",
          cursor: "pointer", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", transition: "all 0.3s ease",
          boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.04)"
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-1px)";
          if (!dark) e.currentTarget.style.background = "#fff";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "translateY(0)";
          if (!dark) e.currentTarget.style.background = "#f8fafc";
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {hasUnreadGlobal && (
          <span style={{
            position: "absolute", top: 10, right: 10, width: 8, height: 8,
            background: "#ff4e2a", borderRadius: "50%", border: "2px solid #111827",
            boxShadow: "0 0 10px rgba(255,78,42,0.5)", animation: "nc-pulse 2s infinite"
          }} />
        )}
      </button>

      {/* Sidebar Panel Overlay */}
      {isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          zIndex: 9998, animation: "fadeIn 0.3s ease"
        }} onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Panel */}
      <div 
        ref={sidebarRef}
        style={{
          position: "fixed", top: 0, right: isOpen ? 0 : "-420px",
          width: "min(400px, 90%)", height: "100%",
          background: "var(--card)",
          boxShadow: "-10px 0 50px rgba(0,0,0,0.1)",
          zIndex: 9999, transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex", flexDirection: "column",
          borderLeft: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"}`
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 950, color: "var(--text)", letterSpacing: "-1px" }}>Notifications</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Stay updated with platform activity</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: "var(--bg)", border: "none", width: 32, height: 32, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)" }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={markAllRead} style={{ background: "transparent", border: "none", color: "#6366f1", fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0 }}>Mark all as read</button>
            <span style={{ color: "var(--muted)", opacity: 0.3 }}>•</span>
            <button onClick={clearAll} style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0 }}>Clear all</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ px: 28, display: "flex", gap: 8, padding: "16px 28px", background: dark ? "rgba(255,255,255,0.02)" : "#fcfdfe" }}>
          {["All", "System", "Deployments"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 800,
                cursor: "pointer", transition: "all 0.2s",
                background: activeTab === tab ? "#6366f1" : "transparent",
                color: activeTab === tab ? "#fff" : "var(--muted)",
                border: "none"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {allNotifications.length === 0 ? (
            <div style={{ height: "60%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", margin: 0 }}>You're all caught up</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, maxWidth: 200 }}>Check back later for new platform updates.</p>
            </div>
          ) : (
            groupedNotifications.map(([title, items]) => (
              <div key={title} style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", marginBottom: 12, paddingLeft: 8 }}>{title}</h4>
                <div style={{ display: "grid", gap: 8 }}>
                  {items.map((n, i) => {
                    const isRead = readIds.includes(n.id || `alert-${n.id}`);
                    return (
                      <div
                        key={n.id || i}
                        onClick={() => handleNotifyClick(n)}
                        style={{
                          padding: "16px", borderRadius: 18, cursor: "pointer",
                          display: "flex", gap: 16, transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                          background: isRead ? "transparent" : (dark ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.03)"),
                          border: `1px solid ${isRead ? (dark ? "rgba(255,255,255,0.04)" : "#f1f5f9") : "rgba(99,102,241,0.1)"}`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.02)";
                          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.05)";
                          if (isRead) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                          if (isRead) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div style={{ 
                          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                          background: n.color ? `${n.color}15` : (dark ? "#1e293b" : "#f1f5f9"),
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: n.color || "inherit"
                        }}>
                          {n.icon || "🔔"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                            <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text)", pr: 20 }}>{n.title}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setReadIds(prev => [...prev, n.id]);
                              }}
                              style={{ 
                                background: "none", border: "none", color: "var(--muted)", 
                                fontSize: 14, cursor: "pointer", opacity: 0.5, padding: "0 0 5px 5px",
                                marginTop: -2
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                            >✕</button>
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 500, lineHeight: 1.4 }}>{n.desc}</p>
                          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "var(--muted)", opacity: 0.6 }}>{timeLabel(n.realTime)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {title !== "Earlier" && <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", marginTop: 24 }}></div>}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes nc-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); borderRadius: 10px; }
        [data-theme="dark"] ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
