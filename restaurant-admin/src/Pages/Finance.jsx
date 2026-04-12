import React from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { useTheme } from "../ThemeContext";

export default function Finance() {
  const { dark } = useTheme();

  return (
    <RestaurantLayout>
      <div style={{ padding: "40px", textAlign: "center", minHeight: "80vh" }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>💰</div>
        <h1 style={{ color: dark ? "white" : "#1e293b", fontWeight: 900 }}>Financial Overview</h1>
        <p style={{ color: dark ? "rgba(255,255,255,0.6)" : "#64748b", fontSize: "18px" }}>
          Detailed payouts, transaction logs, and financial reconciliations.
        </p>
        <div style={{ 
          marginTop: "40px", 
          display: "inline-block",
          padding: "16px 32px",
          background: "#10b981",
          borderRadius: "16px",
          color: "white",
          fontWeight: 800
        }}>
          Secure Portal Integration Active
        </div>
      </div>
    </RestaurantLayout>
  );
}
