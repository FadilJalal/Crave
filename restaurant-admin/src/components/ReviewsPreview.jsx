import { useNavigate } from "react-router-dom";

const StarRow = ({ rating, size = 11 }) => (
  <div style={{ display: "flex", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} width={size} height={size} viewBox="0 0 24 24"
        fill={rating >= s ? "#f59e0b" : "none"}
        stroke={rating >= s ? "#f59e0b" : "#d1d5db"}
        strokeWidth="2.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

export default function ReviewsPreview({ reviews = [], avgRating = 0, total = 0, dark = false }) {
  const navigate = useNavigate();

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
    if (diff < 1) return "Today";
    if (diff < 2) return "Yesterday";
    return `${Math.floor(diff)}d`;
  };

  const latestReviews = reviews.slice(0, 2);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 950, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
        Customer Pulse
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Compact Rating Strip */}
        <div style={{ 
          background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
          border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}`,
          borderRadius: 20, padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.1)" : "0 4px 15px rgba(0,0,0,0.02)"
        }}>
           <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 950, color: dark ? "white" : "#1e293b" }}>{avgRating.toFixed(1)}</span>
              <StarRow rating={Math.round(avgRating)} />
           </div>
           <div style={{ fontSize: 10, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 6 }}>
             {total} Reviews
           </div>
        </div>

        {/* Short Reviews List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
           {latestReviews.length > 0 ? latestReviews.map((rev) => (
             <div 
               key={rev._id}
               onClick={() => navigate("/reviews")}
               style={{ 
                 padding: "10px 14px", borderRadius: 16, cursor: "pointer", 
                 background: dark ? "rgba(255,255,255,0.02)" : "#fcfdfe",
                 border: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}`,
                 transition: "all 0.2s"
               }}
               onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--orange)"}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}
             >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                   <div style={{ fontSize: 13, fontWeight: 900, color: dark ? "white" : "#1e293b" }}>{rev.userName || "Customer"}</div>
                   <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.3 }}>{timeAgo(rev.createdAt)}</div>
                </div>
                <p style={{ 
                  margin: 0, fontSize: 11, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", fontWeight: 500, lineHeight: 1.4,
                  display: "-webkit-box", WebkitLineClamp: "1", WebkitBoxOrient: "vertical", overflow: "hidden"
                }}>
                  {rev.comment ? `"${rev.comment}"` : "Rated 5 stars"}
                </p>
             </div>
           )) : (
             <div style={{ padding: 20, textAlign: "center", opacity: 0.5, fontSize: 12 }}>No reviews yet</div>
           )}
        </div>

        <button 
           onClick={() => navigate("/reviews")}
           style={{ 
             marginTop: "auto", background: "none", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, 
             borderRadius: 14, padding: "10px", fontSize: 11, fontWeight: 800, color: dark ? "white" : "#64748b", cursor: "pointer",
             transition: "all 0.2s"
           }}
           onMouseEnter={(e) => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "#f8fafc"; }}
           onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
        >
          Manage All Feedback
        </button>
      </div>
    </div>
  );
}
