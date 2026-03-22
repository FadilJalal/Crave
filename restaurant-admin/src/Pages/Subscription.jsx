import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

const PLANS = {
  basic: {
    name: "Basic",
    price: 299,
    color: "#3b82f6",
    bg: "#eff6ff",
    features: [
      "Unlimited menu items",
      "Order management",
      "Bulk menu upload",
      "Promo codes",
      "Basic analytics",
      "Email support",
    ],
    notIncluded: ["Advanced analytics", "Priority / phone support"],
  },
  pro: {
    name: "Pro",
    price: 399,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    features: [
      "Unlimited menu items",
      "Order management",
      "Bulk menu upload",
      "Promo codes",
      "Basic analytics",
      "Email support",
      "Advanced analytics",
      "Priority / phone support",
    ],
    notIncluded: [],
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
  const [selectedPlan, setSelectedPlan]     = useState("pro");
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
      if (res.data.success) setSub(res.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadSub();
    if (searchParams.get("success") === "1")   showToast("🎉 Payment successful! Your subscription is now active.");
    if (searchParams.get("cancelled") === "1") showToast("Payment cancelled. Your plan was not changed.", "error");
  }, []);

  const handleCheckout = async () => {
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
  const currentPlan   = PLANS[sub?.plan] || null;
  const currentStatus = STATUS_STYLE[sub?.status] || STATUS_STYLE.trial;

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 860 }}>

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
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.6px" }}>Subscription</h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>Manage your plan and billing</p>
        </div>

        {/* Current plan banner */}
        {!loading && sub && (
          <div style={{
            background: currentPlan ? `${currentPlan.bg}` : "#f9fafb",
            border: `1px solid ${currentPlan ? currentPlan.color + "33" : "#e5e7eb"}`,
            borderRadius: 20, padding: "20px 24px", marginBottom: 28,
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: currentPlan?.color || "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                Current Plan
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#111827" }}>
                {currentPlan ? currentPlan.name : "No Plan"}
              </div>
              {sub.expiresAt && (
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {sub.isExpired ? "Expired on" : "Renews"} {formatDate(sub.expiresAt)}
                  {sub.daysLeft > 0 && !sub.isExpired && (
                    <span style={{ color: sub.daysLeft <= 7 ? "#dc2626" : "#15803d", fontWeight: 700, marginLeft: 8 }}>
                      · {sub.daysLeft}d left
                    </span>
                  )}
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, padding: "6px 16px", borderRadius: 999, background: currentStatus.bg, color: currentStatus.color }}>
              {currentStatus.label}
            </span>
          </div>
        )}

        {/* Expiry warning */}
        {!loading && sub?.expiringSoon && !sub?.isExpired && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "12px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>
              Your plan expires in <strong>{sub.daysLeft} days</strong>. Renew below to avoid interruption.
            </div>
          </div>
        )}

        {/* Plan picker */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", marginBottom: 14 }}>Choose a Plan</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {Object.entries(PLANS).map(([key, p]) => {
              const active = selectedPlan === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  style={{
                    border: `2px solid ${active ? p.color : "#e5e7eb"}`,
                    background: active ? p.bg : "white",
                    borderRadius: 18, padding: "20px 18px", cursor: "pointer",
                    boxShadow: active ? `0 4px 20px ${p.color}22` : "none",
                    position: "relative", transition: "all .15s",
                  }}
                >
                  {key === "pro" && (
                    <div style={{ position: "absolute", top: -10, right: 14, background: p.color, color: "white", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                      POPULAR
                    </div>
                  )}
                  <div style={{ fontWeight: 900, fontSize: 17, color: "#111827", marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontWeight: 900, fontSize: 24, color: p.color, marginBottom: 14 }}>
                    AED {p.price}<span style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>/mo</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ fontSize: 12, color: "#374151", display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <span style={{ color: p.color, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>✓</span> {f}
                      </div>
                    ))}
                    {p.notIncluded.map(f => (
                      <div key={f} style={{ fontSize: 12, color: "#d1d5db", display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <span style={{ flexShrink: 0, marginTop: 1 }}>—</span> {f}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Duration picker */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", marginBottom: 12 }}>Choose Duration</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {DURATIONS.map(m => {
              const disc   = m >= 12 ? "Save 20%" : m >= 6 ? "Save 10%" : m >= 3 ? "Save 5%" : null;
              const active = selectedMonths === m;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonths(m)}
                  style={{
                    padding: "10px 20px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                    border: `2px solid ${active ? plan.color : "#e5e7eb"}`,
                    background: active ? plan.bg : "white",
                    fontWeight: 800, fontSize: 13,
                    color: active ? plan.color : "#374151",
                    position: "relative",
                  }}
                >
                  {m} month{m > 1 ? "s" : ""}
                  {disc && (
                    <span style={{ position: "absolute", top: -9, right: -6, background: "#22c55e", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999 }}>
                      {disc}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Order summary + checkout */}
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 20, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", marginBottom: 16 }}>Order Summary</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, color: "#374151" }}>
            <span>{plan.name} Plan × {selectedMonths} month{selectedMonths > 1 ? "s" : ""}</span>
            <span style={{ fontWeight: 700 }}>AED {plan.price} × {selectedMonths}</span>
          </div>
          <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 900, fontSize: 22, color: "#111827" }}>AED {total}</span>
              <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: 6 }}>total</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={paying}
              style={{
                padding: "13px 28px", borderRadius: 14, border: "none",
                background: paying ? "#e5e7eb" : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                color: paying ? "#9ca3af" : "white",
                fontWeight: 900, fontSize: 15, cursor: paying ? "not-allowed" : "pointer",
                fontFamily: "inherit", boxShadow: paying ? "none" : `0 4px 18px ${plan.color}44`,
              }}
            >
              {paying ? "Redirecting…" : "Pay with Card →"}
            </button>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af" }}>
            🔒 Secure payment powered by Stripe
          </div>
        </div>

      </div>
    </RestaurantLayout>
  );
}