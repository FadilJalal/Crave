import { useNavigate } from "react-router-dom";

export default function QuickActions({ dark = false }) {
  const navigate = useNavigate();

  const actions = [
    { id: 1, title: "Add Food", sub: "New menu item", icon: "🍔", route: "/add-food" },
    { id: 2, title: "Orders", sub: "Manage active orders", icon: "📦", route: "/orders" },
    { id: 3, title: "Analytics", sub: "Performance growth", icon: "📈", route: "/analytics" },
    { id: 4, title: "Menu", sub: "Full item listing", icon: "📜", route: "/menu" },
    { id: 5, title: "Inventory", sub: "Stock & Recipes", icon: "🥫", route: "/inventory" },
    { id: 6, title: "Reviews", sub: "Customer feedback", icon: "💬", route: "/reviews" },
    { id: 7, title: "Coupons", sub: "Discounts & promos", icon: "🎟️", route: "/coupons" },
    { id: 8, title: "Finance", sub: "Earnings & payouts", icon: "💰", route: "/finance" },
    { id: 9, title: "Settings", sub: "Store configurations", icon: "⚙️", route: "/settings" }
  ];

  const cardShadow = dark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)";

  return (
    <div style={{ width: "100%", marginTop: 32 }}>
      <style>
        {`
          .qa-grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
            width: 100%;
          }
        `}
      </style>
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 950, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
          Quick Management
        </h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)", opacity: 0.8 }}>9 Rapid Actions Available</span>
      </div>
      
      <div className="qa-grid-container">
        {actions.map(action => (
          <div
            key={action.id}
            onClick={() => navigate(action.route)}
            style={{
              background: dark ? "#0b1220" : "#ffffff",
              border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}`,
              borderRadius: 22,
              padding: "16px 20px",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              boxShadow: cardShadow,
              minHeight: "90px",
              width: "100%",
              boxSizing: "border-box"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-6px)";
              e.currentTarget.style.boxShadow = dark ? "0 15px 40px rgba(0,0,0,0.5)" : "0 15px 40px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = "var(--orange)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = cardShadow;
              e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
            }}
          >
            <div style={{ 
                fontSize: 24, 
                width: 44, height: 44, borderRadius: 12,
                background: dark ? "rgba(255,255,255,0.05)" : "#f8fafc",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
                {action.icon}
            </div>
            
            <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
              <div style={{ 
                fontSize: 14, 
                fontWeight: 950, 
                color: dark ? "white" : "#1e293b",
                letterSpacing: "-0.5px",
                lineHeight: 1.1
              }}>
                {action.title}
              </div>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 600,
                color: dark ? "rgba(255,255,255,0.3)" : "#64748b",
                marginTop: 6,
                lineHeight: 1.3
              }}>
                {action.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
