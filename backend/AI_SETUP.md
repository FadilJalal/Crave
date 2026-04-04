# 🤖 AI Integration Setup

## Real AI Menu Optimizer (Using Groq - Free)

### ✅ What You Get
- Real AI analysis of your menu items
- Intelligent recommendations powered by Mixtral LLM
- Completely **FREE** - no credit card needed, no limits

### 🚀 Setup Steps

#### 1. Get a Free Groq API Key (2 minutes)
1. Go to https://console.groq.com/keys
2. Sign up (free account)
3. Create an API key
4. Copy the key

#### 2. Add to Your `.env` File
Create or edit `backend/.env`:

```env
# Groq AI API Key (get free from https://console.groq.com/keys)
GROQ_API_KEY=gsk_your_api_key_here
```

#### 3. Restart Backend
```bash
cd backend
npm run server
```

#### 4. Test It
- Go to Admin Super → AI Tools → 🍽️ AI Menu
- You should see real AI insights now!

---

## 🔄 What Happens Behind The Scenes

1. **Frontend** sends request to `/api/ai/admin/menu-optimizer`
2. **Backend** collects all menu items + order history
3. **Backend** calls Groq API with prompt: "Analyze this menu..."
4. **Groq AI** (Mixtral LLM) analyzes items and returns:
   - Performance status (STAR/GOOD/AVERAGE/LOW/DEAD)
   - Reason for status
   - Recommended action
   - Top items to remove/promote
5. **Backend** returns insights to frontend
6. **Frontend** displays AI recommendations

---

## 📊 Sample AI Response

```json
{
  "items": [
    {
      "name": "Biryani Special",
      "status": "STAR",
      "orders": 45,
      "revenue": 2250,
      "aiInsight": {
        "reason": "High demand, excellent ratings, strong revenue",
        "action": "Feature on homepage, consider premium pricing"
      }
    },
    {
      "name": "Random Soup",
      "status": "DEAD",
      "orders": 0,
      "revenue": 0,
      "aiInsight": {
        "reason": "Zero demand, not matching customer preferences",
        "action": "Remove from menu or rebrand completely"
      }
    }
  ],
  "topRemovals": ["Random Soup", "Odd Salad"],
  "topPromote": ["Biryani Special", "Butter Chicken"]
}
```

---

## 🎯 Price Tiers (All Free!)

| Feature | Free Tier | Limit |
|---------|-----------|-------|
| Menu Analysis Calls | Unlimited | - |
| Tokens per Call | 10,000 | - |
| Items Analyzed | Up to 20 per call | - |
| Response Time | ~5 seconds | - |
| Cost | **$0** | - |

---

## 🛠️ Troubleshooting

### "GROQ_API_KEY not set"
→ Add your key to `.env` and restart backend

### "API Error 401"
→ Your API key is invalid or expired. Get a new one from console.groq.com

### "Falling back to rules"
→ Groq call failed. Check backend logs. Backend will use rule-based analysis as fallback.

### Still Getting Rule-Based Results
→ Check backend console for error messages. Groq might be rate limited or API key invalid.

---

## ✨ Models Available (All Free)

- `mixtral-8x7b-32768` (recommended) - 32K context, very smart
- `llama2-70b-4096` - Smaller, faster
- `gemma-7b-it` - Lightweight

All included with free Groq account!

---

## 📝 Environment Variables

```env
# Required for AI Menu Optimizer
GROQ_API_KEY=your_key_here

# Optional (other services)
MONGO_URL=mongodb://...
JWT_SECRET=your_secret
```

---

**Need Help?**
- Groq API Docs: https://console.groq.com/docs/
- API Status: https://status.groq.com/
- Support: support@groq.com
