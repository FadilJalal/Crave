import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { hasFeatureAccess, getTierName } from "../utils/featureAccess";
import UpgradeRequired from "./UpgradeRequired";

const SUBSCRIPTION_CACHE_KEY = "restaurant_subscription_cache";

const readCachedSubscription = () => {
  try {
    const raw = sessionStorage.getItem(SUBSCRIPTION_CACHE_KEY) || localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeCachedSubscription = (sub) => {
  try {
    const serialized = JSON.stringify(sub || {});
    sessionStorage.setItem(SUBSCRIPTION_CACHE_KEY, serialized);
    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, serialized);
  } catch {
    // ignore storage write issues
  }
};

/**
 * ProtectedFeature Component
 * Wraps routes that require specific subscription features
 * Shows UpgradeRequired screen if user doesn't have access
 */
export default function ProtectedFeature({ 
  featureName,
  children
}) {
  const initialSubscription = readCachedSubscription();
  const [subscription, setSubscription] = useState(initialSubscription);
  const [loading, setLoading] = useState(!initialSubscription);
  const [hasAccess, setHasAccess] = useState(() => {
    if (!initialSubscription) return false;
    return hasFeatureAccess(
      { features: initialSubscription.features, status: initialSubscription.status || "trial" },
      featureName
    );
  });

  useEffect(() => {
    if (!subscription) return;
    const canAccess = hasFeatureAccess(
      { features: subscription.features, status: subscription.status || "trial" },
      featureName
    );
    setHasAccess(canAccess);
  }, [featureName, subscription]);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const res = await api.get("/api/subscription/mine");
        if (res.data.success) {
          const sub = res.data.data;
          setSubscription(sub);
          writeCachedSubscription(sub);
          
          // Check if feature is accessible
          const canAccess = hasFeatureAccess(
            { features: sub.features, status: sub.status || "trial" },
            featureName
          );
          setHasAccess(canAccess);
        } else {
          if (!initialSubscription) setHasAccess(false);
        }
      } catch (err) {
        console.error("Failed to load subscription", err);
        if (!initialSubscription) setHasAccess(false);
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
    const tierName = subscription ? getTierName(subscription) : "Basic";
    return <UpgradeRequired featureName={featureName} tier={tierName} />;
  }

  return children;
}
