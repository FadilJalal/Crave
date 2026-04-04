import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../utils/api";
import { hasFeatureAccess, getTierName } from "../utils/featureAccess";
import UpgradeRequired from "./UpgradeRequired";

/**
 * ProtectedFeature Component
 * Wraps routes that require specific subscription features
 * Shows UpgradeRequired screen if user doesn't have access
 */
export default function ProtectedFeature({ 
  featureName,
  children,
  fallback = "dashboard" // What to redirect to if completely unauthorized
}) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const res = await api.get("/api/subscription/mine");
        if (res.data.success) {
          const sub = res.data.data;
          setSubscription(sub);
          
          // Check if feature is accessible
          const canAccess = hasFeatureAccess(
            { features: sub.features, status: sub.status || "trial" },
            featureName
          );
          setHasAccess(canAccess);
        } else {
          setHasAccess(false);
        }
      } catch (err) {
        console.error("Failed to load subscription", err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };
    
    loadSubscription();
  }, [featureName]);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontSize: "18px",
        color: "#6b7280",
      }}>
        Loading...
      </div>
    );
  }

  if (!hasAccess) {
    const tierName = subscription ? getTierName(subscription) : "Starter";
    return <UpgradeRequired featureName={featureName} tier={tierName} />;
  }

  return children;
}
