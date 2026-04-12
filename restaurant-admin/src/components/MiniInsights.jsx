import { useNavigate } from "react-router-dom";

export default function MiniInsights({ analytics = {}, orders = [], dark = false }) {
  const navigate = useNavigate();

  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const weeklyOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo && o.status !== "Cancelled");
  
  const peakHourObj = (analytics?.peakHours || [])
    .sort((a, b) => b.count - a.count)[0];
  
  const peakHourText = peakHourObj 
    ? `${peakHourObj.hour}:00 - ${peakHourObj.hour + 1}:00`
    : "No data";

  const insights = [
    {
      id: 1,
      title: "Orders this week",
      value: `${weeklyOrders.length}`,
      subtitle: `${weeklyOrders.length > 0 ? "Active Sales" : "N/A"}`,
      trend: "up",
      icon: "📦",
      color: "#3b82f6"
    },
    {
      id: 2,
      title: "Revenue this week",
      value: `AED ${analytics?.thisWeekRevenue || 0}`,
      subtitle: `${analytics?.revenueGrowth ? (analytics.revenueGrowth > 0 ? "+" : "") + analytics.revenueGrowth + "%" : "Stable"}`,
      trend: (analytics?.revenueGrowth || 0) >= 0 ? "up" : "down",
      icon: "💰",
      color: "#10b981"
    },
    {
      id: 3,
      title: "Peak hour",
      value: peakHourText,
      subtitle: "Busy period",
      trend: "neutral",
      icon: "🔥",
      color: "#f97316"
    }
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 950, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>Performance Preview</h2>
        <button 
          onClick={() => navigate("/analytics")}
          style={{ background: "transparent", border: "none", color: "var(--orange)", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
        >
          Details →
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {insights.map(item => (
          <div
            key={item.id}
            onClick={() => navigate("/analytics")}
            style={{
              background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
              border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}`,
              borderRadius: 20,
              padding: "16px 20px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 16,
              boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.02)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.borderColor = "var(--orange)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
            }}
          >
            <div style={{
              width: 42, height: 42,
              borderRadius: 12,
              background: item.color + "10",
              color: item.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0
            }}>
              {item.icon}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: dark ? "rgba(255,255,255,0.3)" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 17, fontWeight: 950, color: dark ? "white" : "#1e293b", margin: "2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.value}
              </div>
              <div style={{ 
                fontSize: 11, fontWeight: 700, 
                color: item.trend === "up" ? "#10b981" : item.trend === "down" ? "#ef4444" : "#64748b"
              }}>
                {item.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
