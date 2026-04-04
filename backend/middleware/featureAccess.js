/**
 * Feature access middleware for backend
 * Checks if restaurant subscription has access to a specific feature
 */

import restaurantModel from "../models/restaurantModel.js";

/**
 * Check if restaurant has access to a feature
 * Usage: router.post("/route", requireFeature("inventory"), handler)
 */
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.restaurantId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const restaurant = await restaurantModel
        .findById(req.restaurantId)
        .select("subscription");

      if (!restaurant) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      const { subscription } = restaurant;
      
      // Check if subscription is active
      if (subscription?.status !== "active") {
        return res.status(403).json({
          success: false,
          message: `This feature requires an active subscription. Current status: ${subscription?.status || "none"}`,
          requiresPayment: true,
        });
      }

      // Check if feature is enabled
      const hasFeature = subscription?.features?.[featureName];
      
      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          message: `The "${featureName}" feature is not available in your current plan`,
          feature: featureName,
          currentPlan: subscription?.plan || "none",
          requiresUpgrade: true,
        });
      }

      // Feature allowed, continue
      next();
    } catch (err) {
      console.error("[requireFeature]", err);
      res.status(500).json({ success: false, message: "Error checking feature access" });
    }
  };
};

/**
 * Get restaurant features (returns all features for the subscription)
 */
export const getRestaurantFeatures = async (restaurantId) => {
  try {
    const restaurant = await restaurantModel
      .findById(restaurantId)
      .select("subscription");

    if (!restaurant || !restaurant.subscription) {
      return {};
    }

    return restaurant.subscription.features || {};
  } catch (err) {
    console.error("[getRestaurantFeatures]", err);
    return {};
  }
};
