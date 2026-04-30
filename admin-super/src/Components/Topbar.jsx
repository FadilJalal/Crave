import { useTheme } from "../ThemeContext";
import { useLocation } from "react-router-dom";
import NotificationCenter from "./NotificationCenter";

export default function Topbar() {
  const { dark, toggle } = useTheme();
  const location = useLocation();

  const getTitle = () => {
    switch (location.pathname) {
      case "/dashboard": return "Dashboard Overview";
      case "/restaurants": return "Add Restaurant";
      case "/restaurants/list": return "Restaurant List";
      case "/broadcast": return "Broadcast";
      case "/messages": return "Support Inbox";
      case "/subscriptions": return "Subscriptions";
      default: return "Crave. Super Admin";
    }
  };

  return (
    <header style={{
      height: 80, padding: "0 40px", display: "flex", alignItems: "center",
      justifyContent: "space-between", background: "var(--bg)",
      borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 100
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: "-0.8px" }}>
          {getTitle()}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
          {new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <button
          onClick={toggle}
          style={{
            width: 44, height: 44, borderRadius: 14,
            border: `1px solid ${dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)"}`,
            background: dark ? "rgba(255,255,255,0.1)" : "#f8fafc",
            color: dark ? "white" : "#1e293b",
            cursor: "pointer", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            transition: "all 0.3s ease",
            boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.04)"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {dark ? "☀️" : "🌙"}
        </button>
        <NotificationCenter dark={dark} />
        <div style={{ width: 1, height: 24, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 900 }}>Crave.</div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>Super Admin</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "#6366f1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>
            C
          </div>
        </div>
      </div>
    </header>
  );
}