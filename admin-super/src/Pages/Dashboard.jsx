import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRestaurants: 0, totalOrders: 0, totalUsers: 0 });
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const res = await axios.get(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setStats(res.data.data);
      else toast.error(res.data.message || "Failed to load stats");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = [
    { label: "Restaurants", value: stats.totalRestaurants, icon: "🍽️", sub: "Active on platform",    accent: "#6366f1" },
    { label: "Total Orders", value: stats.totalOrders,      icon: "📦", sub: "Orders placed",         accent: "#f59e0b" },
    { label: "Users",        value: stats.totalUsers,        icon: "👥", sub: "Registered customers",  accent: "#22c55e" },
  ];

  return (
    <div className="dash">

      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-kicker">📊 Overview</div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">
            {new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="dash-actions">
          <button className="btn btn-outline" onClick={() => navigate("/restaurants/list")}>
            🍽️ Restaurants
          </button>
          <button className="btn" onClick={fetchStats} disabled={loading}>
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dash-grid">
        {statCards.map((c) => (
          <div key={c.label} style={{
            background: "white", borderRadius: 20, padding: "22px 24px",
            border: "1px solid var(--border)", boxShadow: "var(--shadow)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.accent, borderRadius: "20px 20px 0 0" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>{c.label}</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: "#111827", letterSpacing: "-1.5px", lineHeight: 1 }}>
                  {loading ? <div className="skeleton" /> : c.value}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontWeight: 600 }}>{c.sub}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: c.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {c.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Panels */}
      <div className="dash-row">

        {/* System Status */}
        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <div className="dash-panel-title">System Status</div>
              <div className="dash-panel-sub">Platform health snapshot</div>
            </div>
            <span className="pill pill-ok">✅ Operational</span>
          </div>
          <div className="dash-list">
            {[
              { label: "API Server",    value: "🟢 Online" },
              { label: "Database",      value: "🟢 Connected" },
              { label: "Restaurants",   value: `${stats.totalRestaurants} active` },
              { label: "Last refreshed",value: new Date().toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" }) },
            ].map(({ label, value }) => (
              <div key={label} className="dash-item">
                <span className="dash-item-label">{label}</span>
                <span className="dash-item-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          background: "linear-gradient(135deg, #1f2937, #111827)",
          borderRadius: 20, padding: "22px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "white", marginBottom: 4 }}>Quick Actions</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 18 }}>Manage your platform</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Add Restaurant", icon: "➕", path: "/restaurants",       bg: "#ff4e2a" },
              { label: "All Restaurants",icon: "📍", path: "/restaurants/list",  bg: "#6366f1" },
              { label: "View Orders",    icon: "📦", path: null,                 bg: "#f59e0b", action: () => toast.info("Go to a restaurant admin to manage orders.") },
              { label: "Refresh Stats",  icon: "🔄", path: null,                 bg: "#22c55e", action: fetchStats },
            ].map((item) => (
              <button key={item.label} onClick={() => item.action ? item.action() : navigate(item.path)} style={{
                padding: "14px 12px", borderRadius: 14, border: "none",
                background: item.bg + "22", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                transition: "background .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = item.bg + "40"}
                onMouseLeave={e => e.currentTarget.style.background = item.bg + "22"}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "white" }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}