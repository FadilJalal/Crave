import { NavLink } from "react-router-dom";
import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { useTheme } from "../ThemeContext";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Crave.";

export default function Sidebar() {
  const sidebarRef = useRef(null);
  const { dark } = useTheme();
  const [expandedSections, setExpandedSections] = useState(() => {
    try {
      const saved = localStorage.getItem("as_sidebar_expanded");
      if (saved) return JSON.parse(saved);
    } catch { }
    return { infra: true, comms: true, finance: true };
  });

  useEffect(() => {
    localStorage.setItem("as_sidebar_expanded", JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const savedScroll = sessionStorage.getItem("sidebarScroll_as");
    if (savedScroll) {
      sidebar.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const handleScroll = () => sessionStorage.setItem("sidebarScroll_as", sidebar.scrollTop);
    sidebar.addEventListener("scroll", handleScroll, { passive: true });
    return () => sidebar.removeEventListener("scroll", handleScroll);
  }, []);

  const logout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173";
  };

  const navGroup = (id, icon, label, children) => {
    const isExpanded = expandedSections[id];
    return (
      <div className={`nav-group ${isExpanded ? "expanded" : ""}`} key={id}>
        <button className="nav-group-header" onClick={() => toggleSection(id)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <span className="nav-group-icon">{icon}</span>
            <span className="nav-group-label">{label}</span>
          </div>
          <span className={`nav-group-arrow ${isExpanded ? "open" : ""}`}>›</span>
        </button>
        <div className="nav-group-content" style={{ display: isExpanded ? "block" : "none" }}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .as-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          background: #0b1220;
          color: #fff;
          display: flex;
          flex-direction: column;
          width: 260px;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .as-sidebar::-webkit-scrollbar { display: none; }

        .brand {
          padding: 32px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 18px;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        }
        .brand-name {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          margin: 0;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }
        .brand-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          margin-top: 2px;
          letter-spacing: 0.5px;
        }

        .nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 12px;
        }
        .nav-item-primary {
          margin-bottom: 16px;
        }
        .nav-item-primary a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .nav-item-primary a:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-item-primary a.active {
          background: #6366f1;
        }

        .nav-group {
          margin-bottom: 4px;
        }
        .nav-group-header {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: #fff;
          cursor: pointer;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          text-align: left;
        }
        .nav-group-icon {
          font-size: 16px;
          opacity: 0.8;
        }
        .nav-group-label {
          flex: 1;
        }
        .nav-group-arrow {
          font-size: 14px;
          transition: transform 0.2s;
          opacity: 0.4;
        }
        .nav-group.expanded .nav-group-arrow {
          transform: rotate(90deg);
          opacity: 0.8;
        }

        .nav-group-content {
          padding-bottom: 8px;
        }
        .nav-group-content a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 10px 42px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
          border-radius: 8px;
          margin-bottom: 2px;
        }
        .nav-group-content a:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-group-content a.active {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .logout-container {
          padding: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .btn-logout {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .btn-logout:hover {
          border-color: rgba(255, 255, 255, 0.2);
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
        }
      `}</style>
      
      <aside className="as-sidebar" ref={sidebarRef}>
        <div className="brand">
          <div className="brand-logo">
            {APP_NAME.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="brand-name">{APP_NAME}</h1>
            <p className="brand-subtitle">Super Admin</p>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-item-primary">
            <NavLink to="/dashboard" end className={({ isActive }) => isActive ? "active" : ""}>
              <span>📊 Dashboard</span>
            </NavLink>
          </div>

          <div className="nav-groups-container">
            {navGroup("infra", "🏗️", "Infrastructure", [
              <NavLink key="/restaurants" to="/restaurants" end className={({ isActive }) => isActive ? "active" : ""}>
                <span>✨ Add Restaurant</span>
              </NavLink>,
              <NavLink key="/restaurants/list" to="/restaurants/list" end className={({ isActive }) => isActive ? "active" : ""}>
                <span>📍 Restaurant List</span>
              </NavLink>
            ])}

            {navGroup("comms", "📡", "Communications", [
              <NavLink key="/broadcast" to="/broadcast" end className={({ isActive }) => isActive ? "active" : ""}>
                <span>📣 Broadcast</span>
              </NavLink>,
              <NavLink key="/messages" to="/messages" end className={({ isActive }) => isActive ? "active" : ""}>
                <span>💬 Support Inbox</span>
              </NavLink>
            ])}

            {navGroup("finance", "💰", "Finance", [
              <NavLink key="/subscriptions" to="/subscriptions" end className={({ isActive }) => isActive ? "active" : ""}>
                <span>💳 Subscriptions</span>
              </NavLink>
            ])}
          </div>
        </nav>

        <div className="logout-container">
          <button className="btn-logout" onClick={logout}>
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}