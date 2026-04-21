import { NavLink, useLocation } from "react-router-dom";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { BASE_URL, api } from "../utils/api";
import { clearRestaurantSession, redirectToFrontend } from "../utils/session";
import { hasFeatureAccess } from "../utils/featureAccess";
import { useTheme } from "../ThemeContext";

import { useNotifications } from "../context/NotificationContext";
import NotificationCenter from "./NotificationCenter";
import { toast } from "react-toastify";

export default function RestaurantLayout({ children }) {
  const { dark } = useTheme();
  const sidebarRef = useRef(null);
  const sidebarScrollRef = useRef(0);
  const location = useLocation();
  const { orders } = useNotifications();
  const [sub, setSub] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 980);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState(null);

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
  try { restaurantInfo = JSON.parse(localStorage.getItem("restaurantInfo")); } catch { }

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
  const canAiReviewReply = !subForFeatures || hasFeatureAccess(subForFeatures, "aiReviewReply");
  const canAiMarketing = !subForFeatures || hasFeatureAccess(subForFeatures, "aiMarketingCampaigns");
  const canAiLabor = !subForFeatures || hasFeatureAccess(subForFeatures, "aiLaborOptimization");

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
      <div
        key={to}
        className="nav-link-disabled"
        onClick={() => setLockedFeature({ label, to })}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>{label}</span>
        </div>
        <span className="pro-pill">PRO</span>
      </div>
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
          padding-top: 20px;
        }
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
          object-fit: cover;
        }
        .brand-name {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          margin: 0;
          line-height: 1.1;
        }
        .brand-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          margin-top: 2px;
        }
        .nav-item-primary {
          margin: 0 12px 16px;
        }
        .nav-item-primary a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          color: rgba(255,255,255,0.7);
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .nav-item-primary a:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }
        .nav-item-primary a.active {
          color: #fff;
          background: #6366f1;
        }
        .nav-group {
          margin-bottom: 4px;
        }
        .nav-group-header {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 12px 20px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .nav-group-content {
          padding-bottom: 8px;
        }
        .nav-group-content a, .nav-group-content .nav-link-disabled {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px 10px 48px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
          border-radius: 8px;
          margin: 0 12px;
        }
        .nav-group-content a:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-group-content a.active {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }
        .nav-link-disabled {
          cursor: pointer;
          opacity: 0.45;
        }
        .nav-link-disabled:hover {
          opacity: 0.8;
          background: rgba(255, 255, 255, 0.05);
        }
        .pro-pill {
          font-size: 9px;
          font-weight: 900;
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
          padding: 1px 5px;
          border-radius: 4px;
        }
        .logout-container {
          padding: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .btn-logout {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-logout:hover {
          border-color: rgba(255,255,255,0.2);
          color: #fff;
          background: rgba(255,255,255,0.03);
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
            <img src={restaurantLogo} alt="Logo" className="brand-logo"
              onError={e => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="brand-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#6366f1", color: "white", fontWeight: 900, fontSize: 16 }}>
              {restaurantName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="brand-name">{restaurantName}</h1>
            <p className="brand-subtitle">Control Center</p>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-item-primary">
            {link("/dashboard", "📊 Dashboard")}
          </div>

          <div className="nav-groups-container">

          {navGroup("management", "⚡", "Management", [
            linkOrDisabled("/menu", "🍽️ Menu & Dishes", canMenu),
            linkOrDisabled("/add-food", "➕ Add New Food", canMenu),
            linkOrDisabled("/bulk-upload", "📦 Bulk Quick Upload", canBulk),
            link("/orders", "🧾 Active Orders"),
            link("/inventory", "📦 Inventory & Stock"),
            link("/labor", "👷 Staff & Labor"),
          ])}

          {navGroup("growth", "🚀", "Growth & AI", [
            linkOrDisabled("/coupons", "🏷️ AI Promo Generator", canAiPromo),
            linkOrDisabled("/email-campaign", "📧 AI Campaigns", canAiMarketing),
            linkOrDisabled("/ai-insights", "🧠 AI Insights", canAiInsights),
            linkOrDisabled("/ai-labor-optimizer", "🕒 AI Labor Optimizer", canAiLabor),
            linkOrDisabled("/ai-customer-segmentation", "👥 AI Segmentation", canAiSegmentation),
            linkOrDisabled("/review-reply", "💬 Review Reply AI", canAiReviewReply),
          ])}

          {navGroup("finance", "💰", "Finance & Data", [
            link("/revenue", "💰 Revenue"),
            link("/finance", "🏦 Billing & Payouts"),
            link("/customers", "👥 Customers"),
            link("/inventory/analytics", "📊 Stock Analytics"),
          ])}

          {navGroup("ops", "⚙️", "Operations", [
            link("/messages", "💬 Messages"),
            link("/reviews", "⭐ Reviews"),
            link("/settings", "⚙️ Settings"),
            link("/subscription", "💳 Subscription"),
          ])}
          </div>
        </nav>

        <div className="logout-container">
          <button className="btn-logout" onClick={logout}>
            <span>🚪</span>
            <span>Logout System</span>
          </button>
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

        <div className="container" style={{ padding: "30px 40px" }}>
          {children}
        </div>
      </main>

      {/* Premium Feature Locked Modal */}
      {lockedFeature && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
          background: dark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.4)", 
          backdropFilter: "blur(12px)", padding: 20
        }} onClick={() => setLockedFeature(null)}>
          <div 
            style={{
              background: dark ? "#0b1220" : "#ffffff", 
              borderRadius: 32, width: "100%", maxWidth: 440,
              padding: 40, textAlign: "center", 
              border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.05)",
              boxShadow: dark ? "0 30px 60px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.1)", 
              position: "relative",
              animation: "modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>
            <div style={{ fontSize: 72, marginBottom: 28, filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.1))" }}>🚀</div>
            <h3 style={{ 
              fontSize: 28, 
              fontWeight: 950, 
              color: dark ? "#fff" : "#1e293b", 
              marginBottom: 14,
              letterSpacing: "-0.5px"
            }}>
              Enterprise Exclusive
            </h3>
            <p style={{ 
              fontSize: 16, 
              color: dark ? "rgba(255,255,255,0.6)" : "#64748b", 
              lineHeight: 1.6, 
              marginBottom: 36,
              padding: "0 10px"
            }}>
              The <strong style={{ color: dark ? "#fff" : "#1e293b" }}>{lockedFeature.label.replace(/[^a-zA-Z0-9 ]/g, '').trim()}</strong> tool is 
              exclusive to our Enterprise tier. Upgrade now to unlock advanced AI capabilities.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button 
                onClick={() => {
                  setLockedFeature(null);
                  window.location.href = "/subscription";
                }}
                style={{
                  padding: "18px", borderRadius: 18, border: "none",
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer",
                  boxShadow: "0 10px 25px rgba(99, 102, 241, 0.4)",
                  transition: "transform 0.2s ease"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                View Plans & Pricing
              </button>
              <button 
                onClick={() => setLockedFeature(null)}
                style={{
                  padding: "14px", borderRadius: 18, 
                  border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
                  background: "transparent", 
                  color: dark ? "rgba(255,255,255,0.5)" : "#94a3b8", 
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.03)" : "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                Maybe Later
              </button>
            </div>
            <button 
              onClick={() => setLockedFeature(null)}
              style={{
                position: "absolute", top: 24, right: 24, background: "none",
                border: "none", color: dark ? "rgba(255,255,255,0.2)" : "#cbd5e1", 
                cursor: "pointer", fontSize: 22, transition: "color 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.color = dark ? "#fff" : "#1e293b"}
              onMouseLeave={e => e.currentTarget.style.color = dark ? "rgba(255,255,255,0.2)" : "#cbd5e1"}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}