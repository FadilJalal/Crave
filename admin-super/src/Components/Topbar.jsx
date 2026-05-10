import { useTheme } from "../ThemeContext";
import { useLocation } from "react-router-dom";
import NotificationCenter from "./NotificationCenter";

export default function Topbar() {
  const { dark, toggle } = useTheme();
  const location = useLocation();

  const getTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Platform Intelligence";
    if (path === "/restaurants") return "Onboard Restaurant";
    if (path === "/restaurants/list") return "Partner Network";
    if (path === "/broadcast") return "System Broadcast";
    if (path === "/messages") return "Support Inbox";
    if (path === "/subscriptions") return "Enterprise Subscriptions";
    return "Crave. Super Admin";
  };

  return (
    <header style={{
      height: 80, padding: "0 40px", display: "flex", alignItems: "center",
      justifyContent: "space-between", background: "var(--bg)",
      borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 100
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: "-0.8px", color: "var(--text)" }}>
          {getTitle()}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
          <div style={{ 
            width: 38, height: 38, borderRadius: 12, 
            background: "linear-gradient(135deg, #6366f1, #a855f7)", 
            color: "white", display: "flex", alignItems: "center", justifyContent: "center", 
            fontWeight: 900, fontSize: 16,
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
          }}>
            C
          </div>
        </div>
      </div>
    </header>
  );
}