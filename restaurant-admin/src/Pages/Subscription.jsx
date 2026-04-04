import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

const PLANS = {
  starter: {
    tier: 1,
    name: "Starter",
    price: 299,
    color: "#3b82f6",
    bg: "#eff6ff",
    description: "Perfect for small restaurants",
    features: [
      // Basic
      { name: "dashboard", label: "Dashboard & Reports", included: true },
      { name: "orders", label: "Order Management", included: true },
      { name: "menu", label: "Menu Management", included: true },
      { name: "messages", label: "Customer Messaging", included: true },
      // Marketing
      { name: "promoCodes", label: "Promo Codes", included: true },
      { name: "broadcasts", label: "Broadcast Messages", included: false },
      { name: "emailCampaigns", label: "Email Campaigns", included: false },
      // Inventory
      { name: "inventory", label: "Inventory Management", included: false },
      // Advanced
      { name: "customers", label: "Customer Analytics", included: false },
      { name: "aiInsights", label: "AI Insights & Forecasts", included: false },
    ],
  },
  professional: {
    tier: 2,
    name: "Professional",
    price: 399,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    description: "For growing restaurants",
    badge: "MOST POPULAR",
    features: [
      { name: "menuItems", label: "Unlimited Menu Items", included: true },
      { name: "bulkUpload", label: "Bulk Menu Upload", included: true },
      { name: "promoCodes", label: "Promo Codes", included: true },
      { name: "inventory", label: "Inventory Management", included: true },
      { name: "emailCampaigns", label: "Email Campaigns", included: true },
      { name: "aiMenuGenerator", label: "AI Menu Generator", included: true },
      { name: "advancedAnalytics", label: "Advanced Analytics", included: true },
      { name: "customerSegmentation", label: "AI Customer Segmentation", included: true },
    ],
  },
  enterprise: {
    tier: 3,
    name: "Enterprise",
    price: 599,
    color: "#f59e0b",
    bg: "#fffbeb",
    description: "For large & established restaurants",
    badge: "PREMIUM",
    features: [
      { name: "menuItems", label: "Unlimited Menu Items", included: true },
      { name: "bulkUpload", label: "Bulk Menu Upload", included: true },
      { name: "promoCodes", label: "Promo Codes", included: true },
      { name: "inventory", label: "Inventory Management", included: true },
      { name: "inventoryAnalytics", label: "Inventory Analytics", included: true },
      { name: "emailCampaigns", label: "Email Campaigns", included: true },
      { name: "broadcasts", label: "Broadcast & Notifications", included: true },
      { name: "aiMenuGenerator", label: "AI Menu Generator", included: true },
      { name: "customerSegmentation", label: "AI Customer Segmentation", included: true },
      { name: "analytics", label: "Advanced Analytics Dashboard", included: true },
    ],
  },
};

const DURATIONS = [1, 3, 6, 12];

const STATUS_STYLE = {
  active:    { color: "#15803d", bg: "#f0fdf4", label: "Active" },
  trial:     { color: "#1d4ed8", bg: "#eff6ff", label: "Trial" },
  expired:   { color: "#dc2626", bg: "#fef2f2", label: "Expired" },
  cancelled: { color: "#6b7280", bg: "#f3f4f6", label: "Cancelled" },
};

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

export default function Subscription() {
  const [searchParams]  = useSearchParams();
  const [sub, setSub]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selectedPlan, setSelectedPlan]     = useState("starter");
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [paying, setPaying] = useState(false);
  const [toast, setToast]   = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSub = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/subscription/mine");
      console.log("📡 Subscription response:", res.data);
      if (res.data.success) {
        console.log("✅ Subscription loaded:", res.data.data);
        setSub(res.data.data);
      } else {
        console.warn("⚠️ API returned false:", res.data.message);
        setSub(null);
      }
    } catch (err) {
      console.error("Failed to load subscription:", err);
      setSub(null);
    }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadSub();
    if (searchParams.get("success") === "1")   showToast("🎉 Payment successful! Your subscription is now active.");
    if (searchParams.get("cancelled") === "1") showToast("Payment cancelled. Your plan was not changed.", "error");
  }, []);

  // Reload subscription data after payment success
  useEffect(() => {
    if (searchParams.get("success") === "1") {
      const sessionId = searchParams.get("sessionId");
      console.log("🎉 Payment successful! Session ID:", sessionId);
      
      if (sessionId) {
        // Confirm payment with backend
        const confirmPayment = async () => {
          try {
            const res = await api.post("/api/subscription/confirm-payment", { sessionId });
            if (res.data.success) {
              console.log("✅ Payment confirmed! Subscription activated.");
              // Wait a moment, then reload subscription data
              setTimeout(() => loadSub(), 500);
            } else {
              console.error("❌ Payment confirmation failed:", res.data.message);
            }
          } catch (err) {
            console.error("❌ Error confirming payment:", err);
          }
        };
        confirmPayment();
      } else {
        // Fallback: just reload after delay if no sessionId
        const timer = setTimeout(() => {
          loadSub();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams]);

  const handleCheckout = async () => {
    if (selectedPlan === "free") return showToast("Free plan doesn't require payment.", "error");
    setPaying(true);
    try {
      const res = await api.post("/api/subscription/checkout", { plan: selectedPlan, months: selectedMonths });
      if (res.data.success && res.data.url) window.location.href = res.data.url;
      else showToast(res.data.message || "Failed to start checkout.", "error");
    } catch {
      showToast("Could not connect to payment server.", "error");
    } finally {
      setPaying(false);
    }
  };

  const plan   = PLANS[selectedPlan];
  const total  = plan.price * selectedMonths;
  const currentPlan   = sub?.plan && sub.plan !== "none" ? PLANS[sub.plan] : null;
  const currentStatus = STATUS_STYLE[sub?.status] || { color: "#6b7280", bg: "#f3f4f6", label: "No Subscription" };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1100 }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${toast.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            color: toast.type === "error" ? "#dc2626" : "#15803d",
            borderRadius: 14, padding: "14px 20px", fontWeight: 700, fontSize: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)", maxWidth: 360,
          }}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#111827", letterSpacing: "-0.6px" }}>Subscription Plans</h2>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "#6b7280" }}>Choose a plan that works for your restaurant</p>
        </div>

        {/* Current plan banner */}
        {!loading && (
          <div style={{
            background: currentPlan ? `${currentPlan.bg}` : "#f3f4f6",
            border: `2px solid ${currentPlan ? currentPlan.color + "44" : "#d1d5db"}`,
            borderRadius: 16, padding: "22px 24px", marginBottom: 36,
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: currentPlan?.color || "#9ca3af", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>
                Your Current Plan
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>
                {currentPlan ? currentPlan.name : "No Active Plan"} {currentPlan && <span style={{ fontSize: 16, color: "#9ca3af" }}>— AED {currentPlan.price}/mo</span>}
              </div>
              {currentPlan && sub?.expiresAt && (
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {sub.isExpired ? "Expired on" : "Renews"} <strong>{formatDate(sub.expiresAt)}</strong>
                  {sub.daysLeft > 0 && !sub.isExpired && (
                    <span style={{ color: sub.daysLeft <= 7 ? "#dc2626" : "#15803d", fontWeight: 700, marginLeft: 8 }}>
                      · {sub.daysLeft}d left
                    </span>
                  )}
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, padding: "8px 18px", borderRadius: 999, background: currentStatus.bg, color: currentStatus.color, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              {currentStatus.label}
            </span>
          </div>
        )}

        {/* No plan helper message */}
        {!loading && !currentPlan && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: "12px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div style={{ fontSize: 13, color: "#0c4a6e", fontWeight: 600 }}>
              Get started by choosing a plan below. Unlock powerful features like inventory management, email campaigns, and AI-powered insights.
            </div>
          </div>
        )}

        {/* Expiry warning */}
        {!loading && sub?.expiringSoon && !sub?.isExpired && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "12px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>
              Your plan expires in <strong>{sub.daysLeft} days</strong>. Upgrade or renew below to avoid interruption.
            </div>
          </div>
        )}

        {/* Plan comparison grid */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
            {Object.entries(PLANS).map(([key, p]) => {
              const isSelected = selectedPlan === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  style={{
                    border: `2px solid ${isSelected ? p.color : "#e5e7eb"}`,
                    background: isSelected ? p.bg : "white",
                    borderRadius: 16, padding: "24px 20px", cursor: "pointer",
                    boxShadow: isSelected ? `0 8px 24px ${p.color}22` : "0 1px 3px rgba(0,0,0,0.1)",
                    position: "relative", transition: "all 0.2s",
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {p.badge && (
                    <div style={{ position: "absolute", top: -12, left: 16, background: p.color, color: "white", fontSize: 9, fontWeight: 900, padding: "4px 12px", borderRadius: 999, letterSpacing: "0.5px" }}>
                      {p.badge}
                    </div>
                  )}
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#111827", marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, fontweight: 500 }}>{p.description}</div>
                  <div style={{ fontWeight: 900, fontSize: 28, color: p.color, marginBottom: 2 }}>
                    {p.price === 0 ? "Free" : `AED ${p.price}`}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 18 }}>{p.price > 0 && "/month"}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(key);
                    }}
                    style={{
                      width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                      background: isSelected ? p.color : "#f3f4f6",
                      color: isSelected ? "white" : "#374151",
                      fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.2s", marginBottom: 16,
                    }}
                  >
                    {isSelected ? "Selected" : "Select"} {key === "professional" ? "" : ""}
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {p.features.slice(0, p.name === "Free" ? 3 : p.name === "Starter" ? 4 : p.name === "Professional" ? 8 : 12).map(f => (
                      <div key={f.name} style={{ fontSize: 12, color: f.included ? "#374151" : "#d1d5db", display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: f.included ? p.color : "#d1d5db", flexShrink: 0, marginTop: 1, fontWeight: 700, fontSize: 13 }}>{f.included ? "✓" : "—"}</span>
                        <span>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Duration & Summary */}
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#111827", marginBottom: 18 }}>Choose Billing Duration</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
            {DURATIONS.map(m => {
              const disc   = m === 12 ? "Save 20%" : m === 6 ? "Save 10%" : m === 3 ? "Save 5%" : null;
              const active = selectedMonths === m;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonths(m)}
                  style={{
                    padding: "11px 18px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                    border: `2px solid ${active ? plan.color : "#e5e7eb"}`,
                    background: active ? plan.bg : "white",
                    fontWeight: 700, fontSize: 13,
                    color: active ? plan.color : "#374151",
                    position: "relative", transition: "all 0.2s",
                  }}
                >
                  {m} month{m > 1 ? "s" : ""}
                  {disc && (
                    <span style={{ position: "absolute", top: -10, right: -8, background: "#10b981", color: "white", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>
                      {disc}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Final checkout summary */}
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {plan.price > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                    {plan.name} Plan × {selectedMonths} month{selectedMonths > 1 ? "s" : ""}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 26, color: "#111827" }}>
                    AED {total}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    {total > 0 ? `${(total / selectedMonths).toFixed(0)}/month` : "—"}
                  </div>
                </>
              ) : (
                <div style={{ fontWeight: 900, fontSize: 20, color: plan.color }}>
                  Free forever
                </div>
              )}
            </div>
            <button
              onClick={handleCheckout}
              disabled={paying || (selectedPlan === "free" && sub?.plan === "free")}
              style={{
                padding: "14px 32px", borderRadius: 12, border: "none",
                background: paying ? "#e5e7eb" : `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)`,
                color: paying ? "#9ca3af" : "white",
                fontWeight: 900, fontSize: 15, cursor: (paying || (selectedPlan === "free" && sub?.plan === "free")) ? "not-allowed" : "pointer",
                fontFamily: "inherit", boxShadow: paying ? "none" : `0 6px 20px ${plan.color}44`,
                transition: "all 0.2s",
              }}
            >
              {paying ? "Processing…" : selectedPlan === "free" ? "Get Free Plan" : "Continue to Payment →"}
            </button>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
            🔒 Secure payment powered by Stripe
          </div>
        </div>

      </div>
    </RestaurantLayout>
  );
}