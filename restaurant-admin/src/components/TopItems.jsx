import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";

export default function TopItems({ foods = [], bestSellers = [], dark = false }) {
  const navigate = useNavigate();

  const topThree = bestSellers.slice(0, 3).map((item, idx) => {
    const fullItem = foods.find(f => f.name === item.name);
    return {
      ...item,
      ranking: idx + 1,
      image: fullItem?.image ? `${api.defaults.baseURL}/images/${fullItem.image}` : null,
      category: fullItem?.category || "Dish"
    };
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
       <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 950, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
        Quick Performance
      </h3>

      <div style={{ 
          background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
          border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}`,
          borderRadius: 24, padding: "12px",
          display: "flex", flexDirection: "column", gap: 6, flex: 1,
          boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.1)" : "0 4px 20px rgba(0,0,0,0.02)"
      }}>
        {topThree.length > 0 ? topThree.map((item) => (
          <div key={item.ranking} style={{ 
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", 
            borderRadius: 18, background: dark ? "rgba(255,255,255,0.02)" : "#fcfdfe",
            border: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f8fafc"}`,
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
          >
            <div style={{ 
                fontSize: 18, fontWeight: 950, 
                color: item.ranking === 1 ? "#f59e0b" : (dark ? "rgba(255,255,255,0.2)" : "#cbd5e1"), 
                minWidth: 32, fontStyle: "italic" 
            }}>
              #{item.ranking}
            </div>
            {item.image && <img src={item.image} alt={item.name} style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover", background: "#f1f5f9" }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
               <div style={{ fontSize: 14, fontWeight: 900, color: dark ? "white" : "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
               <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.4 }}>{item.category}</div>
            </div>
            <div style={{ textAlign: "right" }}>
               <div style={{ fontSize: 14, fontWeight: 950, color: "#10b981" }}>{item.qty}</div>
               <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5 }}>Sold</div>
            </div>
          </div>
        )) : (
            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>Awaiting sales...</div>
        )}
      </div>
    </div>
  );
}
