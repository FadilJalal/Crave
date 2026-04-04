# Feature Access Control Implementation Guide

## Quick Start

### 1. Frontend: Protect a Route with Feature Lock

Wrap any route that requires a feature:

```jsx
import ProtectedFeature from "./Components/ProtectedFeature";
import Inventory from "./Pages/Inventory";

// In your router or page
<ProtectedFeature featureName="inventory">
  <Inventory />
</ProtectedFeature>
```

### 2. Backend: Protect an API Endpoint

Use the requireFeature middleware on routes:

```javascript
import { requireFeature } from "../middleware/featureAccess.js";
import restaurantAuth from "../middleware/restaurantAuth.js";

// In your route handler
router.post("/inventory/add", restaurantAuth, requireFeature("inventory"), async (req, res) => {
  // Only users with "inventory" feature can access this
});
```

### 3. Frontend: Check Feature Access in Component

```javascript
import { hasFeatureAccess } from "../utils/featureAccess";

function MyComponent() {
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    const loadSub = async () => {
      const res = await api.get("/api/subscription/mine");
      setSubscription(res.data.data);
    };
    loadSub();
  }, []);

  const canUseInventory = hasFeatureAccess(subscription, "inventory");

  return (
    <div>
      {canUseInventory ? (
        <InventoryComponent />
      ) : (
        <UpgradePrompt feature="inventory" />
      )}
    </div>
  );
}
```

## Available Features

### Starter Tier (AED 299/month)
- ✅ Dashboard & Reports
- ✅ Order Management
- ✅ Menu Management
- ✅ Customer Messaging
- ✅ Promo Codes
- ❌ Everything else locked

### Professional Tier (AED 399/month)
- ✅ All Starter features +
- ✅ Broadcasts & Email Campaigns
- ✅ Inventory Management & Analytics
- ✅ Customer Analytics
- ✅ AI Insights & Menu Generator
- ✅ Review Management
- ❌ Price Optimization & Segmentation (Enterprise only)

### Enterprise Tier (AED 599/month)
- ✅ Everything including:
- ✅ AI Price Optimization
- ✅ AI Customer Segmentation
- ✅ Advanced Analytics Dashboard

## Files Created

1. **featureAccess.js** - Frontend utility functions
2. **ProtectedFeature.jsx** - Route wrapper component
3. **UpgradeRequired.jsx** - Upgrade prompt UI
4. **featureAccess.js (middleware)** - Backend access control

## Where to Apply Feature Locks

### High Priority (Revenue Critical)
- `/inventory` - requireFeature("inventory")
- `/email-campaign` - requireFeature("emailCampaigns")
- `/broadcasts` - requireFeature("broadcasts")
- `/ai-menu-generator` - requireFeature("aiMenuGenerator")
- `/ai-price-optimization` - requireFeature("aIPriceOptimization")

### Medium Priority
- `/customers` - requireFeature("customers")
- `/analytics` - requireFeature("analytics")

### Low Priority (Basic features, usually enabled)
- `/orders` - Already enabled for all paid tiers
- `/menu` - Already enabled for all paid tiers
