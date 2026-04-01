import { useState, useEffect } from "react";
import { api, BASE_URL } from "../utils/api";

const TABS = [
  { key: "trends", label: "📈 Platform Trends", desc: "Trending foods, categories, restaurants & growth metrics" },
  { key: "scores", label: "🏆 Restaurant Scores", desc: "AI-powered composite scoring for all restaurants" },
  { key: "fraud", label: "🚨 Fraud Alerts", desc: "Suspicious activity detection from the last 7 days" },
];

export default function AIHub() {
  const [tab, setTab] = useState("trends");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t) => {
    setLoading(true); setData(null);
    try {
      const endpoints = { trends: "/api/ai/admin/trends", scores: "/api/ai/admin/restaurant-scores", fraud: "/api/ai/admin/fraud-alerts" };
      const res = await api.get(endpoints[t]);
      if (res.data.success) setData(res.data.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>🤖 AI Hub</h2>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>Platform-wide AI analytics — no external API keys needed</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 18px", borderRadius: 12, border: tab === t.key ? "2px solid #ff4e2a" : "1.5px solid #e5e7eb",
            background: tab === t.key ? "#fff5f3" : "white", fontWeight: 800, fontSize: 13,
            color: tab === t.key ? "#ff4e2a" : "#374151", cursor: "pointer", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px", fontStyle: "italic" }}>
        {TABS.find(t => t.key === tab)?.desc}
      </p>

      {loading && <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>Loading AI analysis...</div>}

      {!loading && data && tab === "trends" && <TrendsView data={data} />}
      {!loading && data && tab === "scores" && <ScoresView data={data} />}
      {!loading && data && tab === "fraud" && <FraudView data={data} />}
    </div>
  );
}

function TrendsView({ data }) {
  return (
    <div>
      {/* Growth cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { label: "Orders (30d)", val: data.totals?.orders, color: "#111" },
          { label: "Revenue (30d)", val: `AED ${data.totals?.revenue}`, color: "#16a34a" },
          { label: "Order Growth", val: `${data.growth?.orderGrowth > 0 ? "+" : ""}${data.growth?.orderGrowth}%`, color: data.growth?.orderGrowth >= 0 ? "#16a34a" : "#dc2626" },
          { label: "Revenue Growth", val: `${data.growth?.revenueGrowth > 0 ? "+" : ""}${data.growth?.revenueGrowth}%`, color: data.growth?.revenueGrowth >= 0 ? "#16a34a" : "#dc2626" },
        ].map((c, i) => (
          <div key={i} style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "16px 18px", flex: "1 1 140px" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{c.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: c.color }}>{c.val}</p>
          </div>
        ))}
      </div>

      {/* Order trend chart (simple bar) */}
      {data.orderTrend?.length > 0 && (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: 18, marginBottom: 16 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>30-Day Order Trend</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100 }}>
            {data.orderTrend.map((d, i) => {
              const max = Math.max(...data.orderTrend.map(x => x.count), 1);
              const h = (d.count / max) * 100;
              return (
                <div key={i} title={`${d.date}: ${d.count} orders`} style={{
                  flex: 1, height: `${Math.max(h, 2)}%`, background: "linear-gradient(180deg, #ff4e2a, #ff8c5a)",
                  borderRadius: "4px 4px 0 0", minWidth: 3, cursor: "pointer", transition: "opacity 0.15s",
                }} />
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Trending Foods */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: 18 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>🔥 Trending Foods</p>
          {data.trendingFoods?.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{i + 1}. {f.name}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{f.count} orders</span>
            </div>
          ))}
        </div>

        {/* Top Restaurants */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: 18 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>🏆 Top Restaurants</p>
          {data.topRestaurants?.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {r.logo ? <img src={`${BASE_URL}/images/${r.logo}`} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} onError={e => e.target.style.display = "none"} /> : null}
                <span style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</span>
              </div>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{r.orders} ord · AED {Math.round(r.revenue)}</span>
            </div>
          ))}
        </div>

        {/* Trending Categories */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: 18 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>📂 Trending Categories</p>
          {data.trendingCategories?.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{c.category}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{c.count} orders</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoresView({ data }) {
  const gradeColors = { "A+": "#16a34a", A: "#22c55e", B: "#2563eb", C: "#f59e0b", D: "#dc2626" };
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "16px 18px", flex: "1 1 180px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Avg Platform Score</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900 }}>{data.avgPlatformScore}/100</p>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={th}>Restaurant</th><th style={th}>Grade</th><th style={th}>Score</th>
              <th style={th}>Rating</th><th style={th}>Volume</th><th style={th}>Speed</th>
              <th style={th}>Completion</th><th style={th}>Sentiment</th><th style={th}>Stats</th>
            </tr>
          </thead>
          <tbody>
            {data.restaurants?.map((r) => (
              <tr key={r._id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {r.logo ? <img src={`${BASE_URL}/images/${r.logo}`} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} onError={e => e.target.style.display = "none"} /> : null}
                    <div>
                      <span style={{ fontWeight: 700 }}>{r.name}</span>
                      {!r.isActive && <span style={{ fontSize: 10, color: "#dc2626", marginLeft: 6 }}>INACTIVE</span>}
                    </div>
                  </div>
                </td>
                <td style={td}><span style={{ padding: "4px 12px", borderRadius: 50, fontWeight: 900, fontSize: 14, color: gradeColors[r.grade] || "#111", background: `${gradeColors[r.grade] || "#111"}15` }}>{r.grade}</span></td>
                <td style={{ ...td, fontWeight: 800 }}>{r.composite}</td>
                <td style={td}>{r.scores.rating}</td>
                <td style={td}>{r.scores.volume}</td>
                <td style={td}>{r.scores.speed}</td>
                <td style={td}>{r.scores.completion}%</td>
                <td style={td}>{r.scores.sentiment}</td>
                <td style={{ ...td, fontSize: 11, color: "#6b7280" }}>{r.stats.orders} ord · ⭐{r.stats.avgRating} · AED {r.stats.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FraudView({ data }) {
  const sevColors = { high: "#dc2626", medium: "#ea580c", low: "#f59e0b" };
  const sevEmoji = { high: "🚨", medium: "⚠️", low: "💡" };
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Orders Analyzed</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>{data.totalOrdersAnalyzed}</p>
        </div>
        {["high", "medium", "low"].map((s) => (
          <div key={s} style={{ background: `${sevColors[s]}08`, borderRadius: 14, border: `1px solid ${sevColors[s]}30`, padding: "16px 18px", flex: "1 1 140px" }}>
            <p style={{ margin: 0, fontSize: 12, color: sevColors[s], fontWeight: 700, textTransform: "capitalize" }}>{s} Severity</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: sevColors[s] }}>{data.summary?.[s] || 0}</p>
          </div>
        ))}
      </div>

      {data.flags?.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", color: "#15803d", fontWeight: 700 }}>
          ✅ No suspicious activity detected in the last 7 days!
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={th}>Severity</th><th style={th}>Type</th><th style={th}>User</th><th style={th}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.flags?.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td}><span style={{ padding: "2px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, background: `${sevColors[f.severity]}15`, color: sevColors[f.severity] }}>{sevEmoji[f.severity]} {f.severity}</span></td>
                  <td style={{ ...td, fontWeight: 700 }}>{f.type.replace(/_/g, " ")}</td>
                  <td style={td}>{f.userName ? <><span style={{ fontWeight: 600 }}>{f.userName}</span><br /><span style={{ fontSize: 11, color: "#9ca3af" }}>{f.userEmail}</span></> : "—"}</td>
                  <td style={{ ...td, fontSize: 12, color: "#6b7280" }}>{f.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: "10px 14px", textAlign: "left", fontWeight: 800, fontSize: 11, color: "#6b7280", textTransform: "uppercase" };
const td = { padding: "10px 14px" };
