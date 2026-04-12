import React from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { useTheme } from "../ThemeContext";

export default function Coupons() {
  const { dark } = useTheme();

  return (
    <RestaurantLayout>
      <div style={{ padding: "40px", textAlign: "center", minHeight: "80vh" }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>🎟️</div>
        <h1 style={{ color: dark ? "white" : "#1e293b", fontWeight: 900 }}>Coupons & Promotions</h1>
        <p style={{ color: dark ? "rgba(255,255,255,0.6)" : "#64748b", fontSize: "18px" }}>
          This feature is currently being integrated into your Crave mission control.
        </p>
        <div style={{ 
          marginTop: "40px", 
          display: "inline-block",
          padding: "16px 32px",
          background: "var(--orange)",
          borderRadius: "16px",
          color: "white",
          fontWeight: 800
        }}>
          Coming Soon
        </div>
      </div>
    </RestaurantLayout>
  );
}
