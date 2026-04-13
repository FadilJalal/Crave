import { NavLink, useLocation } from "react-router-dom";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { BASE_URL, api } from "../utils/api";
import { clearRestaurantSession, redirectToFrontend } from "../utils/session";
import { hasFeatureAccess } from "../utils/featureAccess";
import { useTheme } from "../ThemeContext";

export default function RestaurantLayout({ children }) {
  const sidebarRef = useRef(null);
  const sidebarScrollRef = useRef(0);
  const location = useLocation();
  const [sub, setSub] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 980);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 980px)");
    const onChange = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) setSidebarOpen(false);
    };

    setIsMobile(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isMobile) return undefined;
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

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
  const { dark, toggle } = useTheme();

  // Keep one global sidebar scroll position across all pages and refreshes.
  const SIDEBAR_SCROLL_KEY = "sidebarScroll_global";

  const saveSidebarScroll = (value) => {
    const numeric = Math.max(0, Number(value) || 0);
    sidebarScrollRef.current = numeric;
    const normalized = String(numeric);
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, normalized);
    localStorage.setItem(SIDEBAR_SCROLL_KEY, normalized);
  };

  const readSidebarScroll = () => {
    if (sidebarScrollRef.current > 0) return sidebarScrollRef.current;
    const sessionValue = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    const localValue = localStorage.getItem(SIDEBAR_SCROLL_KEY);
    return parseInt(sessionValue || localValue || "0", 10);
  };

  // Save sidebar scroll position on every scroll
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      saveSidebarScroll(sidebar.scrollTop);
    };

    sidebar.addEventListener("scroll", handleScroll, { passive: true });
    return () => sidebar.removeEventListener("scroll", handleScroll);
  }, []);

  // On mobile, explicitly restore scroll when menu opens and save it when menu closes.
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || !isMobile) return;

    if (sidebarOpen) {
      const savedScroll = readSidebarScroll();
      if (savedScroll > 0) {
        const raf = requestAnimationFrame(() => {
          sidebar.scrollTop = savedScroll;
        });
        return () => cancelAnimationFrame(raf);
      }
      return undefined;
    }

    saveSidebarScroll(sidebar.scrollTop);
    return undefined;
  }, [isMobile, sidebarOpen]);

  // Save once on unmount as an extra safety net.
  useEffect(() => {
    return () => {
      const sidebar = sidebarRef.current;
      if (sidebar) saveSidebarScroll(sidebar.scrollTop);
    };
  }, []);

  // Restore sidebar scroll after render so it survives full reload + async nav render.
  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const savedScroll = readSidebarScroll();
    if (savedScroll > 0) {
      const raf1 = requestAnimationFrame(() => {
        sidebar.scrollTop = savedScroll;
      });
      const raf2 = requestAnimationFrame(() => {
        sidebar.scrollTop = savedScroll;
      });
      const t1 = setTimeout(() => {
        sidebar.scrollTop = savedScroll;
      }, 60);
      const t2 = setTimeout(() => {
        sidebar.scrollTop = savedScroll;
      }, 180);

      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [location.pathname, sub]);

  const handleSidebarNavClickCapture = () => {
    const sidebar = sidebarRef.current;
    if (sidebar) saveSidebarScroll(sidebar.scrollTop);
  };

  // Also save WINDOW scroll position (in case user scrolls the whole page)
  useEffect(() => {
    const handleWindowScroll = () => {
      sessionStorage.setItem(`windowScroll_${location.pathname}`, window.scrollY.toString());
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [location.pathname]);

  // Restore WINDOW scroll position
  useLayoutEffect(() => {
    const savedWindowScroll = parseInt(sessionStorage.getItem(`windowScroll_${location.pathname}`) || "0", 10);
    if (savedWindowScroll > 0) {
      window.scrollTo(0, savedWindowScroll);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const subForFeatures = sub
    ? { status: sub.status || "trial", features: sub.features }
    : null;

  const canMenu = !subForFeatures || hasFeatureAccess(subForFeatures, "menu");
  const canBulk = !subForFeatures || hasFeatureAccess(subForFeatures, "bulkUpload");
  const canAiPromo = !subForFeatures || hasFeatureAccess(subForFeatures, "aiPromoGenerator");
  const canAiInsights = !subForFeatures || hasFeatureAccess(subForFeatures, "aiInsights");
  const canAiSegmentation = !subForFeatures || hasFeatureAccess(subForFeatures, "aiCustomerSegmentation");

  const link = (to, label) => (
    <NavLink to={to} end className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>
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
      {isMobile && sidebarOpen && <button className="ra-overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`ra-sidebar ${isMobile ? "mobile" : ""} ${sidebarOpen ? "open" : ""}`}
        ref={sidebarRef}
        onClickCapture={handleSidebarNavClickCapture}
      >
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
            <p style={{ margin: 0, fontSize: 12, marginTop: 2 }}>Restaurant Control Panel</p>
          </div>
        </div>

        <nav className="nav">
          {link("/dashboard",      "📊 Dashboard")}

          <div className="ra-nav-section">Food</div>
          {linkOrDisabled("/menu", "🍽️ Menu", canMenu, "Menu management is turned off for your subscription. Upgrade or contact support.")}
          {linkOrDisabled("/add-food", "➕ Add Food", canMenu, "Menu management is turned off for your subscription.")}
          {linkOrDisabled("/bulk-upload", "📦 Bulk Upload", canBulk, "Bulk upload is not included in your plan, or menu management is off.")}

          <div className="ra-nav-section">Business</div>
          {link("/orders",         "🧾 Orders")}
          {link("/revenue",        "💰 Revenue")}
          {link("/inventory",      "📦 Inventory")}
          {link("/inventory/analytics", "📊 Inventory Analytics")}
          {link("/customers",      "👥 Customers")}

          <div className="ra-nav-section">AI Tools</div>
          {link("/coupons", "🏷️ AI Promo Lab")}
          {link("/ai-insights", "🧠 AI Insights")}
          {link("/ai-customer-segmentation", "👥 Customer Segmentation")}
          {link("/email-campaign", "📧 AI Campaigns")}
          {link("/review-reply", "💬 Review Reply")}


          <div className="ra-nav-section">Account</div>
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
        {isMobile && (
          <div className="ra-mobile-topbar">
            <button className="ra-menu-btn" type="button" onClick={() => setSidebarOpen(true)}>
              ☰ Menu
            </button>
            <div className="ra-mobile-title">{restaurantName}</div>
          </div>
        )}

        <div className="container" style={{ padding: 0 }}>
          {children}
        </div>
      </main>
    </div>
  );
}