import { NavLink } from "react-router-dom";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Crave.";

export default function Sidebar() {
  const logout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174";
  };

  return (
    <aside className="as-sidebar">
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
        </nav>
      </div>

      <button className="btn-outline logout-btn" onClick={logout}>
        Logout
      </button>
    </aside>
  );
}