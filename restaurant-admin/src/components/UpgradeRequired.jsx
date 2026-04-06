import { useNavigate } from "react-router-dom";
import RestaurantLayout from "./RestaurantLayout";

const AI_FEATURE_CONFIG = {
  aiPromoGenerator: {
    pageTitle: "AI Promo Generator",
    pageSubtitle: "Generate AI-powered promo campaigns",
    cardDesc: "AI Promo Generator is available only on the Enterprise plan.",
    cardDesc2: "Automate promotions with intelligent AI suggestions.",
  },
  aiInsights: {
    pageTitle: "AI Insights",
    pageSubtitle: "AI-powered business analytics",
    cardDesc: "AI Insights is available only on the Enterprise plan.",
    cardDesc2: "Get predictive sales forecasts, menu insights, and churn analysis.",
  },
  aiCustomerSegmentation: {
    pageTitle: "Customer Segmentation",
    pageSubtitle: "AI-powered customer targeting",
    cardDesc: "Customer Segmentation is available only on the Enterprise plan.",
    cardDesc2: "Reach the right customers at the right time with smart segments.",
  },
};

export default function UpgradeRequired({ featureName }) {
  const navigate = useNavigate();
  const aiConfig = AI_FEATURE_CONFIG[featureName];

  if (aiConfig) {
    return (
      <RestaurantLayout>
        <div style={{ maxWidth: 640, margin: "0 auto", background: "#ffffff", border: "1px solid #eceaf5", borderRadius: 26, padding: 26, boxShadow: "0 14px 36px rgba(17,24,39,0.08)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, color: "#111827" }}>
            {aiConfig.pageTitle}
          </h2>
          <p style={{ margin: "0 0 22px", fontSize: 14, color: "#9ca3af" }}>
            {aiConfig.pageSubtitle}
          </p>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background: "linear-gradient(135deg, #f5f3ff 0%, #efe7ff 45%, #ffe5f6 100%)",
              border: "1px solid #8b5cf633",
              borderRadius: 24,
              padding: 34,
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(139, 92, 246, 0.14)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -36,
                right: -24,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0) 70%)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: -48,
                left: -28,
                width: 140,
                height: 140,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(236,72,153,0.28) 0%, rgba(236,72,153,0) 70%)",
              }}
            />

            <div style={{ fontSize: 42, marginBottom: 12, marginTop: 4, filter: "drop-shadow(0 6px 16px rgba(139,92,246,0.35))" }}>💜</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#111827", marginBottom: 10, letterSpacing: "-0.3px" }}>Enterprise Feature</div>
            <div style={{ fontSize: 15, color: "#4b5563", marginBottom: 26, lineHeight: 1.6, maxWidth: 430, marginInline: "auto" }}>
              {aiConfig.cardDesc}<br />
              {aiConfig.cardDesc2}
            </div>
            <a
              href="/subscription"
              style={{
                display: "inline-block",
                padding: "13px 30px",
                borderRadius: 14,
                background: "linear-gradient(90deg, #7c3aed 0%, #8b5cf6 55%, #ec4899 100%)",
                color: "white",
                fontWeight: 900,
                fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 10px 24px rgba(139, 92, 246, 0.35)",
              }}
            >
              View Enterprise Plan &rarr;
            </a>
          </div>
        </div>
      </RestaurantLayout>
    );
  }

  const featureLockedCopy = {
    menu: {
      title: "Menu management isn't available",
      description: "Menu management is turned off for your subscription.",
      recommendation: "View plans & billing",
    },
    bulkUpload: {
      title: "Bulk upload isn't available",
      description: "Bulk upload is not included in your current plan.",
      recommendation: "View plans & billing",
    },
  };

  const message = featureLockedCopy[featureName] || {
    title: "Premium Feature",
    description: "This feature is available only on the Pro (Enterprise) plan.",
    recommendation: "View Pro Plans",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)", maxWidth: "520px", width: "100%", padding: "60px 40px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px", opacity: 0.8 }}>🔒</div>
        <h1 style={{ fontSize: "28px", fontWeight: "900", color: "#111827", margin: "0 0 12px", lineHeight: "1.2" }}>
          {message.title}
        </h1>
        <p style={{ fontSize: "15px", color: "#6b7280", margin: "0 0 32px", lineHeight: "1.6" }}>
          {message.description}
        </p>
        <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
          <button
            onClick={() => navigate("/subscription")}
            style={{
              padding: "14px 28px",
              borderRadius: "12px",
              border: "none",
              background: "#8b5cf6",
              color: "white",
              fontWeight: "900",
              fontSize: "15px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {message.recommendation}
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "14px 28px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              background: "white",
              color: "#374151",
              fontWeight: "700",
              fontSize: "15px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
