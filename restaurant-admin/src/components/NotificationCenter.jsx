import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NotificationCenter({ activities = [], alerts = [], dark = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return "";
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allNotifications = [
    ...alerts.map(a => ({ ...a, category: "alert", id: `alert-${a.id}`, time: Date.now() })), // Alerts are "current"
    ...activities.map(act => ({ ...act, category: "activity" }))
  ].sort((a, b) => {
    if (a.category === "alert" && b.category !== "alert") return -1;
    if (a.category !== "alert" && b.category === "alert") return 1;
    return new Date(b.time || 0) - new Date(a.time || 0);
  });

  const hasUnread = allNotifications.length > 0;

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 46, height: 46,
          borderRadius: 16,
          border: isOpen ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.18)",
          background: isOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
          color: "white",
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          boxShadow: isOpen ? "0 8px 24px rgba(0,0,0,0.2)" : "none",
          transform: isOpen ? "scale(1.05)" : "scale(1)"
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {hasUnread && (
          <span style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 9,
            height: 9,
            background: "#ef4444",
            borderRadius: "50%",
            border: "2px solid #1e2029",
            boxShadow: "0 0 12px rgba(239,68,68,0.6)",
            animation: "nc-pulse 2s infinite"
          }} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 16px)",
          right: 0,
          width: 360,
          background: dark ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(24px) saturate(180%)",
          borderRadius: 28,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.08)",
          zIndex: 1000,
          overflow: "hidden",
          animation: "nc-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          {/* Top highlight bar */}
          <div style={{ height: 3, background: "linear-gradient(90deg, #e64a19, #f4511e)", width: "100%" }} />

          <div style={{
            padding: "20px 24px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end"
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: dark ? "white" : "#0f172a", letterSpacing: "-0.5px" }}>Inbox</h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Latest Updates
              </p>
            </div>
            <span style={{ 
              fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 8, 
              background: dark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
              color: dark ? "white" : "#475569"
            }}>
              {allNotifications.length} ITEMS
            </span>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto", padding: "0 12px 12px" }}>
            {allNotifications.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: dark ? "white" : "#1e293b" }}>You're all caught up</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: dark ? "rgba(255,255,255,0.4)" : "#94a3b8", marginTop: 4 }}>Everything looks perfect right now.</div>
              </div>
            ) : (
              allNotifications.map((n, i) => (
                <div
                  key={n.id || i}
                  onClick={() => {
                    if (n.action) n.action();
                    else if (n.type === "order") navigate("/orders");
                    else if (n.type === "review") navigate("/reviews");
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "16px 16px",
                    borderRadius: 20,
                    cursor: "pointer",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    marginBottom: 4,
                    background: "transparent"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={{ 
                    width: 44, height: 44, borderRadius: 14, 
                    background: dark ? "rgba(255,255,255,0.05)" : "#f8fafc",
                    border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                  }}>
                    {n.icon || "🔔"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: dark ? "white" : "#1e293b", letterSpacing: "-0.2px" }}>{n.title}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: dark ? "rgba(255,255,255,0.3)" : "#94a3b8" }}>{timeAgo(n.time)}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: dark ? "rgba(255,255,255,0.5)" : "#64748b", lineHeight: 1.4 }}>{n.desc}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div 
            onClick={() => { navigate("/orders"); setIsOpen(false); }}
            style={{
              padding: "16px",
              textAlign: "center",
              background: dark ? "rgba(255,255,255,0.02)" : "#fcfdfe",
              borderTop: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}`,
              fontSize: 12,
              fontWeight: 900,
              color: "#e64a19",
              cursor: "pointer",
              letterSpacing: "0.2px"
            }}
          >
            Manage All Messages →
          </div>
        </div>
      )}

      <style>{`
        @keyframes nc-slide-in {
          from { opacity: 0; transform: translateY(20px) scale(0.96) rotateX(-10deg); }
          to { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); }
        }
        @keyframes nc-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  );
}
