import { NavLink } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { clearRestaurantSession, redirectToFrontend } from "../utils/session";

export default function RestaurantLayout({ children }) {
  let restaurantInfo = null;
  try { restaurantInfo = JSON.parse(localStorage.getItem("restaurantInfo")); } catch {}

  const restaurantLogo = restaurantInfo?.logo ? `${BASE_URL}/images/${restaurantInfo.logo}` : "";
  const restaurantName = restaurantInfo?.name || "Restaurant";
  const logout = () => { clearRestaurantSession(); redirectToFrontend(); };

  const link = (to, label) => (
    <NavLink to={to} className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>
  );

  return (
    <div className="ra-shell">
      <aside className="ra-sidebar">
        <div className="brand">
          {restaurantLogo ? (
            <img src={restaurantLogo} alt="Logo" style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}
              onError={e => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="brand-badge" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
              {restaurantName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{restaurantName}</h1>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.6, marginTop: 2 }}>Restaurant Control Panel</p>
          </div>
        </div>

        <nav className="nav">
          {link("/dashboard",      "📊 Dashboard")}

          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 12px 2px" }}>Food</div>
          {link("/menu",           "🍽️ Menu")}
          {link("/add-food",       "➕ Add Food")}
          {link("/bulk-upload",    "📦 Bulk Upload")}

          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 12px 2px" }}>Business</div>
          {link("/orders",         "🧾 Orders")}
          {link("/customers",      "👥 Customers")}
          {link("/promos",         "🏷️ Promos")}
          {link("/email-campaign", "📧 Campaigns")}

          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 12px 2px" }}>Account</div>
          {link("/messages",       "💬 Messages")}
          {link("/reviews",        "⭐ Reviews")}
          {link("/settings",       "⚙️ Settings")}
          {link("/subscription",   "💳 Subscription")}
        </nav>

        <div style={{ padding: "12px 0 16px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 4 }}>
          <button className="btn btn-outline logout" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="ra-main">
        <div className="container" style={{ padding: 0 }}>
          {children}
        </div>
      </main>
    </div>
  );
}