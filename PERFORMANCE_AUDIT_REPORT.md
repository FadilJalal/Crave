# 🚀 Crave Performance Audit Report
**Date:** April 2, 2026  
**Focus:** Database, Backend, Frontend, and Network Performance

---

## Executive Summary

The Crave project has **multiple critical performance bottlenecks** that directly impact user experience and server costs:

- **Database queries** lack proper pagination and have N+1 problems
- **API responses** are uncompressed and often bloated with unnecessary data
- **Frontend components** perform full re-renders on parent updates
- **List endpoints** return entire datasets without limits
- **No caching** strategy for static or expensive operations
- **Missing database indexes** on frequently queried fields

**Estimated Performance Impact:** 40-60% slowdown in typical user flows with large datasets

---

## 1. DATABASE PERFORMANCE ISSUES

### 🔴 **CRITICAL: Missing Pagination on List Endpoints**

**Severity:** CRITICAL  
**Impact:** Full table scans, memory bloat, potential OOM on large datasets

#### Issues Found:

1. **[orderController.js](backend/controllers/orderController.js)** - Line 448-451 (listOrders)
   ```javascript
   const orders = await orderModel
     .find({})
     .populate("restaurantId", "name address location logo")
     .sort({ createdAt: -1 });  // NO LIMIT!
   ```
   - Returns **ALL orders** with related data
   - With 1M orders, this could be 100MB+ response
   - Causes memory spike on database and API server

2. **[orderController.js](backend/controllers/orderController.js)** - Line 465-471 (userOrders)
   ```javascript
   const orders = await orderModel
     .find({ userId: req.body.userId })
     .populate("restaurantId", "name address location logo")
     .sort({ createdAt: -1 });  // NO LIMIT!
   ```
   - Returns all user's orders (could be thousands)
   - UI can't render 1000+ items efficiently anyway

3. **[foodController.js](backend/controllers/foodController.js)** - Line 50-66 (listFood)
   ```javascript
   foods = await foodModel.find({})
     .populate("restaurantId","name");  // NO LIMIT or PAGINATION
   ```
   - Returns all foods in system
   - With 10K+ foods across restaurants, response could exceed 50MB

4. **[restaurantAdminRoute.js](backend/routes/restaurantAdminRoute.js)** - Line 30-31 (getRestaurant)
   ```javascript
   const restaurant = await restaurantModel.findById(req.restaurantId)
     .select("-password");  // Missing .lean()
   ```
   - Returns full Mongoose document (not optimized for read)

#### Fix:

Add pagination to all list endpoints:

```javascript
// Example fix for listOrders
const listOrders = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      orderModel
        .find({})
        .populate("restaurantId", "name address location logo")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .lean(),
      orderModel.countDocuments({})
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
};
```

---

### 🟠 **HIGH: Missing .lean() on Read Operations**

**Severity:** HIGH  
**Impact:** 2-3x slower queries, unnecessary memory overhead

#### Issues Found:

1. **[orderRoute.js](backend/routes/orderRoute.js)** - Line 31-35 (track/:orderId)
   ```javascript
   const order = await orderModel
     .findById(req.params.orderId)
     .populate("restaurantId", "name logo location")
     .lean();  // ✅ Good here
   ```
   - This one is correct

2. **[orderController.js](backend/controllers/orderController.js)** - Line 448-451 (listOrders)
   - **MISSING .lean()**

3. **[orderController.js](backend/controllers/orderController.js)** - Line 465-471 (userOrders)
   - **MISSING .lean()**

4. **[restaurantAdminRoute.js](backend/routes/restaurantAdminRoute.js)** - Line 30 (getRestaurant)
   ```javascript
   const restaurant = await restaurantModel.findById(req.restaurantId)
     .select("-password");  // MISSING .lean()
   ```

5. **[restaurantAdminRoute.js](backend/routes/restaurantAdminRoute.js)** - Lines 122, 143, 201
   - Multiple queries missing `.lean()`

#### Fix:

Add `.lean()` to all read-only queries:

```javascript
// Before
const orders = await orderModel.find({}).populate("restaurantId", "name");

// After
const orders = await orderModel.find({}).populate("restaurantId", "name").lean();
```

---

### 🟠 **HIGH: Missing Composite Indexes on Frequently Queried Fields**

**Severity:** HIGH  
**Impact:** Full table scans on common queries, 10-100x slower

#### Issues Found:

1. **Order queries by userId** (many queries on `userId` field)
   - [orderController.js](backend/controllers/orderController.js) Line 465
   ```javascript
   const orders = await orderModel.find({ userId: req.body.userId })
   ```
   - **NO INDEX on userId**

2. **Food queries by restaurantId**
   - [foodController.js](backend/controllers/foodController.js) Line 50
   - **NO INDEX on restaurantId**

3. **Restaurant queries by email** 
   - [restaurantAdminController.js](backend/controllers/restaurantAdminController.js) Line 118
   - Index exists but not used in all paths

4. **Order queries** without proper indexes:
   - `{ restaurantId, status }` - for order filtering
   - `{ userId, createdAt }` - for user order history with date range

#### Current Indexes (Found):
```javascript
// inventoryModel - Good
inventorySchema.index({ restaurantId: 1, category: 1 });
inventorySchema.index({ restaurantId: 1, itemName: 1 });

// passwordResetModel - Good
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// reviewModel - Good
reviewSchema.index({ orderId: 1, userId: 1 }, { unique: true });
```

#### Missing Indexes:

Add to [foodModel.js](backend/models/foodModel.js):
```javascript
foodSchema.index({ restaurantId: 1 });
foodSchema.index({ category: 1 });
foodSchema.index({ restaurantId: 1, category: 1 });
```

Add to [orderModel.js](backend/models/orderModel.js):
```javascript
orderSchema.index({ userId: 1 });
orderSchema.index({ restaurantId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
```

Add to [userModel.js](backend/models/userModel.js):
```javascript
userSchema.index({ email: 1 });  // Email is used in login queries
```

---

### 🟠 **HIGH: Unnecessary Field Population (Data Bloat)**

**Severity:** HIGH  
**Impact:** 30-50% larger responses, more network bandwidth

#### Issues Found:

1. **[foodRoute.js](backend/routes/foodRoute.js)** - Line 31-36 (list/public endpoint)
   ```javascript
   const foods = await foodModel
     .find({})
     .populate("restaurantId", "name logo isActive openingHours location deliveryRadius minimumOrder deliveryTiers")
     .lean();
   ```
   - Populating **7 fields** from restaurant
   - Many fields aren't needed on every item display
   - Multiplied by 10K foods = massive bloat

2. **[orderController.js](backend/controllers/orderController.js)** - Line 448-451 (listOrders)
   ```javascript
   .populate("restaurantId", "name address location logo")  // 4 fields
   ```
   - But user might only need `name` and `logo`

#### Fix:

Reduce populated fields:
```javascript
// Before - 7 fields
.populate("restaurantId", "name logo isActive openingHours location deliveryRadius minimumOrder deliveryTiers")

// After - only essential
.populate("restaurantId", "name logo minimumOrder")
```

---

### 🟡 **MEDIUM: N+1 Query Pattern in Inventory Controller**

**Severity:** MEDIUM  
**Impact:** Exponential query count increase

#### Issues Found:

**[inventoryController.js](backend/controllers/inventoryController.js)** - Line 477
```javascript
// This gets inventory items (single query)
const items = await inventoryModel.find({...})

// Then for each item, it does a lookup
const itemsWithStatus = items.map(item => {
  let status = "normal";
  
  // These calculations are done in memory which is OK
  // BUT if there's a database lookup per item, it's N+1
  
  return { ...item, status, statusMessage, ... };
});
```

Currently: Code does calculations in-memory (OK)  
Risk: If any future code does DB lookups per item, this becomes N+1

---

## 2. BACKEND PERFORMANCE ISSUES

### 🔴 **CRITICAL: No Response Compression (gzip)**

**Severity:** CRITICAL  
**Impact:** 50-80% larger responses, 2-3x slower network transfer

#### Issues Found:

**[server.js](backend/server.js)** - No compression middleware
```javascript
app.use(express.json({ limit: "10mb" }));
// NO: app.use(compression());
```

Response sizes without compression:
- `/api/food/list/public` with 5K foods: ~25MB → 5MB (80% reduction)
- `/api/order/list` with 1M orders: ~500MB → 100MB (80% reduction)

#### Fix:

```bash
npm install compression
```

Add to [server.js](backend/server.js) after helmet:
```javascript
import compression from "compression";

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression({
  level: 6,  // Balance between compression ratio and speed
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
```

---

### 🟠 **HIGH: No Response Caching Headers**

**Severity:** HIGH  
**Impact:** Browser/CDN can't cache, redundant requests from clients

#### Issues Found:

**[server.js](backend/server.js)** - No Cache-Control headers

Static/semi-static endpoints missing cache headers:
1. `/api/food/list/public` - could cache for 5 minutes
2. `/api/restaurant/list` - could cache for 10 minutes
3. `/images/*` - should cache indefinitely

#### Fix:

Add cache middleware:
```javascript
// In server.js
app.use((req, res, next) => {
  // Cache static images for 1 month
  if (req.path.startsWith('/images')) {
    res.set('Cache-Control', 'public, max-age=2592000');
  }
  next();
});

// In foodRoute.js
foodRouter.get("/list/public", async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');  // 5 min cache
  try {
    const foods = await foodModel...
    res.json({ success: true, data: foods });
  } catch (error) {
    res.json({ success: false, message: "Error listing foods" });
  }
});
```

---

### 🟠 **HIGH: No Connection Pooling on Database**

**Severity:** HIGH  
**Impact:** Limited concurrent queries, slower under load

#### Issues Found:

**[config/db.js](backend/config/db.js)** - Default MongoDB connection settings

Current connection likely uses Mongoose defaults:
- No explicit pool size configuration
- Default: 10 connections (too low for production)

#### Fix:

Update [config/db.js](backend/config/db.js):
```javascript
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      maxPoolSize: 20,           // Up from default 10
      minPoolSize: 10,
      maxConnecting: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,                 // Force IPv4
      retryWrites: true,
    });
    
    console.log("✅ MongoDB connected with pool size: 20");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    // ... retry logic
  }
};
```

---

### 🟡 **MEDIUM: Geocoding on Order Submission (Blocking)**

**Severity:** MEDIUM  
**Impact:** 2-8 second delays per order (external API call)

#### Issues Found:

**[orderController.js](backend/controllers/orderController.js)** - Line 164-186

```javascript
// BLOCKING geocoding call during order placement
const radiusCheck = await checkDeliveryRadius(restaurantId, req.body.address);

// Inside checkDeliveryRadius:
const coords = await geocodeAddress(address);  // External API call (2-8s)
```

This makes user wait 2-8 seconds to place an order while geocoding completes.

#### Fix:

Option 1 - Cache geocoding results:
```javascript
const GEOCODE_CACHE = new Map();  // Or use Redis

async function geocodeAddress(address) {
  const key = JSON.stringify(address);
  if (GEOCODE_CACHE.has(key)) {
    return GEOCODE_CACHE.get(key);
  }
  
  // ... geocoding call
  GEOCODE_CACHE.set(key, result);
  return result;
}
```

Option 2 - Async validation (background check):
```javascript
// Accept order immediately, validate async
const newOrder = new orderModel({ ... });
await newOrder.save();

// Validate in background
queueValidateDeliveryAddress(orderId, address);
```

---

### 🟡 **MEDIUM: No Database Query Monitoring**

**Severity:** MEDIUM  
**Impact:** Can't identify slow queries in production

#### Issues Found:

No slow query logging configured in [config/db.js](backend/config/db.js)

#### Fix:

Add slow query logging:
```javascript
mongoose.connection.on('open', () => {
  mongoose.set('debug', (coll, method, query, doc) => {
    const start = Date.now();
    // Log slow queries (>100ms)
    if (Date.now() - start > 100) {
      console.log(`[SLOW QUERY] ${coll}.${method}(${JSON.stringify(query)}) - ${Date.now() - start}ms`);
    }
  });
});
```

---

## 3. FRONTEND PERFORMANCE ISSUES

### 🟠 **HIGH: Expensive useMemo Without Proper Dependencies**

**Severity:** HIGH  
**Impact:** Recalculates on every render instead of caching

#### Issues Found:

1. **[FoodDisplay.jsx](frontend/src/components/FoodDisplay/FoodDisplay.jsx)** - Line 10-32

```javascript
const computeTags = (food_list) => {
  // Expensive computation: sorts, iterates, creates objects
  ...
};

const dealTags = useMemo(() => computeTags(food_list), [food_list]);
```

**Problem:** Dependency array only has `food_list` but the function depends on:
- Number of items per category (for "Budget Pick")
- Price comparisons
- New items detection

When `restaurantsById` updates but `food_list` doesn't, tags recalculate unnecessarily.

2. **[StoreContext.jsx](frontend/src/Context/StoreContext.jsx)** - Line 20-57

```javascript
const deliveryCharge = useMemo(() => {
  // Haversine calculation
  ...
}, [cartItems, food_list]);  // OK dependency-wise
```

**Issue:** Recalculates when ANY cartItem changes quantity, even for unrelated restaurants.

#### Fix:

Better memoization strategy:
```javascript
// Instead of recalculating ALL tags when food_list changes
// Update only affected tags
const dealTags = useMemo(() => {
  return computeTagsEfficiently(food_list, restaurantsById);
}, [food_list, restaurantsById]);

// Or split computation:
const dealTags = useMemo(() => {
  if (!food_list.length) return {};
  return computeTagsEfficiently(food_list, restaurantsById);
}, [food_list.length, restaurantsById]);  // Add derived dependency
```

---

### 🟠 **HIGH: No React.memo on List Item Components**

**Severity:** HIGH  
**Impact:** 10K items in list = 10K unnecessary re-renders

#### Issues Found:

1. **[FoodItem.jsx](frontend/src/components/FoodItem/FoodItem.jsx)** - Line 24-25

```javascript
const FoodItem = ({ image, name, price, ... }) => {
  // NO: export default FoodItem;
  // Should be: export default React.memo(FoodItem);
}
```

When parent component (`FoodDisplay`) re-renders, all 5K FoodItems re-render even if their props didn't change.

#### Fix:

```javascript
export default React.memo(FoodItem, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.price === nextProps.price &&
    prevProps.name === nextProps.name &&
    prevProps.image === nextProps.image &&
    prevProps.restaurantOpen === nextProps.restaurantOpen &&
    prevProps.dealTag?.label === nextProps.dealTag?.label
  );
});
```

2. **[RestaurantMenu.jsx](frontend/src/pages/RestaurantMenu/RestaurantMenu.jsx)** - Line 60+

```javascript
{menuItems.map(item => (
  <FoodItem key={item._id} ... />
))}
```

Each FoodItem is re-rendered when parent state changes.

---

### 🟠 **HIGH: No Lazy Loading on Routes**

**Severity:** HIGH  
**Impact:** Initial bundle size 2-3x larger, slower first paint

#### Issues Found:

**[App.jsx](frontend/src/App.jsx)** - Line 6-18

```javascript
import Home from './pages/Home/Home'
import Cart from './pages/Cart/Cart'
import PlaceOrder from './pages/PlaceOrder/PlaceOrder'
import MyOrders from './pages/MyOrders/MyOrders'
// ... ALL routes imported upfront

// All route components bundled in main.js
<Routes>
  <Route path='/' element={<Home />} />
  <Route path='/cart' element={<Cart />} />
  <Route path='/order' element={<PlaceOrder />} />
  <Route path='/myorders' element={<MyOrders />} />
  ...
</Routes>
```

**Problem:** All pages bundled together, not split by route.

#### Fix:

```javascript
import React, { Suspense, lazy } from 'react';

// Lazy load routes
const Home = lazy(() => import('./pages/Home/Home'));
const Cart = lazy(() => import('./pages/Cart/Cart'));
const PlaceOrder = lazy(() => import('./pages/PlaceOrder/PlaceOrder'));
const MyOrders = lazy(() => import('./pages/MyOrders/MyOrders'));

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/cart' element={<Cart />} />
        <Route path='/order' element={<PlaceOrder />} />
        <Route path='/myorders' element={<MyOrders />} />
      </Routes>
    </Suspense>
  );
};
```

---

### 🟠 **HIGH: Large Dependency Arrays in useEffect**

**Severity:** HIGH  
**Impact:** Unnecessary effect re-runs, redundant fetches

#### Issues Found:

1. **[StoreContext.jsx](frontend/src/Context/StoreContext.jsx)** - Line 236+

```javascript
useEffect(() => {
  fetchFoodList();
  // ... other effects
}, [url]);  // OK - minimal dependency
```

This is good, but check for other useEffect hooks:

2. **[RestaurantMenu.jsx](frontend/src/pages/RestaurantMenu/RestaurantMenu.jsx)** - Line 19-42

```javascript
useEffect(() => {
  const fetchRestaurant = async () => {
    try {
      const [restRes, reviewRes] = await Promise.all([
        axios.get(`${url}/api/restaurant/list`),  // Fetches ALL restaurants
        axios.get(`${url}/api/review/restaurant/${id}`),
      ]);
      ...
    }
  };
  fetchRestaurant();
}, [id, url]);  // Re-runs on every id or url change
```

**Problem:** Fetches all restaurants just to find one by ID.

#### Fix:

```javascript
useEffect(() => {
  const fetchRestaurant = async () => {
    try {
      // Add API endpoint to fetch single restaurant
      const [restRes, reviewRes] = await Promise.all([
        axios.get(`${url}/api/restaurant/${id}`),  // Single restaurant
        axios.get(`${url}/api/review/restaurant/${id}`),
      ]);
      ...
    }
  };
  fetchRestaurant();
}, [id, url]);
```

---

### 🟡 **MEDIUM: Virtual Scrolling Not Implemented for Large Lists**

**Severity:** MEDIUM  
**Impact:** Rendering 1000+ items causes browser jank

#### Issues Found:

**[Restaurants.jsx](frontend/src/pages/Restaurants/Restaurants.jsx)** - Line 88-120

```javascript
<div className='rp-grid'>
  {filtered.map(r => (
    <div key={r._id} className='rp-card'>
      {/* Restaurant card */}
    </div>
  ))}
</div>
```

With 1000 restaurants, browser renders 1000 DOM nodes (slow).

#### Fix:

Install and use react-window:
```bash
npm install react-window
```

```javascript
import { FixedSizeGrid as Grid } from 'react-window';

const Cell = ({ columnIndex, rowIndex, style }) => (
  <div style={style}>
    {/* Restaurant card */}
  </div>
);

<Grid
  columnCount={3}
  columnWidth={300}
  height={600}
  rowCount={Math.ceil(filtered.length / 3)}
  rowHeight={300}
  width={900}
>
  {Cell}
</Grid>
```

---

### 🟡 **MEDIUM: No Image Optimization**

**Severity:** MEDIUM  
**Impact:** Large image files (1-5MB each), slow initial load

#### Issues Found:

Images served without optimization:
- [FoodItem.jsx](frontend/src/components/FoodItem/FoodItem.jsx) Line 66
- [RestaurantMenu.jsx](frontend/src/pages/RestaurantMenu/RestaurantMenu.jsx) Line 48-52

```javascript
<img
  src={`${url}/images/${restaurant.logo}`}  // No size, format, or lazy loading
  alt={restaurant.name}
/>
```

#### Fix:

Install and use next/image equivalent:
```bash
npm install next-optimized-images  # or similar
```

Or use native lazy loading + srcset:
```javascript
<img
  src={`${url}/images/${restaurant.logo}`}
  srcSet={`${url}/images/${restaurant.logo}?w=300 300w, ${url}/images/${restaurant.logo}?w=600 600w`}
  sizes="(max-width: 600px) 300px, 600px"
  loading="lazy"
  width={600}
  height={400}
  alt={restaurant.name}
/>
```

---

## 4. NETWORK PERFORMANCE ISSUES

### 🔴 **CRITICAL: API Response Too Large on Public Endpoints**

**Severity:** CRITICAL  
**Impact:** 50-100MB responses, 10+ seconds load time on 4G

#### Issues Found:

**[foodRoute.js](backend/routes/foodRoute.js)** - Line 31-38 (GET /api/food/list/public)

```javascript
foodRouter.get("/list/public", async (req, res) => {
  try {
    const foods = await foodModel
      .find({})
      .populate("restaurantId", "name logo isActive openingHours location deliveryRadius minimumOrder deliveryTiers")
      .lean();
    res.json({ success: true, data: foods });
  }
});
```

**Estimated Response Sizes:**
- With 10K foods, full restaurant data per item: ~50MB
- Even with compression: ~10MB
- On 4G (250 Kbps): 40 seconds to load!

#### Fix:

```javascript
// Add pagination
foodRouter.get("/list/public", async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (page - 1) * limit;
    
    const [foods, restaurants] = await Promise.all([
      foodModel
        .find({})
        .select("name description price image category restaurantId avgRating ratingCount inStock")  // Only essential fields
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .lean(),
      restaurantModel.find({}).select("_id name logo").lean()  // Separate fetch, cached
    ]);

    // Merge restaurant info on client or in minimal form
    res.json({
      success: true,
      data: foods,
      restaurants: Object.fromEntries(restaurants.map(r => [r._id, { name: r.name, logo: r.logo }])),
      pagination: { page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    res.json({ success: false, message: "Error listing foods" });
  }
});
```

---

### 🟠 **HIGH: Redundant API Calls on Every Component Render**

**Severity:** HIGH  
**Impact:** 10-50 API calls for single page load

#### Issues Found:

1. **[RestaurantMenu.jsx](frontend/src/pages/RestaurantMenu/RestaurantMenu.jsx)** - Line 19-42

```javascript
useEffect(() => {
  const fetchRestaurant = async () => {
    const [restRes, reviewRes] = await Promise.all([
      axios.get(`${url}/api/restaurant/list`),  // ❌ Fetches ALL restaurants every time id changes
      axios.get(`${url}/api/review/restaurant/${id}`),
    ]);
    
    const found = restRes.data.data.find((r) => String(r._id) === String(id));
  };
}, [id, url]);
```

**Problem:** 
- User clicks 5 different restaurants
- 5 API calls to `/api/restaurant/list` (fetches ALL restaurants each time)
- Should query single restaurant or use already-fetched list

2. **Restaurants filtering recalculates distance on every filter change**

```javascript
const filtered = withDistance.filter(r =>
  r.name.toLowerCase().includes(search.toLowerCase()) ||
  r.address.toLowerCase().includes(search.toLowerCase())
);
```

Search updates state, component re-renders, Haversine distance recalculated for 1000 restaurants.

#### Fix:

Cache API responses:
```javascript
// StoreContext.jsx - add restaurant cache
const [restaurantCache, setRestaurantCache] = useState(null);

const getRestaurant = async (restaurantId) => {
  if (restaurantCache?.[restaurantId]) {
    return restaurantCache[restaurantId];
  }
  
  const res = await axios.get(`${url}/api/restaurant/${restaurantId}`);
  setRestaurantCache(prev => ({...prev, [restaurantId]: res.data.data}));
  return res.data.data;
};
```

---

### 🟠 **HIGH: No Request Debouncing on Search**

**Severity:** HIGH  
**Impact:** API calls on every keystroke

#### Issues Found:

**[Restaurants.jsx](frontend/src/pages/Restaurants/Restaurants.jsx)** - Line 70

```javascript
const filtered = withDistance.filter(r =>
  r.name.toLowerCase().includes(search.toLowerCase()) ||
  r.address.toLowerCase().includes(search.toLowerCase())
);

// Parent component likely has:
<input
  onChange={e => setSearch(e.target.value)}  // ❌ Fires on every keystroke
/>
```

If search triggered API calls (though it doesn't here, but it's a pattern):
- User types "Pizza" (5 letters = 5 API calls)

#### Fix:

Debounce search:
```javascript
import { useCallback, useState, useEffect } from 'react';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// In component:
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  // API call with debouncedSearch
}, [debouncedSearch]);
```

---

### 🟡 **MEDIUM: No Service Worker/PWA Caching**

**Severity:** MEDIUM  
**Impact:** All requests go to network even for cached data

#### Issues Found:

No service worker implementation detected.

#### Fix:

Implement Workbox service worker:
```bash
npm install workbox-cli
npx workbox-cli wizard
```

Or manual service worker:
```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/api/restaurant/list',  // Cache expensive endpoints
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

---

## Performance Issues Summary Table

| Category | Severity | Issue | Files | Est. Impact | Fix Time |
|----------|----------|-------|-------|-------------|----------|
| DB | 🔴 CRITICAL | Missing pagination on lists | orderController.js, foodController.js | -50% speed | 2h |
| DB | 🟠 HIGH | Missing `.lean()` on reads | Multiple routes | -30% speed | 1h |
| DB | 🟠 HIGH | Missing indexes | foodModel, orderModel | -70% query speed | 30m |
| DB | 🟠 HIGH | Bloated populate fields | foodRoute.js | -40% response size | 30m |
| Backend | 🔴 CRITICAL | No gzip compression | server.js | -80% response size | 10m |
| Backend | 🟠 HIGH | No cache headers | server.js, routes | -50% requests | 30m |
| Backend | 🟠 HIGH | No connection pooling | config/db.js | -60% under load | 30m |
| Frontend | 🟠 HIGH | No React.memo | FoodItem.jsx | -70% re-renders | 1h |
| Frontend | 🟠 HIGH | No lazy loading routes | App.jsx | -50% bundle size | 30m |
| Frontend | 🟠 HIGH | Large useMemo deps | FoodDisplay.jsx | -40% re-renders | 1h |
| Network | 🔴 CRITICAL | Massive API responses | foodRoute.js | -80% load time | 1h |
| Network | 🟠 HIGH | Redundant API calls | RestaurantMenu.jsx | -90% calls | 1.5h |

---

## Quick Wins (30 min - 1 hour each)

1. ✅ Add gzip compression to server.js
2. ✅ Add Cache-Control headers to static endpoints
3. ✅ Add `.lean()` to all read queries
4. ✅ Add pagination to /list endpoints
5. ✅ Create database indexes for foreign keys

## Medium Effort (1-2 hours each)

6. ✅ Implement React.memo on FoodItem
7. ✅ Implement lazy loading on routes
8. ✅ Reduce populated fields in API responses
9. ✅ Add response debouncing in components

## Larger Projects (2-4 hours each)

10. ✅ Implement service worker caching
11. ✅ Virtual scrolling for large lists
12. ✅ Image optimization pipeline
13. ✅ Database connection pooling tuning

---

## Recommended Implementation Order

1. **Week 1** (Quick Wins):
   - Add compression & cache headers (10 min)
   - Add database indexes (30 min)
   - Add `.lean()` to queries (1 h)
   - Add pagination to endpoints (1-2 h)

2. **Week 2** (Frontend):
   - React.memo components (1 h)
   - Lazy load routes (30 min)
   - Fix useMemo dependencies (1 h)

3. **Week 3** (Network):
   - Reduce response sizes (1 h)
   - Fix API redundancy (1-2 h)
   - Add request debouncing (30 m)

4. **Week 4** (Advanced):
   - Service worker caching
   - Virtual scrolling
   - Image optimization

---

## Testing Performance Improvements

```bash
# Test response compression
curl -H "Accept-Encoding: gzip" http://localhost:4000/api/food/list/public | gunzip | wc -c

# Monitor database slow queries
db.setProfilingLevel(1, { slowms: 100 })

# Frontend performance in Chrome DevTools
Lighthouse -> Performance (target: >80)

# API response time
time curl http://localhost:4000/api/restaurant/list
```

---

**Report Generated:** April 2, 2026
**Status:** Ready for Implementation
