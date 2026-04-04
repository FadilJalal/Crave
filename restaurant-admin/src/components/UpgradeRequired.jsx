import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { FEATURE_DESCRIPTIONS } from "../utils/featureAccess";

/**
 * UpgradeRequired Component
 * Shows when a user tries to access a feature not in their subscription tier
 */
export default function UpgradeRequired({ featureName, tier = "Starter" }) {
  const [currentPlan, setCurrentPlan] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const res = await api.get("/api/subscription/mine");
        if (res.data.success) {
          setCurrentPlan(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load subscription", err);
      }
    };
    loadSubscription();
  }, []);

  const featureDescription = FEATURE_DESCRIPTIONS[featureName] || "This premium feature";
  const tierColors = {
    Starter: "#3b82f6",
    Professional: "#8b5cf6",
    Enterprise: "#f59e0b",
  };

  /** When a feature is explicitly off (e.g. menu disabled), show clear copy instead of generic email-marketing text */
  const featureLockedCopy = {
    menu: {
      title: "Menu management isn’t available",
      description: featureDescription,
      recommendation: "View plans & billing",
    },
    bulkUpload: {
      title: "Bulk upload isn’t available",
      description: featureDescription,
      recommendation: "View plans & billing",
    },
  };

  const upgradeMessage = {
    Starter: {
      title: "Unlock Email Marketing →",
      description: "Send targeted email campaigns and promotions",
      recommendation: "Upgrade to Professional",
    },
    Professional: {
      title: "Go Premium →",
      description: "Unlock all advanced AI features and priority support",
      recommendation: "Choose Enterprise",
    },
    Enterprise: {
      title: "Contact Support",
      description: "For custom features or API access, reach out to our team",
      recommendation: "Contact our support team",
    },
  };

  const tierColor = tierColors[tier] || "#6b7280";
  const locked = featureLockedCopy[featureName];
  const message = locked || upgradeMessage[tier] || {};

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: "white",
        borderRadius: "24px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
        maxWidth: "520px",
        width: "100%",
        padding: "60px 40px",
        textAlign: "center",
      }}>
        
        {/* Lock Icon */}
        <div style={{
          fontSize: "64px",
          marginBottom: "24px",
          opacity: 0.8,
        }}>
          🔒
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "28px",
          fontWeight: "900",
          color: "#111827",
          margin: "0 0 12px",
          lineHeight: "1.2",
        }}>
          {message.title || "Premium Feature"}
        </h1>

        {/* Description */}
        <p style={{
          fontSize: "15px",
          color: "#6b7280",
          margin: "0 0 32px",
          lineHeight: "1.6",
        }}>
          {locked
            ? message.description
            : (message.description || `${featureDescription} is not included in your current plan.`)}
        </p>

        {/* Current Plan Info */}
        {currentPlan && (
          <div style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "32px",
            textAlign: "left",
          }}>
            <div style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}>
              Your Current Plan
            </div>
            <div style={{
              fontSize: "20px",
              fontWeight: "900",
              color: "#111827",
              marginBottom: "8px",
            }}>
              {currentPlan.plan.charAt(0).toUpperCase() + currentPlan.plan.slice(1)}
            </div>
            <div style={{
              fontSize: "13px",
              color: "#6b7280",
            }}>
              AED {currentPlan.price}/month
              {currentPlan.expiresAt ? ` • Expires ${new Date(currentPlan.expiresAt).toLocaleDateString("en-AE")}` : ""}
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div style={{
          display: "flex",
          gap: "12px",
          flexDirection: "column",
        }}>
          <button
            onClick={() => navigate("/subscription")}
            style={{
              padding: "14px 28px",
              borderRadius: "12px",
              border: "none",
              background: `linear-gradient(135deg, ${tierColor}, ${tierColor}dd)`,
              color: "white",
              fontWeight: "900",
              fontSize: "15px",
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: `0 6px 20px ${tierColor}44`,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = `0 10px 28px ${tierColor}55`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = `0 6px 20px ${tierColor}44`;
            }}
          >
            {message.recommendation || "Choose a Plan"}
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
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f3f4f6";
              e.target.style.borderColor = "#d1d5db";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
              e.target.style.borderColor = "#e5e7eb";
            }}
          >
            Back to Dashboard
          </button>
        </div>

        {/* Help Text */}
        <p style={{
          fontSize: "12px",
          color: "#9ca3af",
          margin: "20px 0 0",
          lineHeight: "1.5",
        }}>
          Need help? {" "}
          <a href="mailto:support@crave.ae" style={{
            color: tierColor,
            textDecoration: "none",
            fontWeight: "600",
          }}>
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  );
}
