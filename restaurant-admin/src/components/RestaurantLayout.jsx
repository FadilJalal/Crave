import { NavLink, useLocation } from "react-router-dom";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { BASE_URL, api } from "../utils/api";
import { clearRestaurantSession, redirectToFrontend } from "../utils/session";
import { hasFeatureAccess } from "../utils/featureAccess";

export default function RestaurantLayout({ children }) {
  const sidebarRef = useRef(null);
  const location = useLocation();
  const [sub, setSub] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/subscription/mine");
        if (!cancelled && res.data?.success) setSub(res.data.data);
      } catch {
        if (!cancelled) setSub(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  
  let restaurantInfo = null;
  try { restaurantInfo = JSON.parse(localStorage.getItem("restaurantInfo")); } catch {}

  const restaurantLogo = restaurantInfo?.logo ? `${BASE_URL}/images/${restaurantInfo.logo}` : "";
  const restaurantName = restaurantInfo?.name || "Restaurant";
  const logout = () => { clearRestaurantSession(); redirectToFrontend(); };

  // Store scroll position by page route
  const getScrollKey = () => `sidebarScroll_${location.pathname}`;

  // Save sidebar scroll position on every scroll
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      sessionStorage.setItem(getScrollKey(), sidebar.scrollTop.toString());
      console.log("💾 Saved scroll for", location.pathname, ":", sidebar.scrollTop);
    };

    sidebar.addEventListener("scroll", handleScroll, { passive: true });
    return () => sidebar.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Restore sidebar scroll BEFORE paint
  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const savedScroll = parseInt(sessionStorage.getItem(getScrollKey()) || "0", 10);
    if (savedScroll > 0) {
      sidebar.scrollTop = savedScroll;
      console.log("📍 Restored scroll for", location.pathname, "to:", savedScroll);
    }
  }, [location.pathname]);

  // Also save WINDOW scroll position (in case user scrolls the whole page)
  useEffect(() => {
    const handleWindowScroll = () => {
      sessionStorage.setItem(`windowScroll_${location.pathname}`, window.scrollY.toString());
      console.log("💾 Window scroll saved for", location.pathname, ":", window.scrollY);
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [location.pathname]);

  // Restore WINDOW scroll position
  useLayoutEffect(() => {
    const savedWindowScroll = parseInt(sessionStorage.getItem(`windowScroll_${location.pathname}`) || "0", 10);
    if (savedWindowScroll > 0) {
      window.scrollTo(0, savedWindowScroll);
      console.log("📍 Restored window scroll for", location.pathname, "to:", savedWindowScroll);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const subForFeatures = sub
    ? { status: sub.status || "trial", features: sub.features }
    : null;

  const canMenu = !subForFeatures || hasFeatureAccess(subForFeatures, "menu");
  const canBulk = !subForFeatures || hasFeatureAccess(subForFeatures, "bulkUpload");

  const link = (to, label) => (
    <NavLink to={to} className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>
  );

  const linkOrDisabled = (to, label, allowed, reason) => {
    if (allowed) return link(to, label);
    return (
      <span
        className="nav-link-disabled"
        title={reason || "Not available on your current plan"}
        aria-disabled="true"
      >
        {label}
      </span>
    );
  };

  return (
    <div className="ra-shell">
      <aside className="ra-sidebar" ref={sidebarRef}>
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
          {linkOrDisabled("/menu", "🍽️ Menu", canMenu, "Menu management is turned off for your subscription. Upgrade or contact support.")}
          {linkOrDisabled("/add-food", "➕ Add Food", canMenu, "Menu management is turned off for your subscription.")}
          {linkOrDisabled("/bulk-upload", "📦 Bulk Upload", canBulk, "Bulk upload is not included in your plan, or menu management is off.")}

          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 12px 2px" }}>Business</div>
          {link("/orders",         "🧾 Orders")}
          {link("/inventory",      "📦 Inventory")}
          {link("/inventory/analytics", "📊 Inventory Analytics")}
          {link("/customers",      "👥 Customers")}
          {link("/promos",         "🏷️ Promos")}
          {link("/email-campaign", "📧 Campaigns")}

          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 12px 2px" }}>AI Tools</div>
          {link("/ai-insights",    "🧠 AI Insights")}
          {link("/ai-customer-segmentation", "👥 Customer Segmentation")}

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