# 🍽️ Crave - AI-Powered Food Delivery Platform

**Final Year Project** | Multi-role food delivery app with AI sentiment analysis and innovative shared delivery feature.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Setup & Installation](#setup--installation)
6. [Testing](#testing)
7. [API Documentation](#api-documentation)
8. [Shared Delivery Algorithm](#shared-delivery-algorithm)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**Crave** is a comprehensive food delivery platform that serves three main user types:
- **Customers**: Browse restaurants, place orders, track delivery
- **Restaurant Admins**: Manage menu items, orders, inventory
- **Super Admins**: Platform-wide analytics and management

### Unique Features
- ✨ **Shared Delivery**: Intelligently matches orders within distance/time windows for cost savings
- 🤖 **AI Sentiment Analysis**: Analyzes customer reviews to identify trends
- 📍 **Live Tracking**: Real-time order tracking with interactive map
- 🎨 **Dark/Light Theme**: System-wide theme support
- 💰 **Split Payments**: Flexible payment options (COD, Card, Split)

---

## ✨ Key Features

### For Customers
- ✅ User registration & authentication (JWT)
- ✅ Browse restaurants & menu items
- ✅ Advanced search with filters
- ✅ Save delivery addresses
- ✅ Place orders (single or shared delivery)
- ✅ Real-time order tracking with map
- ✅ Leave reviews & ratings
- ✅ Track delivery savings

### For Restaurant Admins
- ✅ Restaurant profile management
- ✅ Menu item management (add/edit/delete)
- ✅ Order management (accept/process/deliver)
- ✅ Enable/configure shared delivery feature
- ✅ View analytics & insights
- ✅ Inventory management
- ✅ Customer reviews & sentiment analysis

### For Super Admins
- ✅ User management
- ✅ Restaurant management
- ✅ Platform analytics
- ✅ Payment tracking

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js (Express)
- **Database**: MongoDB
- **Authentication**: JWT (jsonwebtoken)
- **Payments**: Stripe API
- **AI**: Groq API (LLM for sentiment analysis)
- **Location**: Leaflet + OSRM routing engine
- **Email**: Resend API

### Frontend
- **Framework**: React 18
- **Build**: Vite
- **State**: Context API
- **Maps**: Leaflet + OpenStreetMap
- **Notifications**: React Toastify
- **Http Client**: Axios

### DevOps
- **Package Manager**: npm
- **Dev Server**: Vite (frontend) + Nodemon (backend)
- **Git**: Version control

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Customer Browser                        │
│  ┌─────────────────────────────────────────┐   │
│  │  Frontend (React + Vite)                │   │
│  │  - PlaceOrder.jsx                       │   │
│  │  - LiveDeliveryMap.jsx                  │   │
│  │  - ReviewSummary.jsx (AI)               │   │
│  └─────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────┐
│      Backend API (Node.js/Express)              │
│  ┌─────────────────────────────────────────┐   │
│  │  orderRoute                             │   │
│  │  - POST /api/order/place                │   │
│  │  - GET /api/order/track                 │   │
│  │  - POST /api/order/restaurant/status    │   │
│  │  - GET /api/order/shared-quote          │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │  aiRoute                                │   │
│  │  - GET /api/ai/review-summary           │   │
│  │  - POST /api/ai/sentiment-analyze       │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │  Controllers                            │   │
│  │  - orderController.js                   │   │
│  │  - restaurantController.js              │   │
│  │  - userController.js                    │   │
│  └─────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │ Mongoose ODM
                 ▼
┌─────────────────────────────────────────────────┐
│        MongoDB Database                         │
│  ┌─────────────────────────────────────────┐   │
│  │  Collections:                           │   │
│  │  - users                                │   │
│  │  - restaurants                          │   │
│  │  - orders                               │   │
│  │  - reviews                              │   │
│  │  - foods                                │   │
│  │  - inventory                            │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** v16+ and npm
- **MongoDB** running locally or Atlas connection
- **Environment variables** configured (see `.env.example`)

### Backend Setup

```bash
cd backend
npm install

# Create .env file with:
MONGO_URL=mongodb://localhost:27017/crave
JWT_SECRET=your-secret-key
GROQ_API_KEY=your-groq-key
STRIPE_SECRET=your-stripe-key

# Start development server
npm run server
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Restaurant Admin Setup

```bash
cd restaurant-admin
npm install
npm run dev
# Runs on http://localhost:5174
```

### Super Admin Setup

```bash
cd admin-super
npm install
npm run dev
# Runs on http://localhost:5175
```

### Seed Initial Data

```bash
cd backend
node seedSuperAdmin.js    # Create super admin user
node seedInventory.js     # Create sample inventory
```

---

## 🧪 Testing

### Manual Testing Checklist

#### 1. **Basic Order Flow**
```
1. Sign up as customer
2. Browse restaurants
3. Add items to cart
4. Proceed to checkout → Select address
5. Place order (COD or Card)
6. See order in restaurant admin
7. Update status: Food Processing → Out for Delivery → Delivered
8. Leave review
✅ Order should complete successfully
```

#### 2. **Shared Delivery**
```
1. Enable shared delivery in restaurant settings
2. Place Order 1 (e.g., Al Mahdi, Downtown)
3. Place Order 2 (same restaurant, within 5km)
4. Customer 2 sees shared delivery option
5. Accept shared delivery
6. Verify savings: (standard_fee - shared_fee)
7. Both customers see 🤝 badge
8. Track both deliveries on map
✅ Shared discount applied, both orders show savings
```

#### 3. **Multiple Users**
```
1. Open Tab 1: Customer app → Place order
2. Open Tab 2: Restaurant admin → See order appear
3. Open Tab 3: Admin app → View stats
4. Update status in Tab 2
5. Check Tab 1 refreshes automatically (15-second interval)
✅ No "too many requests" errors, data syncs smoothly
```

#### 4. **Theme Testing**
```
1. Toggle dark/light mode
2. Verify all pages are readable
3. Check sidebar color (navy in dark)
4. Check main content (black in dark)
5. Check buttons, badges, text contrast
✅ UI looks good in both themes
```

#### 5. **Error Handling**
```
1. Close backend server
2. Try to place order → Should show friendly error
3. Restart backend
4. Try again → Should work
5. Open 5+ browser tabs → Should not crash
✅ Graceful error recovery
```

### Unit Test Files
- [backend/test-inventory.js](backend/test-inventory.js) - Inventory validation
- Run with: `node test-inventory.js`

---

## 📡 API Documentation

### Core Endpoints

#### Orders
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/order/place` | Place new order |
| GET | `/api/order/track/:orderId` | Track order |
| GET | `/api/order/shared-quote/:restaurantId` | Get shared delivery quotes |
| POST | `/api/order/restaurant/status` | Update order status |
| GET | `/api/order/restaurant/list` | List restaurant orders |

#### AI Features
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/ai/review-summary/:restaurantId` | AI-generated review summary |
| POST | `/api/ai/sentiment-analyze` | Analyze review sentiment |

#### Users
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/user/profile` | Get user profile |

#### Restaurants
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/restaurant/list` | List all restaurants |
| GET | `/api/restaurant/:id` | Get restaurant details |
| POST | `/api/restaurant/create` | Create restaurant (admin) |

---

## 🚀 Shared Delivery Algorithm

### How It Works

**Goal**: Match two orders within distance and time constraints to offer shared delivery savings.

### Step 1: Shared Fee Calculation
```javascript
// Backend: backend/controllers/orderController.js
function applySharedFeeIfValid(standardFee) {
  const SHARED_MIN_FEE = 5;  // Minimum shared fee (AED)
  const sharedFee = Math.max(standardFee * 0.6, SHARED_MIN_FEE);
  return sharedFee;
}
```

### Step 2: Find Matching Orders
```javascript
// Find active orders within:
// - Max 5 km distance
// - 15 min time window
// - Same restaurant
// - Not yet started delivery

const matchedOrders = await orderModel
  .find({
    restaurantId: order.restaurantId,
    status: "Food Processing",
    createdAt: { $gte: orderTime - 15 mins, $lte: orderTime },
    "address.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: 5000  // 5km in meters
      }
    }
  })
  .limit(1);
```

### Step 3: Generate Quote
```javascript
// Return two-leg routing:
// Leg 1: Restaurant → Order 1 -> Order 2
// Leg 2: Restaurant → Order 2 -> Order 1

// Calculate delivery time for both legs
// Show customer the savings
```

### Step 4: Real-time Tracking
```javascript
// LiveDeliveryMap.jsx shows:
// 📦 Purple marker: First order pickup location
// 🏠 Green marker:  Customer delivery location
// 🗺️ Red route: Two-leg path

// When progress % crosses split point:
// Toast: "First order delivered. Rider heading to you!"
```

### Key Features
- ✅ **Haversine distance** calculation for accuracy
- ✅ **OSRM routing** for real road distances (not straight-line)
- ✅ **Per-restaurant config**: Each restaurant sets max distance and time window
- ✅ **One-time notification**: Only alerts when crossing first-drop
- ✅ **Savings estimate**: Shows exact AED savings upfront

---

## 🔍 File Structure

```
crave/
├── backend/
│   ├── controllers/
│   │   ├── orderController.js        ← Shared delivery matching & quotes
│   │   ├── restaurantController.js
│   │   └── ...
│   ├── models/
│   │   ├── orderModel.js             ← Order schema with sharedDelivery fields
│   │   ├── restaurantModel.js        ← Restaurant config schema
│   │   └── ...
│   ├── routes/
│   │   ├── orderRoute.js             ← Order endpoints
│   │   ├── aiRoute.js                ← AI endpoints
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.js                   ← JWT authentication
│   │   └── ...
│   ├── .env                          ← Configuration (keep secret!)
│   └── server.js                     ← Main entry point
│
├── frontend/                         ← Customer app
│   ├── src/
│   │   ├── components/
│   │   │   ├── LiveDeliveryMap.jsx   ← Shared delivery tracking
│   │   │   ├── ReviewSummary.jsx     ← AI sentiment analysis
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── PlaceOrder.jsx        ← Checkout with shared option
│   │   │   └── ...
│   │   └── main.jsx
│   └── vite.config.js
│
├── restaurant-admin/                 ← Restaurant admin dashboard
│   ├── src/
│   │   ├── Pages/
│   │   │   ├── Orders.jsx            ← Order management (shared badges)
│   │   │   ├── Settings.jsx          ← Shared delivery config
│   │   │   └── ...
│   │   └── main.jsx
│   └── vite.config.js
│
├── admin-super/                      ← Super admin dashboard
│   └── ...
│
└── README.md                         ← This file
```

---

## 🐛 Troubleshooting

### "Too Many Requests" Error
**Cause**: Multiple browser tabs hammering the API  
**Solution**:
- Close extra browser tabs
- Keep only 1-2 tabs open while testing
- Refresh interval is 15 seconds (tuned to prevent overload)

### Geocoding Fails
**Cause**: Address can't be converted to coordinates  
**Solution**:
- Use the map picker to select location (more reliable)
- Or ensure full address is provided
- Backend now prefers lat/lng from saved locations

### Shared Delivery Not Showing
**Cause**: 
1. Feature not enabled in restaurant settings
2. No matching orders within constraints  
3. Time window or distance exceeded  
**Solution**:
- Check restaurant settings → Shared Delivery is enabled
- Try placing orders closer in time (within 15 min)
- Verify addresses are within 5km

### Dark Mode Showing Blue
**Cause**: Browser cache  
**Solution**: Press Ctrl+Shift+Delete and clear cache, refresh page

### Reviews/Sentiment Not Updating
**Cause**: Browser cached old data  
**Solution**: Refresh page or wait 15 seconds for auto-update

---

## 📝 Code Highlights

### Shared Delivery Quote Logic
See: [backend/controllers/orderController.js](backend/controllers/orderController.js) → `quoteSharedDelivery()`
- Haversine distance calculation
- Time window matching
- OSRM fallback routing

### AI Review Analysis
See: [backend/routes/aiRoute.js](backend/routes/aiRoute.js) → `/review-summary`
- Groq API integration
- Placeholder filtering
- Error recovery

### Real-time Tracking Map
See: [frontend/src/components/LiveDeliveryMap.jsx](frontend/src/components/LiveDeliveryMap.jsx)
- Dual marker rendering
- Two-leg route interpolation
- Progress-based notifications

---

## 🎓 For Project Presentation

**Key Points to Highlight**:
1. **Shared Delivery Algorithm** - Complex matching + routing logic
2. **Multi-role Architecture** - Three separate dashboards
3. **AI Integration** - Groq LLM for sentiment analysis
4. **Real-time Features** - Live map tracking, auto-refresh
5. **Error Resilience** - Rate limiting, cache busting, graceful errors
6. **Database Optimization** - Indexes, lean queries, pagination

---

## 📄 License

This project is for educational purposes (Final Year Project).

---

## 👨‍💻 Support

For issues or questions, check:
1. Backend logs (terminal where `npm run server` runs)
2. Browser console (F12)
3. Database connection (MongoDB running?)
4. Environment variables set correctly?

---

**Good luck with your final year project! 🚀**
