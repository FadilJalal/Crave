import { NavLink } from "react-router-dom";
import { useEffect, useRef, useLayoutEffect } from "react";
import { useTheme } from "../ThemeContext";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Crave.";

export default function Sidebar() {
  const sidebarRef = useRef(null);
  const { dark, toggle } = useTheme();

  // Restore scroll position immediately on mount
  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const savedScroll = sessionStorage.getItem("sidebarScroll");
    if (savedScroll) {
      console.log("📍 Restoring sidebar scroll to:", savedScroll);
      sidebar.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  // Save scroll position on scroll events
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      const pos = sidebar.scrollTop;
      console.log("💾 Saving sidebar scroll:", pos);
      sessionStorage.setItem("sidebarScroll", pos);
    };

    sidebar.addEventListener("scroll", handleScroll, { passive: true });

    return () => sidebar.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore scroll after every render
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const savedScroll = sessionStorage.getItem("sidebarScroll");
    if (savedScroll) {
      const position = parseInt(savedScroll, 10);
      // Use requestAnimationFrame for smooth restoration
      requestAnimationFrame(() => {
        sidebar.scrollTop = position;
        console.log("📍 Restored scroll position:", position);
      });
    }
  });

  const logout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174";
  };

  return (
    <aside className="as-sidebar" ref={sidebarRef}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Brand */}
        <div className="brand">
          <div className="brand-badge">
            {APP_NAME.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>{APP_NAME}</h1>
            <p>Super Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="as-nav">
          <div className="nav-group">
            <span className="nav-group-label">MGMT</span>
            <NavLink to="/dashboard" end className="nav-item">
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </NavLink>
          </div>

          <div className="nav-group">
            <span className="nav-group-label">INFRASTRUCTURE</span>
            <NavLink to="/restaurants" end className="nav-item">
              <span className="nav-icon">✨</span>
              <span className="nav-text">Add Restaurant</span>
            </NavLink>
            <NavLink to="/restaurants/list" end className="nav-item">
              <span className="nav-icon">📍</span>
              <span className="nav-text">Restaurant List</span>
            </NavLink>
          </div>

          <div className="nav-group">
            <span className="nav-group-label">COMMUNICATIONS</span>
            <NavLink to="/broadcast" end className="nav-item">
              <span className="nav-icon">📣</span>
              <span className="nav-text">Broadcast</span>
            </NavLink>
            <NavLink to="/messages" end className="nav-item">
              <span className="nav-icon">💬</span>
              <span className="nav-text">Support Inbox</span>
            </NavLink>
          </div>

          <div className="nav-group">
            <span className="nav-group-label">FINANCE</span>
            <NavLink to="/subscriptions" end className="nav-item">
              <span className="nav-icon">💳</span>
              <span className="nav-text">Subscriptions</span>
            </NavLink>
          </div>
        </nav>
      </div>

      <div className="as-sidebar-footer">
        <button 
          className="as-theme-toggle" 
          onClick={toggle}
          title={dark ? "Switch to Light Cloud" : "Enter Midnight Mode"}
        >
          <div className="toggle-track">
            <div className={`toggle-thumb ${dark ? 'dark' : ''}`}>
               {dark ? '🌙' : '☀️'}
            </div>
            <span className="toggle-text">{dark ? 'MIDNIGHT' : 'CLOUD'}</span>
          </div>
        </button>

        <button className="as-logout-btn" onClick={logout}>
          <span className="nav-icon">🔌</span>
          LOGOUT SYSTEM
        </button>
      </div>
    </aside>
  );
}