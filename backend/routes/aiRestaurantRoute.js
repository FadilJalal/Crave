import express from "express";
import restaurantAuth from "../middleware/restaurantAuth.js";
import foodModel from "../models/foodModel.js";
import orderModel from "../models/orderModel.js";
import reviewModel from "../models/reviewModel.js";
import userModel from "../models/userModel.js";

const router = express.Router();

// ── 9. SALES FORECAST ───────────────────────────────────────────────────────
router.get("/forecast", restaurantAuth, async (req, res) => {
  try {
    const orders = await orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).select("amount createdAt").lean();
    if (orders.length < 7) return res.json({ success: true, data: { message: "Need at least 7 orders for forecasting", forecast: [] } });

    const dailyRev = {}, dailyOrd = {};
    orders.forEach(o => {
      const k = new Date(o.createdAt).toISOString().slice(0, 10);
      dailyRev[k] = (dailyRev[k] || 0) + (o.amount || 0);
      dailyOrd[k] = (dailyOrd[k] || 0) + 1;
    });

    const dowRev = Array(7).fill(0), dowCnt = Array(7).fill(0);
    Object.entries(dailyRev).forEach(([d, r]) => { const dow = new Date(d).getDay(); dowRev[dow] += r; dowCnt[dow]++; });
    const dowAvg = dowRev.map((r, i) => dowCnt[i] > 0 ? Math.round(r / dowCnt[i]) : 0);

    const sorted = Object.entries(dailyRev).sort((a, b) => a[0].localeCompare(b[0]));
    const last7 = sorted.slice(-7);
    const ma7 = last7.reduce((s, [, r]) => s + r, 0) / Math.max(last7.length, 1);

    const avgOrderVal = orders.reduce((s, o) => s + (o.amount || 0), 0) / orders.length;
    const forecast = [];
    const today = new Date();
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const dow = d.getDay();
      const rev = Math.round(dowAvg[dow] * 0.6 + ma7 * 0.4);
      forecast.push({ date: d.toISOString().slice(0, 10), dayName: dayNames[dow], predictedRevenue: rev, predictedOrders: Math.max(1, Math.round(rev / avgOrderVal)), confidence: sorted.length >= 30 ? "high" : sorted.length >= 14 ? "medium" : "low" });
    }

    res.json({ success: true, data: { forecast, weekTotal: forecast.reduce((s, f) => s + f.predictedRevenue, 0), movingAverage: Math.round(ma7), dayOfWeekPattern: dowAvg.map((a, i) => ({ day: dayNames[i], avgRevenue: a })), dataPoints: sorted.length } });
  } catch (e) {
    console.error("[ai/forecast]", e);
    res.json({ success: false, message: "Forecast failed" });
  }
});

// ── 10. MENU OPTIMIZATION ───────────────────────────────────────────────────
router.get("/menu-insights", restaurantAuth, async (req, res) => {
  try {
    const [foods, orders] = await Promise.all([
      foodModel.find({ restaurantId: req.restaurantId }).lean(),
      orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).lean(),
    ]);

    const itemStats = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      const id = String(it._id);
      if (!itemStats[id]) itemStats[id] = { orders: 0, revenue: 0 };
      itemStats[id].orders += it.quantity || 1;
      itemStats[id].revenue += (it.price || 0) * (it.quantity || 1);
    }));

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + (o.amount || 0), 0);

    const insights = foods.map(f => {
      const id = String(f._id);
      const st = itemStats[id] || { orders: 0, revenue: 0 };
      const ordShare = totalOrders > 0 ? st.orders / totalOrders * 100 : 0;
      const revShare = totalRevenue > 0 ? st.revenue / totalRevenue * 100 : 0;
      const popScore = Math.min(100, ordShare * 5);
      const revScore = Math.min(100, revShare * 5);
      const ratScore = f.avgRating ? (f.avgRating / 5 * 100) : 50;
      const composite = Math.round(popScore * 0.4 + revScore * 0.4 + ratScore * 0.2);

      let status = "star";
      if (st.orders === 0) status = "dead";
      else if (composite < 20) status = "underperformer";
      else if (composite < 40) status = "average";
      else if (composite < 70) status = "good";

      let suggestion = "";
      if (status === "dead") suggestion = "Zero orders — consider removing or promoting this item.";
      else if (status === "underperformer") suggestion = "Try lowering the price or improving the photo.";
      else if (status === "star") suggestion = "Top performer! Feature it or create combos around it.";

      return { _id: f._id, name: f.name, category: f.category, price: f.price, image: f.image, orders: st.orders, revenue: Math.round(st.revenue), orderShare: Math.round(ordShare * 10) / 10, revenueShare: Math.round(revShare * 10) / 10, avgRating: f.avgRating || 0, compositeScore: composite, status, suggestion };
    }).sort((a, b) => b.compositeScore - a.compositeScore);

    const catStats = {};
    insights.forEach(i => {
      if (!catStats[i.category]) catStats[i.category] = { orders: 0, revenue: 0, items: 0 };
      catStats[i.category].orders += i.orders;
      catStats[i.category].revenue += i.revenue;
      catStats[i.category].items++;
    });

    res.json({ success: true, data: { items: insights, stars: insights.filter(i => i.status === "star").map(i => i.name), underperformers: insights.filter(i => i.status === "underperformer" || i.status === "dead").map(i => i.name), categoryBreakdown: Object.entries(catStats).map(([cat, s]) => ({ category: cat, ...s })).sort((a, b) => b.revenue - a.revenue), totalItems: foods.length } });
  } catch (e) {
    console.error("[ai/menu-insights]", e);
    res.json({ success: false, message: "Menu analysis failed" });
  }
});

// ── 11. CHURN PREDICTION ────────────────────────────────────────────────────
router.get("/churn", restaurantAuth, async (req, res) => {
  try {
    const orders = await orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).select("userId createdAt amount").lean();
    const byUser = {};
    orders.forEach(o => { const u = String(o.userId); if (!byUser[u]) byUser[u] = []; byUser[u].push(o); });

    const now = Date.now();
    const atRisk = [];

    for (const [userId, uo] of Object.entries(byUser)) {
      if (uo.length < 2) continue;
      uo.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const gaps = [];
      for (let i = 0; i < uo.length - 1; i++) gaps.push((new Date(uo[i].createdAt) - new Date(uo[i + 1].createdAt)) / 864e5);
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const daysSince = (now - new Date(uo[0].createdAt)) / 864e5;
      const spent = uo.reduce((s, o) => s + (o.amount || 0), 0);

      let risk = "low";
      if (daysSince > avgGap * 3) risk = "critical";
      else if (daysSince > avgGap * 2) risk = "high";
      else if (daysSince > avgGap * 1.5) risk = "medium";

      if (risk !== "low") atRisk.push({ userId, orderCount: uo.length, totalSpent: Math.round(spent), avgGapDays: Math.round(avgGap), daysSinceLast: Math.round(daysSince), risk, lastOrderDate: uo[0].createdAt });
    }

    const users = await userModel.find({ _id: { $in: atRisk.map(c => c.userId) } }).select("name email").lean();
    const uMap = {}; users.forEach(u => { uMap[String(u._id)] = u; });

    const enriched = atRisk.map(c => ({ ...c, name: uMap[c.userId]?.name || "Unknown", email: uMap[c.userId]?.email || "" }))
      .sort((a, b) => { const o = { critical: 0, high: 1, medium: 2 }; return (o[a.risk] ?? 3) - (o[b.risk] ?? 3); });

    res.json({ success: true, data: { atRisk: enriched, summary: { critical: enriched.filter(c => c.risk === "critical").length, high: enriched.filter(c => c.risk === "high").length, medium: enriched.filter(c => c.risk === "medium").length }, totalCustomers: Object.keys(byUser).length, potentialRevenueLoss: enriched.reduce((s, c) => s + Math.round(c.totalSpent / c.orderCount), 0) } });
  } catch (e) {
    console.error("[ai/churn]", e);
    res.json({ success: false, message: "Churn analysis failed" });
  }
});

// ── 12. STOCK ALERTS ────────────────────────────────────────────────────────
router.get("/stock-alerts", restaurantAuth, async (req, res) => {
  try {
    const ago = new Date(Date.now() - 7 * 864e5);
    const [foods, recent] = await Promise.all([
      foodModel.find({ restaurantId: req.restaurantId }).lean(),
      orderModel.find({ restaurantId: req.restaurantId, createdAt: { $gte: ago }, status: { $ne: "Cancelled" } }).lean(),
    ]);

    const vel = {};
    recent.forEach(o => (o.items || []).forEach(it => { const id = String(it._id); vel[id] = (vel[id] || 0) + (it.quantity || 1); }));

    const items = foods.map(f => {
      const id = String(f._id);
      const wk = vel[id] || 0;
      const daily = Math.round((wk / 7) * 10) / 10;
      let trend = "stable";
      if (daily > 5) trend = "high_demand";
      else if (daily > 2) trend = "moderate_demand";
      else if (daily === 0) trend = "no_orders";

      return { _id: f._id, name: f.name, category: f.category, inStock: f.inStock, weeklyOrders: wk, dailyAvg: daily, trend, alert: !f.inStock ? "Currently out of stock" : trend === "high_demand" ? "High demand — ensure stock!" : trend === "no_orders" ? "No orders this week" : null };
    }).sort((a, b) => b.dailyAvg - a.dailyAvg);

    res.json({ success: true, data: { items, highDemand: items.filter(a => a.trend === "high_demand").length, outOfStock: items.filter(a => !a.inStock).length, noOrders: items.filter(a => a.trend === "no_orders").length } });
  } catch (e) {
    console.error("[ai/stock]", e);
    res.json({ success: false, message: "Stock analysis failed" });
  }
});

// ── 13. AI MENU GENERATOR ───────────────────────────────────────────────────
router.post("/generate-menu", restaurantAuth, async (req, res) => {
  try {
    const { category, cuisine, dietary = "None", count = 5 } = req.body;
    if (!category || !cuisine) return res.json({ success: false, message: "Category and cuisine required" });

    // Comprehensive menu templates by category and cuisine
    const templates = {
      "Appetizers": {
        "Italian": [
          { name: "Bruschetta al Pomodoro", desc: "Toasted bread with fresh tomato, basil, and garlic", preps: "5 mins", price: [28, 35], ing: ["Bread", "Tomatoes", "Basil", "Garlic"] },
          { name: "Caprese Skewers", desc: "Mozzarella, tomato, and basil on skewers with balsamic", preps: "6 mins", price: [32, 40], ing: ["Mozzarella", "Tomato", "Basil", "Balsamic vinegar"] },
          { name: "Arancini", desc: "Golden fried risotto balls with ragù and peas", preps: "8 mins", price: [25, 32], ing: ["Risotto", "Ragù", "Peas", "Breadcrumbs"] },
          { name: "Calamari Fritti", desc: "Crispy fried squid with lemon and marinara sauce", preps: "10 mins", price: [35, 45], ing: ["Squid", "Lemon", "Marinara sauce"] },
          { name: "Antipasto Platter", desc: "Selection of cured meats, cheeses, and olives", preps: "4 mins", price: [42, 55], ing: ["Prosciutto", "Parmesan", "Olives", "Mozzarella"] }
        ],
        "Chinese": [
          { name: "Crispy Spring Rolls", desc: "Golden rolls filled with vegetables and shrimp", preps: "8 mins", price: [20, 28], ing: ["Spring roll wrapper", "Shrimp", "Cabbage", "Carrots"] },
          { name: "Chicken Satay", desc: "Grilled marinated chicken skewers with peanut sauce", preps: "12 mins", price: [25, 35], ing: ["Chicken", "Peanut sauce", "Bamboo skewers"] },
          { name: "Steamed Dumplings", desc: "Pork and vegetable dumplings with soy dipping sauce", preps: "9 mins", price: [18, 25], ing: ["Pork", "Cabbage", "Dumpling wrapper", "Soy sauce"] },
          { name: "Edamame with Sea Salt", desc: "Steamed soybeans seasoned with coarse sea salt", preps: "6 mins", price: [15, 20], ing: ["Edamame", "Sea salt"] },
          { name: "Tuna Tartare on Crispy Wonton", desc: "Fresh tuna with ginger and soy on crispy wontons", preps: "8 mins", price: [32, 42], ing: ["Tuna", "Ginger", "Soy sauce", "Wonton"] }
        ],
        "Indian": [
          { name: "Samosa (2 pieces)", desc: "Crispy pastry pockets filled with spiced potato and peas", preps: "7 mins", price: [15, 22], ing: ["Potato", "Peas", "Pastry", "Spices"] },
          { name: "Paneer Tikka", desc: "Marinated paneer cubes grilled with peppers and onions", preps: "10 mins", price: [28, 38], ing: ["Paneer", "Yogurt", "Peppers", "Onions"] },
          { name: "Chaat - Pani Puri", desc: "Crispy shells filled with potatoes, chickpeas, tamarind water", preps: "8 mins", price: [20, 28], ing: ["Puri shells", "Potato", "Chickpeas", "Tamarind water"] },
          { name: "Chicken 65", desc: "Spicy fried chicken with curry leaves and red chili", preps: "12 mins", price: [25, 35], ing: ["Chicken", "Curry leaves", "Red chili", "Cornstarch"] },
          { name: "Vegetable Pakora", desc: "Assorted vegetables in spiced chickpea batter, deep fried", preps: "9 mins", price: [18, 25], ing: ["Vegetables", "Chickpea flour", "Spices"] }
        ]
      },
      "Main Course": {
        "Italian": [
          { name: "Spaghetti Carbonara", desc: "Classic pasta with eggs, bacon, parmesan, and black pepper", preps: "14 mins", price: [38, 48], ing: ["Spaghetti", "Eggs", "Bacon", "Parmesan"] },
          { name: "Risotto ai Funghi", desc: "Creamy arborio rice with porcini mushrooms and butter", preps: "18 mins", price: [42, 55], ing: ["Arborio rice", "Porcini", "Butter", "Wine"] },
          { name: "Osso Buco", desc: "Braised veal shanks in tomato wine sauce with gremolata", preps: "120 mins", price: [68, 85], ing: ["Veal shank", "Tomato", "Wine", "Parsley"] },
          { name: "Linguine alle Vongole", desc: "Pasta with fresh clams, garlic, white wine sauce", preps: "16 mins", price: [48, 62], ing: ["Linguine", "Clams", "Garlic", "White wine"] },
          { name: "Chicken Parmigiana", desc: "Breaded chicken breast with tomato sauce and melted mozzarella", preps: "22 mins", price: [45, 58], ing: ["Chicken", "Tomato sauce", "Mozzarella", "Breadcrumbs"] }
        ],
        "Chinese": [
          { name: "Kung Pao Chicken", desc: "Diced chicken with peanuts, chilies, and a savory sauce", preps: "12 mins", price: [32, 42], ing: ["Chicken", "Peanuts", "Red chili", "Soy sauce"] },
          { name: "General Tso's Chicken", desc: "Crispy chicken in a spicy, sweet and tangy sauce", preps: "15 mins", price: [35, 45], ing: ["Chicken", "Soy sauce", "Garlic", "Red chili"] },
          { name: "Mapo Tofu", desc: "Silken tofu in spicy Sichuan peppercorn sauce with ground pork", preps: "10 mins", price: [28, 38], ing: ["Tofu", "Ground pork", "Sichuan pepper", "Garlic"] },
          { name: "Peking Duck", desc: "Roasted duck with pancakes, hoisin sauce, and scallions", preps: "90 mins", price: [58, 75], ing: ["Duck", "Pancakes", "Hoisin sauce", "Scallions"] },
          { name: "Chow Mein with Shrimp", desc: "Stir-fried noodles with shrimp, vegetables, and soy sauce", preps: "10 mins", price: [32, 42], ing: ["Noodles", "Shrimp", "Mixed vegetables"] }
        ],
        "Indian": [
          { name: "Butter Chicken", desc: "Tender chicken in creamy tomato butter sauce with spices", preps: "20 mins", price: [35, 48], ing: ["Chicken", "Tomato", "Cream", "Butter"] },
          { name: "Lamb Biryani", desc: "Fragrant basmati rice layered with lamb and aromatic spices", preps: "45 mins", price: [48, 65], ing: ["Lamb", "Basmati rice", "Yogurt", "Spices"] },
          { name: "Tandoori Chicken", desc: "Marinated chicken roasted in clay oven, served with lemon and chutneys", preps: "35 mins", price: [42, 55], ing: ["Chicken", "Yogurt", "Tandoori spice"] },
          { name: "Palak Paneer", desc: "Cottage cheese cubes in creamy spinach sauce with spices", preps: "18 mins", price: [32, 42], ing: ["Paneer", "Spinach", "Cream", "Spices"] },
          { name: "Rogan Josh", desc: "Slow-cooked meat in aromatic tomato-based sauce", preps: "40 mins", price: [42, 55], ing: ["Meat", "Tomato", "Yogurt", "Spices"] }
        ]
      },
      "Desserts": {
        "Italian": [
          { name: "Tiramisu", desc: "Layers of espresso-dipped ladyfingers with mascarpone cream", preps: "8 mins", price: [28, 35], ing: ["Ladyfingers", "Mascarpone", "Espresso", "Cocoa"] },
          { name: "Panna Cotta", desc: "Silky smooth Italian custard with berry compote", preps: "6 mins", price: [22, 30], ing: ["Cream", "Gelatin", "Sugar", "Berries"] },
          { name: "Zabaglione", desc: "Sweet custard made with egg yolks and Marsala wine", preps: "7 mins", price: [20, 28], ing: ["Eggs", "Marsala wine", "Sugar"] }
        ],
        "Chinese": [
          { name: "Mango Pudding", desc: "Silky mango-flavored gelatin with fresh mango pieces", preps: "5 mins", price: [18, 25], ing: ["Mango", "Gelatin", "Condensed milk"] },
          { name: "Sesame Balls", desc: "Deep-fried glutinous rice balls with sesame seeds and red bean filling", preps: "8 mins", price: [15, 22], ing: ["Glutinous rice", "Red bean", "Sesame seeds"] }
        ],
        "Indian": [
          { name: "Gulab Jamun", desc: "Soft milk solids dumplings in rose-flavored sugar syrup", preps: "15 mins", price: [20, 28], ing: ["Milk solids", "Rose syrup", "Cardamom"] },
          { name: "Kheer", desc: "Creamy rice pudding with milk, sugar, nuts, and cardamom", preps: "25 mins", price: [18, 26], ing: ["Rice", "Milk", "Sugar", "Nuts"] },
          { name: "Ras Malai", desc: "Soft cheese discs in sweetened condensed milk with pistachios", preps: "12 mins", price: [22, 32], ing: ["Cheese", "Milk", "Sugar", "Pistachios"] }
        ]
      },
      "Beverages": {
        "Italian": [
          { name: "Espresso", desc: "Strong, concentrated shot of coffee", preps: "2 mins", price: [8, 12], ing: ["Coffee beans"] },
          { name: "Cappuccino", desc: "Espresso with steamed milk and milk foam", preps: "4 mins", price: [12, 16], ing: ["Coffee", "Milk"] }
        ],
        "Chinese": [
          { name: "Bubble Tea - Brown Sugar", desc: "Sweet tea with tapioca pearls and creamy milk", preps: "5 mins", price: [14, 18], ing: ["Tea", "Brown sugar", "Tapioca pearls", "Milk"] },
          { name: "Fresh Lychee Juice", desc: "Refreshing juice from fresh lychee fruits", preps: "3 mins", price: [12, 16], ing: ["Lychee"] }
        ],
        "Indian": [
          { name: "Mango Lassi", desc: "Yogurt-based drink with fresh mango and cardamom", preps: "4 mins", price: [10, 14], ing: ["Yogurt", "Mango", "Cardamom"] },
          { name: "Masala Chai", desc: "Indian spiced tea with milk and aromatic spices", preps: "6 mins", price: [8, 12], ing: ["Tea", "Milk", "Spices"] }
        ]
      },
      "Salads": {
        "Italian": [
          { name: "Classic Caesar Salad", desc: "Crispy romaine with parmesan, croutons, and Caesar dressing", preps: "8 mins", price: [22, 30], ing: ["Romaine", "Parmesan", "Croutons"] },
          { name: "Insalata Tricolore", desc: "Tomato, mozzarella, basil with olive oil dressing", preps: "5 mins", price: [25, 35], ing: ["Tomato", "Mozzarella", "Basil"] }
        ],
        "Chinese": [
          { name: "Sesame Cucumber Salad", desc: "Cool crispy cucumber with sesame oil and soy dressing", preps: "6 mins", price: [16, 22], ing: ["Cucumber", "Sesame oil", "Soy sauce"] }
        ],
        "Indian": [
          { name: "Kachumber Salad", desc: "Fresh diced vegetables with lemon and cumin dressing", preps: "8 mins", price: [14, 20], ing: ["Cucumber", "Tomato", "Onion", "Lemon"] }
        ]
      },
      "Soups": {
        "Italian": [
          { name: "Minestrone", desc: "Hearty vegetable soup with pasta and Italian herbs", preps: "20 mins", price: [18, 26], ing: ["Vegetables", "Pasta", "Herbs"] },
          { name: "Pasta e Fagioli", desc: "Creamy beans and pasta in tomato broth", preps: "25 mins", price: [16, 24], ing: ["Beans", "Pasta", "Tomato"] }
        ],
        "Chinese": [
          { name: "Hot and Sour Soup", desc: "Tangy and spicy broth with tofu and mushrooms", preps: "10 mins", price: [14, 20], ing: ["Tofu", "Mushrooms", "Vinegar", "Chili"] },
          { name: "Wonton Soup", desc: "Delicate wontons in savory chicken broth", preps: "8 mins", price: [16, 22], ing: ["Wontons", "Chicken broth"] }
        ],
        "Indian": [
          { name: "Mulligatawny Soup", desc: "Fragrant South Indian soup with lentils and spices", preps: "18 mins", price: [16, 23], ing: ["Lentils", "Coconut milk", "Spices"] },
          { name: "Dal Soup", desc: "Creamy lentil soup with cumin and garlic", preps: "20 mins", price: [12, 18], ing: ["Lentils", "Cumin", "Garlic"] }
        ]
      }
    };

    // Emoji and color mapping
    const cuisineEmojis = {
      "Italian": { emoji: "🇮🇹", color: "#FF6B35", color2: "#F7931E" },
      "Chinese": { emoji: "🥢", color: "#C60C30", color2: "#FFD700" },
      "Indian": { emoji: "🇮🇳", color: "#FF9933", color2: "#138808" },
      "Mexican": { emoji: "🌮", color: "#E74C3C", color2: "#F39C12" },
      "American": { emoji: "🍔", color: "#8B4513", color2: "#D2691E" },
      "Mediterranean": { emoji: "🫒", color: "#2E8B57", color2: "#20B2AA" },
      "Japanese": { emoji: "🍣", color: "#FF0000", color2: "#FFFFFF" },
      "Thai": { emoji: "🌶️", color: "#D32F2F", color2: "#FFC107" },
      "French": { emoji: "🥐", color: "#4B0082", color2: "#FFD700" },
      "Arabic": { emoji: "🫔", color: "#8B4513", color2: "#DAA520" }
    };

    const categoryData = templates[category] || templates["Main Course"];
    const cuisineData = categoryData[cuisine] || categoryData[Object.keys(categoryData)[0]];
    const cuisineStyle = cuisineEmojis[cuisine] || { emoji: "🍽️", color: "#667eea", color2: "#764ba2" };

    // Generate items with dietary filtering
    let filtered = cuisineData;
    if (dietary && dietary !== "None") {
      filtered = cuisineData.filter(item => {
        const combined = `${item.name} ${item.desc} ${item.ing.join(" ")}`.toLowerCase();
        if (dietary === "Vegetarian") return !combined.match(/meat|chicken|beef|fish|shrimp|lamb|pork/);
        if (dietary === "Vegan") return !combined.match(/meat|chicken|beef|fish|shrimp|lamb|pork|egg|cheese|milk|cream|butter/);
        if (dietary === "Dairy-Free") return !combined.match(/cheese|milk|cream|butter|dairy/);
        if (dietary === "Gluten-Free") return !combined.match(/bread|pasta|flour|wheat|noodle|dumpling/);
        return true;
      });
      if (filtered.length === 0) filtered = cuisineData; // Fallback if no matches
    }

    const generated = filtered
      .slice(0, Math.min(count, filtered.length))
      .map(item => ({
        name: item.name,
        description: item.desc,
        category: category,
        cuisine: cuisine,
        dietary: dietary,
        prepTime: item.preps,
        suggestedPrice: item.price[0] + Math.floor(Math.random() * (item.price[1] - item.price[0])),
        ingredients: item.ing,
        emoji: cuisineStyle.emoji,
        color: cuisineStyle.color,
        color2: cuisineStyle.color2
      }));

    res.json({ success: true, items: generated });
  } catch (e) {
    console.error("[ai/generate-menu]", e);
    res.json({ success: false, message: "Menu generation failed" });
  }
});

// ── 14. PRICE OPTIMIZATION ──────────────────────────────────────────────────
router.get("/price-optimization", restaurantAuth, async (req, res) => {
  try {
    const [foods, orders] = await Promise.all([
      foodModel.find({ restaurantId: req.restaurantId }).lean(),
      orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).lean(),
    ]);

    const stats = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      const id = String(it._id);
      if (!stats[id]) stats[id] = { count: 0, avgPrice: 0 };
      stats[id].count += it.quantity || 1;
      stats[id].avgPrice = (stats[id].avgPrice * (stats[id].count - (it.quantity || 1)) + (it.price || 0) * (it.quantity || 1)) / stats[id].count;
    }));

    const optimizations = foods.map(f => {
      const id = String(f._id);
      const s = stats[id] || { count: 0, avgPrice: 0 };
      const demandLevel = s.count > 20 ? "high" : s.count > 5 ? "medium" : "low";
      
      let recommendation = "hold";
      let newPrice = f.price;
      let rationale = "Current price is optimal";

      if (demandLevel === "high" && f.price < 100) {
        recommendation = "increase";
        newPrice = Math.round(f.price * 1.1);
        rationale = "High demand detected. Increase by 10% for better margins.";
      } else if (demandLevel === "low" && f.price > 15) {
        recommendation = "decrease";
        newPrice = Math.round(f.price * 0.9);
        rationale = "Low demand. Decrease by 10% to boost sales volume.";
      }

      return {
        itemId: f._id,
        name: f.name,
        currentPrice: f.price,
        suggestedPrice: newPrice,
        demandLevel: demandLevel,
        ordersLast30Days: s.count,
        recommendation: recommendation,
        rationale: rationale,
        potentialIncrement: newPrice - f.price,
        applied: false
      };
    });

    const items = foods.map(f => ({
      _id: f._id,
      name: f.name,
      price: f.price,
      category: f.category,
      optimized: false
    }));

    res.json({ success: true, items, optimizations, summary: { totalItems: foods.length, increaseCount: optimizations.filter(o => o.recommendation === "increase").length, decreaseCount: optimizations.filter(o => o.recommendation === "decrease").length } });
  } catch (e) {
    console.error("[ai/price-optimization]", e);
    res.json({ success: false, message: "Price optimization failed" });
  }
});

// ── 15. CUSTOMER SEGMENTATION ───────────────────────────────────────────────
router.get("/customer-segmentation", restaurantAuth, async (req, res) => {
  try {
    const orders = await orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).select("userId amount createdAt").lean();
    const users = await userModel.find().select("name email phone").lean();
    const uMap = {}; users.forEach(u => { uMap[String(u._id)] = u; });

    const byUser = {};
    orders.forEach(o => {
      const uid = String(o.userId);
      if (!byUser[uid]) byUser[uid] = { orders: 0, spending: 0, lastOrder: o.createdAt, firstOrder: o.createdAt };
      byUser[uid].orders++;
      byUser[uid].spending += o.amount || 0;
      byUser[uid].lastOrder = new Date(o.createdAt) > new Date(byUser[uid].lastOrder) ? o.createdAt : byUser[uid].lastOrder;
    });

    const now = Date.now();
    const segments = {};
    const customers = [];

    for (const [uid, data] of Object.entries(byUser)) {
      const avgOrder = data.spending / data.orders;
      const daysSinceLast = (now - new Date(data.lastOrder)) / 864e5;
      const daysActive = (now - new Date(data.firstOrder)) / 864e5;
      
      let segmentType = "Regular";
      if (data.orders >= 20 && data.spending > 500) segmentType = "VIP";
      else if (data.orders >= 10 && daysSinceLast < 30) segmentType = "Loyal";
      else if (daysSinceLast > 90) segmentType = "Lost";
      else if (data.orders === 1 && daysSinceLast < 7) segmentType = "New";
      else if (daysSinceLast > 60 && daysActive > 30) segmentType = "At Risk";

      if (!segments[segmentType]) segments[segmentType] = [];
      segments[segmentType].push(uid);

      const user = uMap[uid] || { name: "Unknown", email: "", phone: "" };
      customers.push({
        userId: uid,
        name: user.name,
        email: user.email,
        orderCount: data.orders,
        totalSpent: Math.round(data.spending),
        avgOrderValue: Math.round(avgOrder),
        lastOrderDate: data.lastOrder,
        segment: segmentType,
        daysActive: Math.round(daysActive)
      });
    }

    const metrics = {
      totalCustomers: Object.keys(byUser).length,
      totalRevenue: orders.reduce((s, o) => s + (o.amount || 0), 0),
      bySegment: Object.entries(segments).map(([type, ids]) => ({ segment: type, count: ids.length }))
    };

    res.json({ success: true, segments: Object.entries(segments).map(([type, ids]) => ({ type, count: ids.length, emoji: { "VIP": "👑", "Loyal": "💎", "Regular": "👤", "At Risk": "⚠️", "Lost": "💔", "New": "🌟" }[type] || "👤" })), customers: customers.sort((a, b) => b.totalSpent - a.totalSpent), metrics });
  } catch (e) {
    console.error("[ai/customer-segmentation]", e);
    res.json({ success: false, message: "Segmentation failed" });
  }
});

export default router;
