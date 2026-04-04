# 🔧 CRAVE Backend Server

Express.js + MongoDB backend for the Crave restaurant platform.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in: MONGO_URL, JWT_SECRET

# 3. (Optional) Add AI - Get free Groq API key
# https://console.groq.com/keys
# Then add: GROQ_API_KEY=gsk_...

# 4. Start server
npm run server
```

Server runs on `http://localhost:4000`

---

## 📦 Projects Using This Backend

- **Admin Super** (`admin-super/`) — Super admin dashboard
- **Restaurant Admin** (`restaurant-admin/`) — Restaurant management
- **Frontend** (`frontend/`) — Customer app

---

## 🤖 NEW: AI Features (4 Tools)

### ✅ Fully Working:

**1. 🧠 AI Insights**
- Platform analytics & KPIs
- Trend analysis
- Endpoint: `GET /api/ai/admin/insights`

**2. 💰 Price Optimizer**
- Price elasticity analysis
- Smart pricing recommendations
- Endpoint: `GET /api/ai/admin/price-optimizer`

**3. 👥 Customer Segmentation**
- 6 behavioral segments
- Engagement strategies
- Endpoint: `GET /api/ai/admin/customer-segments`

**4. 🍽️ AI Menu** (Now with Real AI via Groq!)
- Menu performance analysis
- Per-item status recommendations
- **NEW**: Powered by Groq LLM (free)
- Endpoint: `GET /api/ai/admin/menu-optimizer`

### Setup Groq Real AI (2 minutes):

```bash
# 1. Get free API key: https://console.groq.com/keys

# 2. Add to .env:
GROQ_API_KEY=gsk_your_key_here

# 3. Restart server:
npm run server
```

### Access AI Tools:

Admin Super → Sidebar → 🧠 AI Tools → Choose tool

---

## 📁 Project Structure

```
backend/
├── config/
│   ├── db.js           → MongoDB connection
│   └── nodemon.json    → Dev watch config
├── controllers/
│   ├── foodController.js
│   ├── orderController.js
│   ├── userController.js
│   └── ...
├── middleware/
│   ├── auth.js              → User auth
│   ├── adminAuth.js         → Admin auth
│   └── featureAccess.js     → Feature controls
├── models/
│   ├── foodModel.js
│   ├── orderModel.js
│   ├── userModel.js
│   └── ...
├── routes/
│   ├── aiAdminRoute.js      → ⭐ 4 AI endpoints
│   ├── foodRoute.js
│   ├── orderRoute.js
│   └── ...
├── utils/
│   ├── aiHelpers.js         → AI utility functions
│   └── campaignScheduler.js
├── uploads/                 → User uploads
├── .env.example            → Config template
├── server.js               → Main app file
└── package.json
```

---

## 🔌 API Routes

| Route | Purpose |
|-------|---------|
| `POST /auth/register` | User registration |
| `POST /auth/login` | User login |
| `GET /api/food/list` | All food items |
| `GET /api/food/list/public` | Public listing (no cache) |
| `GET /api/restaurant/:id` | Restaurant details |
| `GET /api/admin/*` | Admin endpoints |
| **`GET /api/ai/admin/insights`** | 🧠 AI Platform Insights |
| **`GET /api/ai/admin/menu-optimizer`** | 🍽️ AI Menu Analysis (Groq-powered) |
| **`GET /api/ai/admin/price-optimizer`** | 💰 AI Pricing |
| **`GET /api/ai/admin/customer-segments`** | 👥 AI Customer Segments |

---

## 🔐 Authentication

### Admin Auth (Super Admin Only):
```javascript
import adminAuth from "./middleware/adminAuth.js";

router.get("/admin-endpoint", adminAuth, async (req, res) => {
  // Only super admins can access
  const adminId = req.admin._id;
  // ...
});
```

### User Auth:
```javascript
import auth from "./middleware/auth.js";

router.get("/user-endpoint", auth, async (req, res) => {
  // Any authenticated user
  const userId = req.user._id;
  // ...
});
```

---

## 🧠 AI Implementation Details

### Endpoints File: `backend/routes/aiAdminRoute.js`

#### 1. AI Insights (`/api/ai/admin/insights`)
- Analyzes 7-day platform data
- Returns: KPIs, month growth, recommendations
- No setup needed ✅

#### 2. AI Menu (`/api/ai/admin/menu-optimizer`)
- **NEW**: Integrates Groq API
- Analyzes all menu items
- Returns: status per item, category breakdown, top promote/removals
- **Requires**: `GROQ_API_KEY` in .env (optional but recommended)

#### 3. Price Optimizer (`/api/ai/admin/price-optimizer`)
- Calculates elasticity per item
- Returns: recommended prices
- No setup needed ✅

#### 4. Customer Segments (`/api/ai/admin/customer-segments`)
- Segments users into 6 behavioral groups
- Returns: segment metrics, engagement strategies
- No setup needed ✅

---

## 🚀 Environment Variables

Required:
```env
MONGO_URL=mongodb+srv://...
JWT_SECRET=your_secret_key_32_chars_min
```

Optional but recommended:
```env
GROQ_API_KEY=gsk_your_key  # For real AI menu analysis
```

See `.env.example` for all options.

---

## 📊 Database Models

**Food** — Menu items
- name, category, price, avgRating
- image, description, inStock

**Order** — Customer orders
- userId, items[], totalAmount
- status, address, timestamp

**User** — Customers
- name, email, phone
- address, favoriteItems

**Restaurant** — restaurant info
- name, location, rating
- phone, owner

**Review** — Order reviews
- orderId, rating, comment

---

## 🧪 Testing

```bash
# Start server in dev mode
npm run server

# Server will:
# - Check MongoDB connection
# - Validate JWT_SECRET
# - Check for GROQ_API_KEY (optional)
# - Setup all routes
# - Listen on :4000
```

Test with curl:
```bash
# Get AI insights
curl http://localhost:4000/api/ai/admin/insights \
  -H "Authorization: Bearer {adminToken}"
```

---

## 🛠️ Development

Watch mode with auto-restart:
```bash
npm run server
# Uses nodemon from config/nodemon.json
```

---

## 🔗 Related Documentation

- **AI Setup**: See `AI_SETUP.md`
- **Quick Start**: See `AI_QUICK_START.md`
- **Complete Guide**: See `AI_IMPLEMENTATION_COMPLETE.md`
- **Feature Access**: See `FEATURE_ACCESS_GUIDE.md`

---

## 🎯 Feature Status

| Feature | Status | Needs Setup |
|---------|--------|------------|
| User Auth | ✅ Working | No |
| Food Management | ✅ Working | No |
| Orders | ✅ Working | No |
| AI Insights | ✅ Working | No |
| AI Menu | ✅ Working | Optional (Groq) |
| AI Pricing | ✅ Working | No |
| AI Segments | ✅ Working | No |

---

## 📞 Support

For AI setup issues, see `backend/AI_SETUP.md`

For feature access questions, see `FEATURE_ACCESS_GUIDE.md`
