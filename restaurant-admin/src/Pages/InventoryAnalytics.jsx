import { useEffect, useState, useMemo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";

const TABS = [
  { id: "inventory", label: "Stock Value", icon: "💰" },
  { id: "turnover", label: "Turnover", icon: "🔄" },
  { id: "suppliers", label: "Suppliers", icon: "🏢" },
  { id: "costs", label: "Cost Analysis", icon: "📉" }
];

export default function InventoryAnalytics() {
  const { dark } = useTheme();
  const [timeframe, setTimeframe] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ inv: null, turn: null, supp: null, cost: null });
  const [tab, setTab] = useState("inventory");

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [inv, turn, supp, cost] = await Promise.all([
        api.get(`/api/inventory/analytics/inventory?timeframe=${timeframe}`).catch(() => ({ data: { success: false } })),
        api.get(`/api/inventory/analytics/turnover?timeframe=${timeframe}`).catch(() => ({ data: { success: false } })),
        api.get(`/api/inventory/analytics/suppliers`).catch(() => ({ data: { success: false } })),
        api.get(`/api/inventory/analytics/costs`).catch(() => ({ data: { success: false } }))
      ]);

      setData({
        inv: inv.data?.success ? inv.data.data : null,
        turn: turn.data?.success ? turn.data.data : null,
        supp: supp.data?.success ? supp.data.data : null,
        cost: cost.data?.success ? cost.data.data : null
      });
    } catch (err) {
      toast.error("Failed to sync analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  if (loading) return <RestaurantLayout><div style={{ padding: 60, textAlign: 'center' }}>Crunching Inventory Big Data...</div></RestaurantLayout>;

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 60px" }}>
        
        {/* Header */}
        <div style={{ padding: "40px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 900, color: "#F43F5E", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>Supply Chain Intelligence</h4>
            <h1 style={{ fontSize: 40, fontWeight: 950, margin: 0, letterSpacing: "-1.5px" }}>Inventory Analytics</h1>
          </div>
          <select 
            value={timeframe} 
            onChange={e => setTimeframe(e.target.value)}
            style={{
              padding: "10px 20px", borderRadius: 12, border: "1px solid var(--border)",
              background: dark ? "#1e293b" : "#fff", color: "inherit", fontWeight: 800,
              fontSize: 13, cursor: "pointer", outline: "none"
            }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {/* Custom Tab Switcher */}
        <div style={{ 
          display: "flex", gap: 12, marginBottom: 32, padding: 8, 
          background: dark ? "rgba(255,255,255,0.03)" : "#f1f5f9", borderRadius: 20, width: "fit-content" 
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "12px 24px", borderRadius: 14, border: "none",
                background: tab === t.id ? (dark ? "#fff" : "#000") : "transparent",
                color: tab === t.id ? (dark ? "#000" : "#fff") : "var(--muted)",
                fontWeight: 800, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 8
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {tab === "inventory" && (
           <div style={{ display: "grid", gap: 24 }}>
             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                <AnalyticMetric title="Total Value" value={`AED ${(data.inv?.current?.totalValue || 0).toLocaleString()}`} sub={`${data.inv?.current?.totalItems || 0} trackable items`} dark={dark} />
                <AnalyticMetric title="Avg Daily Burn" value={`AED ${(data.inv?.summary?.avgDailyUsage || 0).toLocaleString()}`} sub="Current pace" dark={dark} />
                <AnalyticMetric title="Monthly Projection" value={`AED ${(data.inv?.summary?.projectedMonthlyUsage || 0).toLocaleString()}`} sub="Estimated replenishment" dark={dark} />
             </div>
             <SectionBox title="Category Concentration" dark={dark}>
                <div style={{ display: "grid", gap: 16 }}>
                  {(data.inv?.current?.byCategory || []).map((cat, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14, fontWeight: 800 }}>
                          <span>{cat.category.replace(/_/g, ' ').toUpperCase()}</span>
                          <span>AED {cat.value.toLocaleString()} ({cat.percentage}%)</span>
                        </div>
                        <div style={{ height: 8, background: dark ? "#1e293b" : "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${cat.percentage}%`, height: "100%", background: "#F43F5E", borderRadius: 99 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </SectionBox>
           </div>
        )}

        {tab === "turnover" && (
           <div style={{ display: "grid", gap: 24 }}>
             {(data.turn || []).length === 0 ? (
               <EmptyState msg="No turnover data recorded yet. Processing orders will trigger velocity tracking." icon="🔄" dark={dark} />
             ) : (
               (data.turn || []).map((cat, idx) => (
                 <SectionBox key={idx} title={cat.category.replace(/_/g, ' ')} badge={`Avg Turnover: ${cat.avgTurnover}%`} dark={dark}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ textAlign: "left", fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>
                            <th style={{ padding: "12px 0" }}>Item Name</th>
                            <th>Value Used</th>
                            <th>Turnover</th>
                            <th>Efficiency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.items.map((item, i) => (
                            <tr key={i} style={{ borderTop: "1px solid var(--border)", fontSize: 14 }}>
                              <td style={{ padding: "16px 0", fontWeight: 800 }}>{item.name}</td>
                              <td>AED {item.usedValue.toLocaleString()}</td>
                              <td style={{ fontWeight: 900, color: "#F43F5E" }}>{item.turnoverRate}%</td>
                              <td>
                                <span style={{ padding: "4px 10px", borderRadius: 8, background: item.efficiency === "high" ? "#F0FDF4" : "#FEF2F2", color: item.efficiency === "high" ? "#10B981" : "#EF4444", fontWeight: 900, fontSize: 11 }}>
                                  {item.efficiency.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </SectionBox>
               ))
             )}
           </div>
        )}

        {tab === "suppliers" && (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
             {(data.supp || []).length === 0 ? (
               <div style={{ gridColumn: "1 / -1" }}>
                 <EmptyState msg="Assign suppliers to your inventory to unlock relationship analytics." icon="🏢" dark={dark} />
               </div>
             ) : (
               (data.supp || []).map((sup, idx) => (
                 <SectionBox key={idx} title={sup.name || "Unknown"} dark={dark}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ textAlign: 'center', background: dark ? "#1e293b" : "#f1f5f9", padding: "12px 20px", borderRadius: 16 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: "var(--muted)" }}>QUALITY SCORE</p>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 950, color: "#10B981" }}>{sup.qualityScore}%</p>
                      </div>
                      <div style={{ textAlign: 'center', background: dark ? "#1e293b" : "#f1f5f9", padding: "12px 20px", borderRadius: 16 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: "var(--muted)" }}>TOTAL VOLUME</p>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 950 }}>AED {sup.totalValue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                       {sup.items.slice(0, 3).map((item, i) => (
                         <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                           <span>{item.name}</span>
                           <span style={{ color: "var(--muted)" }}>AED {item.value.toLocaleString()}</span>
                         </div>
                       ))}
                    </div>
                 </SectionBox>
               ))
             )}
           </div>
        )}

        {tab === "costs" && data.cost && (
           <div style={{ display: "grid", gap: 24 }}>
             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                <AnalyticMetric title="Capital Invested" value={`AED ${data.cost.current.totalCapitalInvested.toLocaleString()}`} sub="Frozen assets" dark={dark} />
                <AnalyticMetric title="Avg Unit Cost" value={`AED ${data.cost.current.averageUnitCost.toFixed(2)}`} sub="Base price" dark={dark} />
                <AnalyticMetric title="Cost Used" value={`AED ${data.cost.usage.totalCostUsed.toLocaleString()}`} sub="Burned value" dark={dark} />
             </div>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <SectionBox title="💎 High Cost Assets" dark={dark}>
                   <div style={{ display: "grid", gap: 12 }}>
                      {data.cost.current.highestCostItems.slice(0, 5).map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                          <span>{item.name}</span>
                          <span style={{ color: "#F43F5E" }}>AED {item.cost.toFixed(2)}</span>
                        </div>
                      ))}
                   </div>
                </SectionBox>
                <SectionBox title="💰 Low Cost Items" dark={dark}>
                   <div style={{ display: "grid", gap: 12 }}>
                      {data.cost.current.lowestCostItems.slice(0, 5).map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                          <span>{item.name}</span>
                          <span style={{ color: "#10B981" }}>AED {item.cost.toFixed(2)}</span>
                        </div>
                      ))}
                   </div>
                </SectionBox>
             </div>
           </div>
        )}

      </div>
    </RestaurantLayout>
  );
}

function AnalyticMetric({ title, value, sub, dark }) {
  return (
    <div style={{
      background: dark ? "rgba(255,255,255,0.03)" : "white",
      borderRadius: 24, padding: "24px", border: "1px solid var(--border)"
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "var(--muted)", letterSpacing: 1 }}>{title}</p>
      <h3 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 950 }}>{value}</h3>
      <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{sub}</p>
    </div>
  );
}

function SectionBox({ title, badge, children, dark }) {
  return (
    <div style={{
      background: dark ? "rgba(255,255,255,0.03)" : "white",
      borderRadius: 28, padding: 32, border: "1px solid var(--border)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{title}</h3>
        {badge && <span style={{ padding: "6px 14px", borderRadius: 10, background: "#f1f5f9", color: "#64748b", fontWeight: 800, fontSize: 12 }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ msg, icon, dark }) {
  return (
    <div style={{ 
      padding: 60, textAlign: 'center', background: dark ? "rgba(255,255,255,0.02)" : "#f9fafb", 
      borderRadius: 28, border: "1px dashed var(--border)" 
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <p style={{ fontWeight: 800, color: "var(--muted)", maxWidth: 300, margin: "0 auto" }}>{msg}</p>
    </div>
  );
}
