import { NavLink } from "react-router-dom";
import { useEffect, useRef, useLayoutEffect } from "react";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Crave.";

export default function Sidebar() {
  const sidebarRef = useRef(null);

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
        <nav className="nav">
          <NavLink to="/dashboard" end>
            📊 Dashboard
          </NavLink>
          <NavLink to="/restaurants" end>
            ➕ Add Restaurant
          </NavLink>
          <NavLink to="/restaurants/list" end>
            📍 Restaurant List
          </NavLink>
          <NavLink to="/subscriptions" end>
            💳 Subscriptions
          </NavLink>
          <NavLink to="/broadcast" end>
            📣 Broadcast
          </NavLink>
          <NavLink to="/messages" end>
            💬 Messages
          </NavLink>
          <NavLink to="/ai-hub" end>
            🤖 AI Hub
          </NavLink>
        </nav>
      </div>

      <button className="btn-outline logout-btn" onClick={logout}>
        Logout
      </button>
    </aside>
  );
}