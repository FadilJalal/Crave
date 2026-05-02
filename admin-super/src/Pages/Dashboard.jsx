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
        <div className="dash-actions" style={{ display: 'flex', gap: 12 }}>
           <button className="btn-outline" onClick={() => window.print()} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
             📄 GENERATE AUDIT
           </button>
           <button className="btn-primary" onClick={loadStats}>
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
                     {/* Platform Sustainability ROI */}
          <div className="dash-panel" style={{ marginTop: 24, padding: 24, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.02))', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
             <div className="dash-panel-head">
                <div>
                   <h3 className="dash-panel-title" style={{ color: '#10b981' }}>🌿 NETWORK SUSTAINABILITY IMPACT</h3>
                   <p className="dash-panel-sub">CO2 offset generated via Shared Delivery logistics</p>
                </div>
                <div className="pill pill-ok" style={{ background: '#10b981', color: 'white', border: 'none' }}>ESG COMPLIANT</div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginTop: 20 }}>
                <div>
                   <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Carbon Offset</div>
                   <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>{((stats?.sharedOrderCount || 0) * 1.2).toFixed(2)} KG</div>
                   <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Estimated CO2 reduction</div>
                </div>
                <div>
                   <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Trips Optimized</div>
                   <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)' }}>{stats?.sharedOrderCount || 0}</div>
                   <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Consolidated delivery legs</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', marginBottom: 8 }}>Impact Visualization</div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: '65%', height: '100%', background: '#10b981' }}></div>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', marginTop: 6 }}>65% TOWARDS MONTHLY ESG GOAL</div>
                </div>
             </div>
          </div>

          {/* Live Fleet Radar (Academic Technical Showcase) */}
          <div className="dash-panel" style={{ marginTop: 24, padding: 0, overflow: 'hidden', background: '#0b1220' }}>
             <div className="dash-panel-head" style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                   <h3 className="dash-panel-title" style={{ color: '#fff' }}>📡 LIVE GLOBAL FLEET RADAR</h3>
                   <p className="dash-panel-sub">Real-time driver positioning & shared delivery routes</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <div style={{ fontSize: 10, fontWeight: 900, color: '#10b981' }}><span className="radar-ping"></span> 12 DRIVERS ONLINE</div>
                   <div className="pill" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>GRID ACTIVE</div>
                </div>
             </div>
             <div style={{ height: 300, position: 'relative', background: '#0b1220', backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 0)', backgroundSize: '30px 30px' }}>
                <style>{`
                  @keyframes radarPulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                  }
                  @keyframes driverMove {
                    0% { transform: translate(0, 0); }
                    25% { transform: translate(40px, 20px); }
                    50% { transform: translate(80px, -10px); }
                    75% { transform: translate(30px, 40px); }
                    100% { transform: translate(0, 0); }
                  }
                  .radar-ping {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    margin-right: 6px;
                    position: relative;
                  }
                  .radar-ping::after {
                    content: '';
                    position: absolute;
                    top: -4px; left: -4px; right: -4px; bottom: -4px;
                    border: 2px solid #10b981;
                    border-radius: 50%;
                    animation: radarPulse 2s infinite;
                  }
                `}</style>
                
                {/* Mock Map Dots */}
                {[...Array(6)].map((_, i) => (
                   <div key={i} style={{
                      position: 'absolute',
                      top: `${20 + i * 12}%`,
                      left: `${10 + i * 15}%`,
                      width: 10, height: 10,
                      background: '#6366f1',
                      borderRadius: '50%',
                      boxShadow: '0 0 15px #6366f1',
                      animation: `driverMove ${15 + i * 2}s infinite linear`
                   }}>
                      <div style={{ position: 'absolute', top: -18, left: -20, background: '#111827', color: '#fff', fontSize: 8, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.1)' }}>
                        DRIVER_{100 + i} · ACTIVE
                      </div>
                   </div>
                ))}

                {/* Grid Scan Effect */}
                <div style={{
                   position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                   background: 'linear-gradient(to right, transparent, rgba(16, 185, 129, 0.05), transparent)',
                   animation: 'scan 4s infinite linear'
                }}></div>
                <style>{`
                  @keyframes scan {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                  }
                `}</style>
             </div>
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