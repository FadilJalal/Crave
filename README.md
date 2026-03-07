# 🍅 Tomato Food Ordering Platform

A multi-tenant food ordering platform with:
- **Customer Frontend** (port 5174) — browse restaurants, order food, track orders
- **Super Admin Panel** (port 5173) — manage restaurants, view all orders
- **Restaurant Admin Panel** (port 5175) — manage menu, view own orders
- **Backend API** (port 4000) — Node.js + Express + MongoDB

---

## 🚀 Setup Instructions

### 1. Backend

```bash
cd backend
cp .env .env.local   # copy the env template
# Fill in your real values in .env:
#   MONGO_URL — your MongoDB Atlas connection string
#   JWT_SECRET — run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
#   ADMIN_JWT_SECRET — run same command again for a different value
#   STRIPE_SECRET_KEY — from https://dashboard.stripe.com/apikeys
#   FRONTEND_URL — your deployed frontend URL (or http://localhost:5174 for dev)

npm install
node seedSuperAdmin.js   # creates the superadmin account (run once)
npm run server
```

### 2. Frontend (Customer App)

```bash
cd frontend
# Edit .env — set VITE_BACKEND_URL to your backend URL
npm install
npm run dev   # runs on port 5174
```

### 3. Super Admin Panel

```bash
cd admin-super
# Edit .env — set VITE_BACKEND_URL
npm install
npm run dev   # runs on port 5173
```

### 4. Restaurant Admin Panel

```bash
cd restaurant-admin
# Edit .env — set VITE_BACKEND_URL
npm install
npm run dev   # runs on port 5175
```

---

## 🔐 Login Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@tomato.com | super123 |
| Restaurant Admin | (email set when restaurant is created) | (password set when restaurant is created) |

**⚠️ Change the super admin password immediately after first login in production.**

---

## 🔄 Full User Flow

1. **Super Admin** logs into admin panel → adds a restaurant (sets email + password)
2. **Restaurant Admin** logs into restaurant panel → adds food items to menu
3. **Customer** visits frontend → browses food → places order (COD or Stripe)
4. **Restaurant Admin** sees new order → updates status to "Out for delivery" → "Delivered"
5. **Customer** tracks order in "My Orders"

---

## 🛡️ Security Checklist Before Going Live

- [ ] Replace all placeholder values in all `.env` files
- [ ] Use strong random JWT secrets (64+ characters)
- [ ] Set `ALLOWED_ORIGINS` in backend `.env` to your actual domain(s)
- [ ] Set `FRONTEND_URL` to your actual frontend domain
- [ ] Enable HTTPS on your server
- [ ] Change the default super admin password
- [ ] Never commit `.env` files to git

---

## 📁 Project Structure

```
├── backend/          — Node.js API server
├── frontend/         — Customer-facing React app
├── admin-super/      — Super admin React panel
└── restaurant-admin/ — Restaurant admin React panel
```
# Food-Ordering-Website-Latest
# Crave
