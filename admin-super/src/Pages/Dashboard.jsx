import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { toast } from "react-toastify";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/stats");
      if (res.data.success) setStats(res.data.data);
      else toast.error("Failed to load stats");
    } catch {
      toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const statCards = stats ? [
    { label: "Total Restaurants", value: stats.totalRestaurants, color: "#8b5cf6", bg: "#f5f3ff", icon: "🍽️" },
    { label: "Total Users",       value: stats.totalUsers,       color: "#3b82f6", bg: "#eff6ff", icon: "👥" },
    { label: "Total Orders",      value: stats.totalOrders,      color: "#f59e0b", bg: "#fffbeb", icon: "📦" },
    { label: "Orders Today",      value: stats.todayOrders,      color: "#10b981", bg: "#ecfdf5", icon: "📅" },
    { label: "Total Revenue",     value: `AED ${(stats.totalRevenue || 0).toLocaleString()}`, color: "#15803d", bg: "#f0fdf4", icon: "💰" },
    { label: "Monthly Revenue",   value: `AED ${(stats.mrr || 0).toLocaleString()}`,          color: "#dc2626", bg: "#fef2f2", icon: "📈" },
  ] : [];

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>Welcome back — here's what's happening</p>
        </div>
        <button
          onClick={loadStats}
          style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 14 }}>Loading stats…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
          {statCards.map(s => (
            <div
              key={s.label}
              style={{ background: s.bg, borderRadius: 16, padding: "20px 22px", border: `1px solid ${s.color}22`, display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      {!loading && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>Quick Actions</h2>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "➕ Add Restaurant",   href: "/restaurants" },
              { label: "📍 Restaurant List",  href: "/restaurants/list" },
              { label: "💳 Subscriptions",    href: "/subscriptions" },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, textDecoration: "none", color: "#111827" }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}