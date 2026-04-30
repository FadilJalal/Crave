import { NavLink } from "react-router-dom";
import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { useTheme } from "../ThemeContext";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Crave.";

export default function Sidebar() {
  const sidebarRef = useRef(null);
  const { dark, toggle } = useTheme();
  const [expandedSections, setExpandedSections] = useState(() => {
    try {
      const saved = localStorage.getItem("as_sidebar_expanded");
      if (saved) return JSON.parse(saved);
    } catch { }
    return { mgmt: true, infra: true, comms: true, finance: true };
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
    const savedScroll = sessionStorage.getItem("sidebarScroll");
    if (savedScroll) {
      sidebar.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const handleScroll = () => sessionStorage.setItem("sidebarScroll", sidebar.scrollTop);
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
          <span className="nav-group-icon">{icon}</span>
          <span className="nav-group-label">{label}</span>
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
        .ra-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 20px 16px 0;
          background: #0b1220;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          width: 260px;
          color: #f9fafb;
        }
        .ra-sidebar::-webkit-scrollbar {
          display: none;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 6px;
        }
        .brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #e64a19, #f4511e);
          box-shadow: 0 8px 20px rgba(230, 74, 25, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 18px;
          flex-shrink: 0;
        }
        .brand-name {
          font-size: 16px;
          font-weight: 800;
          color: #f9fafb;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .brand-subtitle {
          font-size: 11px;
          color: rgba(249, 250, 251, 0.62);
          margin-top: 2px;
          text-transform: uppercase;
        }
        .nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          overflow-y: auto;
          padding-right: 2px;
          scrollbar-width: none;
        }
        .nav::-webkit-scrollbar {
          display: none;
        }
        .nav-item-primary {
          margin-bottom: 4px;
        }
        .nav-item-primary a {
          padding: 11px 14px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.76);
          border: 1px solid transparent;
          transition: all .15s ease;
          text-decoration: none;
        }
        .nav-item-primary a:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .nav-item-primary a.active {
          background: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.25);
          color: #ffffff;
        }
        .nav-group {
          margin-bottom: 4px;
        }
        .nav-group-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          background: transparent;
          border: none;
          color: rgba(249, 250, 251, 0.62);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 12px;
          text-align: left;
          margin-top: 4px;
        }
        .nav-group-header:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .nav-group-icon {
          font-size: 16px;
          opacity: 0.8;
        }
        .nav-group-label {
          flex: 1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 11px;
        }
        .nav-group-arrow {
          font-size: 14px;
          transition: transform 0.3s ease;
          opacity: 0.4;
        }
        .nav-group-arrow.open {
          transform: rotate(90deg);
          opacity: 0.8;
        }
        .nav-group-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          opacity: 0;
          padding-left: 14px;
          margin-top: 2px;
        }
        .nav-group.expanded .nav-group-content {
          max-height: 400px;
          opacity: 1;
        }
        .nav-group-content a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.76);
          text-decoration: none;
          transition: all 0.2s;
          border-radius: 8px;
        }
        .nav-group-content a:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.06);
        }
        .nav-group-content a.active {
          color: #fff;
          background: rgba(59, 130, 246, 0.12);
        }
        .logout-container {
          margin-top: auto;
          padding-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .btn-logout {
          width: 100%;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: transparent;
          color: #f9fafb;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all .15s;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .btn-logout:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
      `}</style>
      
      <aside className="ra-sidebar" ref={sidebarRef}>
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