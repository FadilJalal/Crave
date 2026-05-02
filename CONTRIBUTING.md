# Contributing to Crave

## Dev Environment Setup

### Prerequisites
- Node.js 20+
- MongoDB 7 (local or Atlas)
- npm

### Quick Start

```bash
# 1. Clone
git clone https://github.com/FadilJalal/Crave.git
cd Crave

# 2. Backend
cd backend
cp .env.example .env   # Fill in your values
npm install
npm run server         # Runs on http://localhost:4000

# 3. Customer frontend (new terminal)
cd frontend
npm install
npm run dev            # Runs on http://localhost:5173

# 4. Restaurant admin (new terminal)
cd restaurant-admin
npm install
npm run dev            # Runs on http://localhost:5175

# 5. Super admin (new terminal)
cd admin-super
npm install
npm run dev            # Runs on http://localhost:5174
```

### Docker (Alternative)
```bash
docker compose up
```
All services start together with MongoDB in a container.

---

## Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `GROQ_API_KEY` | ✅ | Groq AI key (admin/restaurant routes) |
| `GROQ_MOOD_API_KEY` | ✅ | Groq AI key (customer mood/chat) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `RESEND_API_KEY` | ✅ | Resend.com email API key |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `FRONTEND_URL` | Optional | Customer frontend URL (default: http://localhost:5173) |
| `PORT` | Optional | Backend port (default: 4000) |

---

## Running Tests

```bash
cd backend
npm test           # Run all Jest tests
npm run test:watch # Watch mode
```

Target: 25+ passing tests.

---

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code only |
| `develop` | Integration branch |
| `feature/xyz` | Individual features |
| `fix/xyz` | Bug fixes |

PRs must target `develop`. `main` is only updated via release PRs from `develop`.

---

## Code Style

- No `console.log` in backend — use `logger.info()` / `logger.error()` from `utils/logger.js`
- All POST routes must use the `validate(schema)` middleware from `middleware/validate.js`
- All Groq API calls must go through `utils/groqClient.js` — never raw `fetch()` to Groq
- AI keys must **never** come from request headers or body — always from `process.env`
