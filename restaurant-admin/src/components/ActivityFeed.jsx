import { useNavigate } from "react-router-dom";

export default function ActivityFeed({ activities = [], dark = false }) {
  const navigate = useNavigate();

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return dateStr;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 24);
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return "1d+";
  };

  const displayItems = activities.slice(0, 5);

  if (displayItems.length === 0) return null;

  return (
    <div style={{ marginTop: 24, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 950, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>Recent Activity</h2>
        <button 
           onClick={() => navigate("/orders")}
           style={{ background: "transparent", border: "none", color: "var(--orange)", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
        >
          View All →
        </button>
      </div>

      <div style={{
        background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
        border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}`,
        borderRadius: 24,
        padding: "4px 0",
        boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.1)" : "0 4px 20px rgba(0,0,0,0.01)"
      }}>
        {displayItems.map((item, idx) => (
          <div 
            key={item.id}
            style={{
              padding: "12px 24px",
              display: "flex",
              gap: 16,
              alignItems: "center",
              borderBottom: idx === displayItems.length - 1 ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.03)" : "#f8fafc"}`,
              transition: "all 0.2s ease",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.02)" : "#fcfdfe"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            onClick={() => {
                if (item.type === "order") navigate("/orders");
                if (item.type === "review") navigate("/reviews");
            }}
          >
            <div style={{ 
                width: 6, height: 6, borderRadius: "50%", 
                background: item.color, 
                boxShadow: `0 0 10px ${item.color}33`,
                flexShrink: 0 
            }}></div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
               <span style={{ fontSize: 13, fontWeight: 900, color: dark ? "white" : "#1e293b" }}>{item.title}</span>
               <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.5, color: dark ? "white" : "#64748b", marginLeft: 8 }}>
                   {item.desc}
               </span>
            </div>
            
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.3, color: dark ? "white" : "#64748b", letterSpacing: "0.5px" }}>
                {timeAgo(item.time)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
