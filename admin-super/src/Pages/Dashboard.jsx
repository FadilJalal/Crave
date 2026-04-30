import { useEffect, useState } from "react";
import { api, BASE_URL } from "../utils/api";
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

  useEffect(() => { 
    loadStats();
    // Refresh stats every 30 seconds to catch real-time changes
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = stats ? [
    { label: "Active Subs",     value: stats.activeSubscriptions,  color: "#8b5cf6", icon: "💎" },
    { label: "Monthly Revenue", value: `AED ${stats.mrr.toLocaleString()}`, color: "#10b981", icon: "📈" },
    { label: "Idle Partners",   value: stats.idleRestaurants,      color: "#f59e0b", icon: "⚠️" },
    { label: "Total Revenue",   value: `AED ${stats.totalRevenue.toLocaleString()}`, color: "#3b82f6", icon: "💰" },
  ] : [];

  return (
    <div className="dash animate-fade-in">
      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-kicker">⚡ COMMAND CENTER ACTIVE</div>
          <h1 className="dash-title">Platform Intelligence</h1>
          <p className="dash-subtitle">SaaS Subscription Monitoring & Growth Radar</p>
        </div>
        <div className="dash-actions">
           <button className="btn-outline" onClick={loadStats}>
             ↻ SYNC DATA
           </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton-wrap">
           <div className="skeleton" style={{ width: '100%', height: 200 }} />
        </div>
      ) : (
        <>
          {/* Revenue Radar */}
          <div className="dash-grid">
            {statCards.map(s => (
              <div key={s.label} className="statpro">
                <div className="statpro-top">
                  <div className="statpro-icon" style={{ color: s.color, background: `${s.color}15` }}>{s.icon}</div>
                  <div>
                    <div className="statpro-title">{s.label}</div>
                    <div className="statpro-helper">Real-time SaaS Metric</div>
                  </div>
                </div>
                <div className="statpro-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="dash-row">
            {/* Churn Watchdog */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                   <h3 className="dash-panel-title">⚠️ SUBSCRIPTION WATCHDOG</h3>
                   <p className="dash-panel-sub">Expiring within 7 days</p>
                </div>
                <div className="pill pill-ok">MONITORING</div>
              </div>
              <div className="dash-list">
                {!stats?.upcomingRenewals || stats.upcomingRenewals.length === 0 ? (
                  <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No immediate churn risk detected.</p>
                ) : (
                  stats.upcomingRenewals.map(r => (
                    <div key={r._id} className="dash-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyCenter: 'center', overflow: 'hidden' }}>
                          <img 
                            src={`${BASE_URL}/images/${r.logo}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => {e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-size:16px">🏪</span>';}} 
                          />
                        </div>
                        <div>
                           <div className="dash-item-value">{r.name}</div>
                           <div className="dash-item-label">Ends {new Date(r.subscription?.endDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="pill" style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', fontSize: 10 }}>RENEWAL NUDGE</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Deployments */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                   <h3 className="dash-panel-title">🚀 LIVE DEPLOYMENTS</h3>
                   <p className="dash-panel-sub">Recent restaurant partners</p>
                </div>
                <div className="pill">NEW PULSE</div>
              </div>
              <div className="dash-list">
                {stats?.recentRestaurants?.map(r => (
                  <div key={r._id} className="dash-item">
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyCenter: 'center', overflow: 'hidden' }}>
                          <img 
                            src={`${BASE_URL}/images/${r.logo}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => {e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-size:16px">🏪</span>';}} 
                          />
                        </div>
                        <div>
                           <div className="dash-item-value">{r.name}</div>
                           <div className="dash-item-label">Joined {new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="pill pill-ok">ACTIVE</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px", color: 'var(--text)' }}>QUICK ACCESS PORTALS</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: "➕ Add Restaurant",   href: "/restaurants", emoji: '🏢' },
                { label: "📍 Restaurant List",  href: "/restaurants/list", emoji: '📋' },
                { label: "💳 Subscriptions",    href: "/subscriptions", emoji: '💳' },
                { label: "📣 System Broadcast", href: "/broadcast", emoji: '📡' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="stat"
                  style={{ padding: "12px 20px", borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8, textDecoration: "none", color: "inherit", minWidth: 200 }}
                >
                  <span style={{ fontSize: 18 }}>{link.emoji}</span>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{link.label.split(' ').slice(1).join(' ')}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}