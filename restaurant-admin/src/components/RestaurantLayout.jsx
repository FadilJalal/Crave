import { NavLink, useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { clearRestaurantSession, redirectToFrontend } from "../utils/session";

export default function RestaurantLayout({ children }) {
  const navigate = useNavigate();

  let restaurantInfo = null;
  try {
    restaurantInfo = JSON.parse(localStorage.getItem("restaurantInfo"));
  } catch {
    restaurantInfo = null;
  }

  const restaurantLogo =
    restaurantInfo?.logo ? `${BASE_URL}/images/${restaurantInfo.logo}` : "";

  const restaurantName = restaurantInfo?.name || "Restaurant";

  const logout = () => {
    clearRestaurantSession();
    redirectToFrontend();
  };

  return (
    <div className="ra-shell">
      <aside className="ra-sidebar">
        <div className="brand">
          {restaurantLogo ? (
            <img
              src={restaurantLogo}
              alt="Restaurant Logo"
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                objectFit: "cover",
                border: "1px solid rgba(0,0,0,0.08)",
                flexShrink: 0,
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="brand-badge"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 900,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {restaurantName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
              {restaurantName}
            </h1>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.6, marginTop: 2 }}>
              Restaurant Control Panel
            </p>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/menu" className={({ isActive }) => (isActive ? "active" : "")}>
            🍽️ Menu
          </NavLink>
          <NavLink to="/add-food" className={({ isActive }) => (isActive ? "active" : "")}>
            ➕ Add Food
          </NavLink>
          <NavLink to="/bulk-upload" className={({ isActive }) => (isActive ? "active" : "")}>
            📦 Bulk Upload
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => (isActive ? "active" : "")}>
            🧾 Orders
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            ⚙️ Settings
          </NavLink>
        </nav>

        <button className="btn btn-outline logout" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="ra-main">
<div className="container" style={{ padding: 0 }}>
          {children}
        </div>
      </main>
    </div>
  );
}