// Feature access control utility

const BLOCKED_STATUSES = new Set(["expired", "cancelled"]);

/**
 * Check if a subscription has access to a feature
 * @param {Object} subscription - Must include `status` and optional `features` (from /api/subscription/mine)
 * @param {string} featureName - e.g. 'menu', 'bulkUpload', 'inventory'
 */
export const hasFeatureAccess = (subscription, featureName) => {
  if (!subscription) return false;
  if (BLOCKED_STATUSES.has(subscription.status)) return false;

  const features = subscription.features;
  if (!features || typeof features !== "object") return true;

  if (featureName === "bulkUpload" && features.menu === false) return false;

  const v = features[featureName];
  if (v === false) return false;
  return true;
};

/**
 * Get all unlocked features for a subscription
 * @param {Object} subscription - Restaurant subscription object
 * @returns {Array<string>} Array of feature names user has access to
 */
export const getAccessibleFeatures = (subscription) => {
  if (!subscription || !subscription.features) return [];
  if (BLOCKED_STATUSES.has(subscription.status)) return [];

  return Object.keys(subscription.features).filter(
    (feature) => subscription.features[feature] !== false
  );
};

/**
 * Feature list with descriptions for upgrade prompts
 */
export const FEATURE_DESCRIPTIONS = {
  menu: "Create and manage your restaurant menu, items, and pricing",
  bulkUpload: "Upload multiple menu items at once from a spreadsheet",
  // Marketing
  broadcasts: "Send promotional broadcast messages to all customers",
  emailCampaigns: "Create and schedule targeted email campaigns",
  aiMarketingCampaigns: "AI-powered targeted marketing campaigns and suggestions",
  
  // Advanced Inventory
  inventory: "Real-time inventory tracking and management",
  inventoryAnalytics: "Detailed inventory analytics and insights",
  
  // Customer Management
  customers: "Access customer database and detailed analytics",
  reviews: "Manage and respond to customer reviews",
  
  // AI Features
  aiPromoGenerator: "AI-generated promo campaign suggestions",
  aiInsights: "AI-powered sales forecasts and insights",
  aiCustomerSegmentation: "Behavioral customer segmentation & targeting",
  aiReviewReply: "AI-powered automated review responses",
  aiLaborOptimization: "AI-driven staff scheduling and labor optimization",
  
  // Analytics
  analytics: "Advanced analytics and reporting dashboard",
};

/**
 * Get tier name from subscription
 */
export const getTierName = (subscription) => {
  const plans = {
    basic: "Basic",
    starter: "Basic",
    professional: "Enterprise",
    enterprise: "Enterprise",
  };
  return plans[subscription?.plan] || "Free";
};
