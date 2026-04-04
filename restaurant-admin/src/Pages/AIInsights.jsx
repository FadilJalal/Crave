import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";

const TABS = [
  { key: "forecast", label: "📈 Sales Forecast", desc: "AI-predicted revenue for the next 7 days with actionable insights" },
  { key: "menu", label: "🍽️ Menu Insights", desc: "AI scores for every menu item with optimization strategies" },
  { key: "churn", label: "⚠️ Churn Risk", desc: "Customers who may stop ordering with retention strategies" },
  { key: "stock", label: "📦 Stock Alerts", desc: "Demand trends with predictive restocking recommendations" },
];

export default function AIInsights() {
  const [tab, setTab] = useState("forecast");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t) => {
    setLoading(true); setData(null);
    try {
      const endpoints = { forecast: "/api/ai/restaurant/forecast", menu: "/api/ai/restaurant/menu-insights", churn: "/api/ai/restaurant/churn", stock: "/api/ai/restaurant/stock-alerts" };
      const res = await api.get(endpoints[t]);
      if (res.data.success) setData(res.data.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const card = (title, value, sub, color = "#111") => (
    <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px", minWidth: 140 }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>{sub}</p>}
    </div>
  );

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 900 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>🤖 AI Insights</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>AI-powered analytics for your restaurant — no API keys needed</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "10px 18px", borderRadius: 12, border: tab === t.key ? "2px solid #ff4e2a" : "1.5px solid var(--border)",
              background: tab === t.key ? "#fff5f3" : "white", fontWeight: 800, fontSize: 13,
              color: tab === t.key ? "#ff4e2a" : "#374151", cursor: "pointer", fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px", fontStyle: "italic" }}>
          {TABS.find(t => t.key === tab)?.desc}
        </p>

        {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>Loading AI analysis...</div>}

        {!loading && data && tab === "forecast" && <ForecastView data={data} />}
        {!loading && data && tab === "menu" && <MenuInsightsView data={data} />}
        {!loading && data && tab === "churn" && <ChurnView data={data} />}
        {!loading && data && tab === "stock" && <StockView data={data} />}
      </div>
    </RestaurantLayout>
  );
}

function ForecastView({ data }) {
  if (data.message) return <div style={{ padding: 20, background: "#fffbeb", borderRadius: 14, border: "1px solid #fde68a", color: "#92400e", fontWeight: 600 }}>{data.message}</div>;
  const maxRev = Math.max(...data.forecast.map(f => f.predictedRevenue), 1);
  
  // Generate AI recommendations
  const weekTotal = data.weekTotal || 0;
  const avgDaily = data.movingAverage || 0;
  const revenues = data.forecast?.map(f => f.predictedRevenue) || [];
  const highestDay = revenues.length > 0 ? Math.max(...revenues) : 0;
  const lowestDay = revenues.length > 0 ? Math.min(...revenues) : 0;
  const variance = lowestDay > 0 ? Math.round(((highestDay - lowestDay) / lowestDay) * 100) : 0;
  
  const recommendations = [];
  if (variance > 40) recommendations.push("📊 High demand variance — Prepare staffing for peak days");
  if (data.dayOfWeekPattern && data.dayOfWeekPattern.length > 0) {
    const avgRev = data.dayOfWeekPattern.map(d => d.avgRevenue || 0);
    const maxDay = Math.max(...avgRev);
    if (maxDay > avgDaily * 1.3) recommendations.push("🎯 Peak day identified — Increase marketing on high-demand days");
  }
  if (weekTotal > 0 && weekTotal < avgDaily * 5) recommendations.push("📉 Declining trend — Consider special offers or promotions");
  if (recommendations.length === 0) recommendations.push("💪 Steady and strong — Maintain current strategy");
  
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Week Forecast</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#16a34a" }}>AED {data.weekTotal}</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Daily Average</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>AED {data.movingAverage}</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Data Points</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>{data.dataPoints} days</p>
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#15803d", fontWeight: 700 }}>Variance</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#16a34a" }}>{variance}%</p>
        </div>
      </div>

      {/* AI RECOMMENDATIONS */}
      <div style={{ background: "linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%)", borderRadius: 14, border: "1px solid #fde68a", padding: 18, marginBottom: 18 }}>
        <p style={{ margin: "0 0 12px", fontWeight: 900, fontSize: 14, color: "#92400e" }}>💡 AI Recommendations</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recommendations.map((rec, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13, color: "#664d03", fontWeight: 600 }}>{rec}</p>
          ))}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: 18 }}>
        <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>7-Day Revenue Forecast</p>
        {data.forecast.map((f) => (
          <div key={f.date} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ width: 60, fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{f.dayName}</span>
            <div style={{ flex: 1, height: 24, background: "#f3f4f6", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(f.predictedRevenue / maxRev) * 100}%`, background: "linear-gradient(90deg, #ff4e2a, #ff8c5a)", borderRadius: 8, display: "flex", alignItems: "center", paddingLeft: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "white" }}>AED {f.predictedRevenue}</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: "#9ca3af", width: 50, textAlign: "right" }}>~{f.predictedOrders} ord</span>
          </div>
        ))}
      </div>

      {data.dayOfWeekPattern && (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: 18, marginTop: 14 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>Day-of-Week Pattern</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data.dayOfWeekPattern.map((d) => (
              <div key={d.day} style={{ textAlign: "center", flex: "1 1 60px", padding: "10px 8px", background: "#f9fafb", borderRadius: 10 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#6b7280" }}>{d.day}</p>
                <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 900 }}>AED {d.avgRevenue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuInsightsView({ data }) {
  const statusColors = { star: "#16a34a", good: "#2563eb", average: "#f59e0b", underperformer: "#ea580c", dead: "#dc2626" };
  const statusEmoji = { star: "⭐", good: "👍", average: "😐", underperformer: "👎", dead: "💀" };
  
  // Generate summary recommendations
  const stars = data.stars?.length || 0;
  const underperformers = data.underperformers?.length || 0;
  const totalItems = data.totalItems || 0;
  const starPercentage = Math.round((stars / totalItems) * 100);
  
  let actionPriority = [];
  if (underperformers > totalItems * 0.3) actionPriority.push("🚨 High number of underperformers — Review pricing and descriptions");
  if (starPercentage < 20) actionPriority.push("📊 Low star percentage — Needs menu optimization");
  if (starPercentage > 50) actionPriority.push("🌟 Excellent menu health — Focus on maintaining quality");
  
  const potentialRevenue = data.items
    ?.filter(i => i.status === "underperformer")
    .reduce((s, i) => s + (i.orders * i.price * 0.15), 0) || 0;
  
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Total Items</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>{data.totalItems}</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Stars</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#16a34a" }}>{data.stars?.length || 0}</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Underperformers</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{data.underperformers?.length || 0}</p>
        </div>
        {potentialRevenue > 0 && <div style={{ background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#15803d", fontWeight: 700 }}>Revenue Opportunity</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#16a34a" }}>AED {Math.round(potentialRevenue)}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#15803d" }}>By optimizing underperformers</p>
        </div>}
      </div>

      {/* AI RECOMMENDATIONS */}
      <div style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)", borderRadius: 14, border: "1px solid #7dd3fc", padding: 18, marginBottom: 18 }}>
        <p style={{ margin: "0 0 12px", fontWeight: 900, fontSize: 14, color: "#0369a1" }}>💡 Optimization Actions</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {actionPriority.map((action, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13, color: "#075985", fontWeight: 600 }}>{action}</p>
          ))}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
              <th style={th}>Item</th><th style={th}>Score</th><th style={th}>Orders</th><th style={th}>Revenue</th><th style={th}>Rating</th><th style={th}>Status</th><th style={th}>Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item) => (
              <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={td}><span style={{ fontWeight: 700 }}>{item.name}</span><br /><span style={{ fontSize: 11, color: "#9ca3af" }}>{item.category}</span></td>
                <td style={{ ...td, fontWeight: 800, color: statusColors[item.status] }}>{item.compositeScore}</td>
                <td style={td}>{item.orders}</td>
                <td style={td}>AED {item.revenue}</td>
                <td style={td}>{item.avgRating > 0 ? `⭐ ${item.avgRating.toFixed(1)}` : "—"}</td>
                <td style={td}><span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 11, fontWeight: 700, background: `${statusColors[item.status]}15`, color: statusColors[item.status] }}>{statusEmoji[item.status]} {item.status}</span></td>
                <td style={{ ...td, fontSize: 11, color: "#6b7280", maxWidth: 200 }}>{item.suggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.categoryBreakdown?.length > 0 && (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: 18, marginTop: 14 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>Category Breakdown</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data.categoryBreakdown.map((c) => (
              <div key={c.category} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 10, flex: "1 1 120px" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#374151" }}>{c.category}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{c.items} items · {c.orders} orders · AED {c.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChurnView({ data }) {
  const riskColors = { critical: "#dc2626", high: "#ea580c", medium: "#f59e0b" };
  const riskEmoji = { critical: "🚨", high: "⚠️", medium: "📉" };
  
  // Retention strategy recommendations
  const criticalCount = data.summary?.critical || 0;
  const highCount = data.summary?.high || 0;
  const totalCustomers = data.totalCustomers || 1;
  const churnRate = Math.round(((criticalCount + highCount) / totalCustomers) * 100);
  
  const recommendations = [];
  if (churnRate > 30) recommendations.push("🚨 Critical churn rate — Execute retention campaign immediately");
  if (criticalCount > 0) recommendations.push("📞 Reach out to critical-risk customers with special offers");
  if (highCount > totalCustomers * 0.2) recommendations.push("🎁 Consider loyalty reward program to reduce churn");
  if (churnRate < 10) recommendations.push("✅ Low churn rate — Maintain current engagement strategy");
  
  const estimatedLoss = (data.atRisk || []).reduce((sum, c) => sum + (c.totalSpent || 0), 0) * 0.3; // Estimate 30% of spent could be lost
  
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Total Customers</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>{data.totalCustomers}</p>
        </div>
        <div style={{ background: "#fef2f2", borderRadius: 14, border: "1px solid #fecaca", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Critical</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{data.summary?.critical || 0}</p>
        </div>
        <div style={{ background: "#fff7ed", borderRadius: 14, border: "1px solid #fed7aa", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#ea580c", fontWeight: 700 }}>High Risk</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#ea580c" }}>{data.summary?.high || 0}</p>
        </div>
        <div style={{ background: "#fffbeb", borderRadius: 14, border: "1px solid #fde68a", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 700 }}>Churn Rate</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#92400e" }}>{churnRate}%</p>
        </div>
        {estimatedLoss > 0 && <div style={{ background: "#fef2f2", borderRadius: 14, border: "1px solid #fecaca", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Est. Revenue at Risk</p>
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: "#dc2626" }}>AED {Math.round(estimatedLoss)}</p>
        </div>}
      </div>

      {/* AI RECOMMENDATIONS */}
      <div style={{ background: "linear-gradient(135deg, #fef2f2 0%, #fef9f3 100%)", borderRadius: 14, border: "1px solid #fecaca", padding: 18, marginBottom: 18 }}>
        <p style={{ margin: "0 0 12px", fontWeight: 900, fontSize: 14, color: "#dc2626" }}>💡 Retention Strategy</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recommendations.map((rec, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13, color: "#7f1d1d", fontWeight: 600 }}>{rec}</p>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {data.atRisk?.length === 0 ? (
          <div style={{ width: "100%", padding: 30, textAlign: "center", background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", color: "#15803d", fontWeight: 700 }}>
            🎉 No customers at risk of churning!
          </div>
        ) : (
          <div style={{ width: "100%", background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
                  <th style={th}>Customer</th><th style={th}>Risk</th><th style={th}>Orders</th><th style={th}>Spent</th><th style={th}>Avg Gap</th><th style={th}>Days Since</th>
                </tr>
              </thead>
              <tbody>
                {data.atRisk?.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td}><span style={{ fontWeight: 700 }}>{c.name}</span><br /><span style={{ fontSize: 11, color: "#9ca3af" }}>{c.email}</span></td>
                    <td style={td}><span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 11, fontWeight: 700, background: `${riskColors[c.risk]}15`, color: riskColors[c.risk] }}>{riskEmoji[c.risk]} {c.risk}</span></td>
                    <td style={td}>{c.orderCount}</td>
                    <td style={td}>AED {c.totalSpent}</td>
                    <td style={td}>{c.avgGapDays}d</td>
                    <td style={{ ...td, fontWeight: 700, color: riskColors[c.risk] }}>{c.daysSinceLast}d</td>
                  </tr>
                ))}
              </tbody>
              </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StockView({ data }) {
  const trendColors = { high_demand: "#16a34a", moderate_demand: "#2563eb", stable: "#6b7280", no_orders: "#dc2626" };
  const trendEmoji = { high_demand: "🔥", moderate_demand: "📊", stable: "➖", no_orders: "💤" };
  
  // Generate restocking recommendations
  const outOfStock = data.outOfStock || 0;
  const highDemand = data.highDemand || 0;
  const allItems = data.items?.length || 1;
  
  const recommendations = [];
  if (outOfStock > allItems * 0.2) recommendations.push("🚨 High out-of-stock rate — Implement better demand forecasting");
  if (highDemand > 0) recommendations.push(`📦 Restock ${highDemand} high-demand items immediately — Risk of lost sales`);
  if (data.items?.filter(i => i.trend === "no_orders").length > allItems * 0.3) recommendations.push("❓ Many items with no orders — Consider removing or repricing");
  if (outOfStock === 0 && highDemand < allItems * 0.3) recommendations.push("✅ Excellent stock management — Maintain current inventory strategy");
  
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#15803d", fontWeight: 700 }}>High Demand</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#16a34a" }}>{data.highDemand}</p>
        </div>
        <div style={{ background: "#fef2f2", borderRadius: 14, border: "1px solid #fecaca", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Out of Stock</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{data.outOfStock}</p>
        </div>
        <div style={{ background: "#fffbeb", borderRadius: 14, border: "1px solid #fde68a", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 700 }}>No Orders</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#92400e" }}>{data.noOrders}</p>
        </div>
      </div>

      {/* AI RECOMMENDATIONS */}
      <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)", borderRadius: 14, border: "1px solid #bbf7d0", padding: 18, marginBottom: 18 }}>
        <p style={{ margin: "0 0 12px", fontWeight: 900, fontSize: 14, color: "#15803d" }}>💡 Inventory Recommendations</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recommendations.map((rec, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13, color: "#146639", fontWeight: 600 }}>{rec}</p>
          ))}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
              <th style={th}>Item</th><th style={th}>Weekly</th><th style={th}>Daily Avg</th><th style={th}>Trend</th><th style={th}>Alert</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item) => (
              <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6", opacity: item.inStock ? 1 : 0.5 }}>
                <td style={td}><span style={{ fontWeight: 700 }}>{item.name}</span>{!item.inStock && <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginLeft: 6 }}>OUT</span>}</td>
                <td style={td}>{item.weeklyOrders}</td>
                <td style={td}>{item.dailyAvg}/day</td>
                <td style={td}><span style={{ color: trendColors[item.trend], fontWeight: 700 }}>{trendEmoji[item.trend]} {item.trend.replace("_", " ")}</span></td>
                <td style={{ ...td, fontSize: 11, color: "#6b7280" }}>{item.alert || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: "10px 14px", textAlign: "left", fontWeight: 800, fontSize: 11, color: "#6b7280", textTransform: "uppercase" };
const td = { padding: "10px 14px" };
