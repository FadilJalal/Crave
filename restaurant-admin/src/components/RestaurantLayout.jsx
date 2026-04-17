import { NavLink, useLocation } from "react-router-dom";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { BASE_URL, api } from "../utils/api";
import { clearRestaurantSession, redirectToFrontend } from "../utils/session";
import { hasFeatureAccess } from "../utils/featureAccess";
import { useTheme } from "../ThemeContext";

import { useNotifications } from "../context/NotificationContext";
import NotificationCenter from "./NotificationCenter";

export default function RestaurantLayout({ children }) {
  const sidebarRef = useRef(null);
  const sidebarScrollRef = useRef(0);
  const location = useLocation();
  const { orders } = useNotifications();
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

  const link = (to, label) => {
    const isOrders = to === "/orders";
    const newCount = isOrders ? orders.filter(o => o.status === "Order Placed").length : 0;

    return (
      <NavLink key={to} to={to} end className={({ isActive }) => isActive ? "active" : ""}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span>{label}</span>
          {newCount > 0 && (
            <span style={{ 
              background: "#ef4444", color: "white", fontSize: 10, fontWeight: 900,
              minWidth: 18, height: 18, borderRadius: 9, display: "flex", 
              alignItems: "center", justifyContent: "center", padding: "0 5px",
              boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)"
            }}>
              {newCount}
            </span>
          )}
        </div>
      </NavLink>
    );
  };

  const linkOrDisabled = (to, label, allowed, reason) => {
    if (allowed) return link(to, label);
    return (
      <span
        key={to}
        className="nav-link-disabled"
        title={reason || "Not available on your current plan"}
        aria-disabled="true"
      >
        {label}
      </span>
    );
  };

  const [expandedSections, setExpandedSections] = useState(() => {
    try {
      const saved = localStorage.getItem("ra_sidebar_expanded");
      if (saved) return JSON.parse(saved);
    } catch { }
    return { management: true, growth: false, finance: false, ops: false };
  });

  useEffect(() => {
    localStorage.setItem("ra_sidebar_expanded", JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
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
        <div className="nav-group-content">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="ra-shell">
      <style>{`
        .ra-sidebar {
          background: #0b1220;
          color: #fff;
        }
        .nav-group {
          margin-bottom: 8px;
          border-radius: 12px;
          transition: background 0.3s ease, margin 0.3s ease;
        }
        .nav-group.expanded {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin: 4px 6px;
        }
        .nav-group-header {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-weight: 800;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.2s ease;
        }
        .nav-group.expanded .nav-group-header {
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
          padding-left: 16px;
        }
        .nav-group-icon {
          margin-right: 12px;
          font-size: 16px;
        }
        .nav-group-label {
          flex: 1;
          text-align: left;
        }
        .nav-group-arrow {
          font-size: 18px;
          transition: transform 0.3s ease;
          opacity: 0.5;
        }
        .nav-group.expanded .nav-group-arrow {
          transform: rotate(90deg);
          opacity: 1;
          color: var(--primary);
        }
        .nav-group-content {
          padding: 4px 0 8px;
          display: none;
        }
        .nav-group.expanded .nav-group-content {
          display: block;
          max-height: 2000px;
          opacity: 1;
        }
        .nav-group-content a, .nav-group-content .nav-link-disabled {
          display: block;
          padding: 10px 16px 10px 44px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
        }
        .nav-group-content a:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-group-content a.active {
          color: var(--sidebar-active-text);
          background: var(--sidebar-active-bg);
          border: 1px solid var(--sidebar-active-border);
          border-radius: 8px;
          margin: 0 8px;
          font-weight: 800;
        }
      `}</style>
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
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--sidebar-muted)" }}>Restaurant Control Panel</p>
          </div>
        </div>

        <nav className="nav">
          {link("/dashboard",      "📊 Dashboard")}

          {navGroup("management", "⚡", "Management", [
              linkOrDisabled("/menu", "🍽️ Menu & Dishes", canMenu),
              linkOrDisabled("/add-food", "➕ Add New Food", canMenu),
              linkOrDisabled("/bulk-upload", "📦 Bulk Quick Upload", canBulk),
              link("/orders",         "🧾 Active Orders"),
              link("/inventory",      "📦 Inventory & Stock"),
          ])}
          
          {navGroup("growth", "🚀", "Growth & AI", [
              linkOrDisabled("/coupons", "🏷️ AI Promo Lab", canAiPromo),
              link("/ai-coupon-strategist", "🎯 Coupon Strategist"),
              link("/email-campaign", "📧 AI Campaigns"),
              linkOrDisabled("/ai-insights", "🧠 AI Insights", canAiInsights),
              linkOrDisabled("/ai-customer-segmentation", "👥 AI Segmentation", canAiSegmentation),
              link("/review-reply", "💬 Review Reply AI"),
          ])}
          
          {navGroup("finance", "💰", "Finance & Data", [
              link("/revenue",        "💰 Revenue"),
              link("/finance",        "🏦 Billing & Payouts"),
              link("/customers",      "👥 Customers"),
              link("/inventory/analytics", "📊 Stock Analytics"),
          ])}

          {navGroup("ops", "⚙️", "Operations", [
              link("/messages",       "💬 Messages"),
              link("/reviews",        "⭐ Reviews"),
              link("/settings",       "⚙️ Settings"),
              link("/subscription",   "💳 Subscription"),
          ])}
        </nav>

        <div style={{ padding: "12px 0 16px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 4 }}>
          <button className="btn btn-outline logout" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="ra-main">
        {/* Desktop Topbar */}
        {!isMobile && (
          <header style={{
            height: 80, padding: "0 40px", display: "flex", alignItems: "center", 
            justifyContent: "space-between", background: "var(--bg)", 
            borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 100
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: "-0.8px" }}>
                {location.pathname === "/dashboard" ? "Dashboard Overview" : 
                 location.pathname === "/orders" ? "Active Orders" :
                 location.pathname === "/inventory" ? "Inventory Management" : "Restaurant Admin"}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                {new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <button 
                onClick={useTheme().toggle}
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  border: `1px solid ${useTheme().dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)"}`,
                  background: useTheme().dark ? "rgba(255,255,255,0.1)" : "#f8fafc",
                  color: useTheme().dark ? "white" : "#1e293b",
                  cursor: "pointer", backdropFilter: "blur(12px)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  transition: "all 0.3s ease",
                  boxShadow: useTheme().dark ? "none" : "0 2px 8px rgba(0,0,0,0.04)"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                {useTheme().dark ? "☀️" : "🌙"}
              </button>
              <NotificationCenter dark={useTheme().dark} />
              <div style={{ width: 1, height: 24, background: "var(--border)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 900 }}>{restaurantName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>Restaurant Admin</div>
                </div>
                {restaurantLogo ? (
                   <img src={restaurantLogo} alt="Logo" style={{ width: 38, height: 38, borderRadius: 12, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--sidebar-p)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                    {restaurantName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {isMobile && (
          <div className="ra-mobile-topbar">
            <button className="ra-menu-btn" type="button" onClick={() => setSidebarOpen(true)}>
              ☰ Menu
            </button>
            <div className="ra-mobile-title">{restaurantName}</div>
          </div>
        )}

        <div className="container" style={{ paddingTop: 5 }}>
          {children}
        </div>
      </main>
    </div>
  );
}