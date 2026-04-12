import React from "react";
import { useNavigate } from "react-router-dom";

export default function AlertSection({ foods = [], inventory = [], pendingOrders = [], restaurantStatus = "open", dark = false }) {
  const navigate = useNavigate();

  const alerts = [];

  // Logic for alerts (Reduced density/count where possible)
  if (restaurantStatus !== "open") {
    alerts.push({
      id: "status", type: "danger", title: "Restaurant Offline",
      desc: "Status is set to 'Closed'. No new orders can be received.",
      cta: "Open Now", action: () => navigate("/settings"),
      icon: "🏪"
    });
  }

  const lowStock = inventory.filter(i => i.currentStock <= i.minimumStock && i.isActive);
  if (lowStock.length > 0) {
    alerts.push({
      id: "stock", type: "warning", title: "Low Stock Alert",
      desc: `${lowStock.length} items are below minimum threshold.`,
      cta: "Restock", action: () => navigate("/inventory"),
      icon: "📉"
    });
  }

  if (pendingOrders.length > 10) {
     alerts.push({
      id: "orders", type: "danger", title: "Order Backlog",
      desc: `${pendingOrders.length} pending orders. High pressure in kitchen.`,
      cta: "Check Queue", action: () => navigate("/orders"),
      icon: "🔥"
    });
  }

  const missingImage = foods.filter(f => !f.image || f.image === "").length;
  if (missingImage > 0) {
     alerts.push({
      id: "menu", type: "info", title: "Missing Photos",
      desc: `${missingImage} dishes have no image. This hurts conversion.`,
      cta: "Fix Menu", action: () => navigate("/menu"),
      icon: "📸"
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 900, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Priorities
      </h3>
      <div style={{ 
        display: "flex", flexDirection: "column", gap: 8, 
        maxHeight: 280, overflowY: "auto", paddingRight: 4 
      }}>
        {alerts.map(alert => (
          <div key={alert.id} style={{
            background: dark ? (alert.type === "danger" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)") : (alert.type === "danger" ? "#fff5f5" : "#ffffff"),
            border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}`,
            borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
          }}>
            <div style={{ fontSize: 18 }}>{alert.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
               <div style={{ fontSize: 13, fontWeight: 900, color: dark ? "white" : "#1e293b" }}>{alert.title}</div>
               <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alert.desc}</div>
            </div>
            <button 
              onClick={alert.action}
              style={{
                background: alert.type === "danger" ? "#ef4444" : "var(--orange)",
                border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 10, fontWeight: 800, color: "white", cursor: "pointer"
              }}
            >
              {alert.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
