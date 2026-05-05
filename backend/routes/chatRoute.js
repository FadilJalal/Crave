import express from "express";
import foodModel from "../models/foodModel.js";
import restaurantModel from "../models/restaurantModel.js";
import reviewModel from "../models/reviewModel.js";
const router = express.Router();

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_KEY = process.env.GROQ_MOOD_API_KEY || process.env.GROQ_API_KEY;
console.log("[chat] Using GROQ_KEY length:", GROQ_KEY ? GROQ_KEY.length : 0);

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function extractBudget(question = "") {
  const q = String(question).toLowerCase();
  const match = q.match(/(?:under|below|less than|max|budget of)\s*(?:aed\s*)?(\d+)/i);
  return match ? Number(match[1]) : null;
}

function getMostRecentBudget(history = [], currentQuestion = "") {
  // Check current question first
  const currentBudget = extractBudget(currentQuestion);
  if (currentBudget) return currentBudget;

  // Scan history backwards for the latest budget mention
  for (let i = history.length - 1; i >= 0; i--) {
    const budget = extractBudget(history[i].content);
    if (budget) return budget;
  }
  return null;
}

function buildStrictBudgetReply(question = "", items = []) {
  const budget = extractBudget(question);
  if (!budget) return null;

  const valid = items
    .filter((i) => Number(i.price) > 0 && Number(i.price) <= budget)
    .sort((a, b) => Number(a.price) - Number(b.price))
    .slice(0, 6);

  if (valid.length) {
    const lines = valid.map((i, idx) => `${idx + 1}. ${i.name} - AED ${Number(i.price)}`);
    return `Great budget choice. Here are options under AED ${budget}:\n${lines.join("\n")}`;
  }

  const closest = items
    .filter((i) => Number(i.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price))
    .slice(0, 3)
    .map((i) => `${i.name} (AED ${Number(i.price)})`);

  if (closest.length) {
    return `I could not find items under AED ${budget}. Lowest-priced options are: ${closest.join(", ")}.`;
  }

  return `I could not find priced items under AED ${budget} right now.`;
}

function formatAssistantReply(text = "") {
  const plain = String(text)
    // Remove markdown emphasis and code ticks.
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    // Normalize markdown bullets to plain bullets.
    .replace(/^\s*[-*]\s+/gm, "• ")
    // Convert markdown links [text](url) to text only.
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .trim();

  const compact = plain
    .replace(/\s+/g, " ")
    .replace(/\s([,.!?;:])/g, "$1")
    .trim();

  // Put numbered recommendations on separate lines for readability.
  // Only split single-digit list markers (1.-9.) to avoid breaking prices like "AED 42.".
  const withFirstListBreak = compact.replace(/:\s([1-9]\.)\s/g, ":\n$1 ");
  const numbered = withFirstListBreak.replace(/\s([1-9]\.)\s/g, "\n$1 ");
  const withBullets = numbered.replace(/•\s/g, "\n• ");

  // Keep paragraphs compact in chat bubble.
  return withBullets
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseMenuContext(menuContext = "") {
  const lines = String(menuContext)
    .split("\n")
    .filter((line) => line.startsWith("- "));

  return lines
    .map((line) => {
      const parts = line.slice(2).split(" | ");
      const priceMatch = parts[2]?.match(/[\d.]+/);
      return {
        name: parts[0]?.trim() || "",
        category: parts[1]?.trim() || "",
        price: priceMatch ? Number(priceMatch[0]) : 0,
        description: parts[3]?.replace(/"/g, "").trim() || "",
      };
    })
    .filter((item) => item.name);
}

function fallbackReply(question = "", items = []) {
  const q = String(question).toLowerCase();
  if (!items.length) return "I couldn't load menu data right now. Please try again in a moment.";

  // Tokenize the question to find specific restaurant or category matches
  const qTokens = tokenize(q);
  
  // Try to find items that match at least one token from the query in their name, category or restaurant
  let filteredItems = items.filter(i => {
    const hay = tokenize(`${i.name} ${i.category} ${i.restaurant || ""}`);
    return qTokens.some(t => hay.includes(t));
  });

  // If no specific keyword match, use all items
  const workingSet = filteredItems.length > 0 ? filteredItems : items;

  // Natural chat handling for greetings and small talk.
  if (/^(hi|hey|hello|yo|hola|salam|assalam|good morning|good evening)\b/.test(q)) {
    return "Hey! I can help you find food by budget, taste, category, or restaurant. Try: spicy under AED 30, best burgers, or vegetarian options.";
  }
  if (/\b(how are you|what can you do|help|who are you)\b/.test(q)) {
    return "I am Crave AI. Ask me about menu items, prices, restaurant info, delivery limits, or recommendations based on your budget and taste.";
  }

  if (q.includes("cheap") || q.includes("budget") || q.includes("under")) {
    const budget = Number(q.match(/(\d+)/)?.[1] || 40);
    const picks = workingSet
      .filter((i) => i.price > 0 && i.price <= budget)
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);
    if (picks.length) return `Budget picks ${filteredItems.length ? "matching your search " : ""}under AED ${budget}: ${picks.map((p) => `${p.name} (AED ${p.price})`).join(", ")}.`;

    const closest = workingSet
      .filter((i) => i.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);

    if (closest.length) {
      return `I could not find items under AED ${budget} right now. Lowest-priced options are: ${closest
        .map((p) => `${p.name} (AED ${p.price})`)
        .join(", ")}.`;
    }
  }

  if (q.includes("spicy")) {
    const picks = workingSet.filter((i) => /spicy|hot|chili|chilli|pepper|masala/i.test(`${i.name} ${i.description}`)).slice(0, 4);
    if (picks.length) return `Spicy options: ${picks.map((p) => p.name).join(", ")}.`;
  }

  if (q.includes("vegetarian") || q.includes("vegan") || q.includes("healthy")) {
    const picks = workingSet
      .filter((i) => /veg|vegan|salad|healthy|fresh/i.test(`${i.name} ${i.category} ${i.description}`))
      .slice(0, 4);
    if (picks.length) return `Try these lighter options: ${picks.map((p) => `${p.name} (AED ${p.price})`).join(", ")}.`;
  }

  if (q.includes("best") || q.includes("popular") || q.includes("recommend")) {
    const picks = workingSet
      .slice()
      .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0) || Number(a.price || 0) - Number(b.price || 0))
      .slice(0, 4);
    if (picks.length) return `Top picks ${filteredItems.length ? "for your search " : ""}right now: ${picks.map((p) => `${p.name} (AED ${p.price})`).join(", ")}.`;
  }

  const picks = workingSet.slice(0, 4);
  return `Here are a few ${filteredItems.length ? "relevant " : "popular "}options: ${picks.map((p) => `${p.name} (AED ${p.price})`).join(", ")}.`;
}

async function buildPublicContext() {
  const [restaurants, foods, reviews] = await Promise.all([
    restaurantModel
      .find({ isActive: true })
      .select("name address deliveryRadius minimumOrder avgPrepTime openingHours isActive")
      .lean(),
    foodModel
      .find({ inStock: true })
      .select("name description price category restaurantId inStock avgRating")
      .populate("restaurantId", "name isActive")
      .lean(),
    reviewModel
      .find()
      .select("restaurantId rating comment userName createdAt")
      .sort({ createdAt: -1 })
      .limit(150)
      .lean(),
  ]);

  const safeReviews = reviews.map(rv => ({
    restaurantId: rv.restaurantId,
    text: rv.comment ? (rv.comment.slice(0, 100) + (rv.comment.length > 100 ? "..." : "")) : "",
    rating: rv.rating
  }));

  const safeRestaurants = restaurants.map((r) => ({
    id: r._id,
    name: r.name,
    address: r.address,
    deliveryRadiusKm: r.deliveryRadius,
    minimumOrder: r.minimumOrder,
    avgPrepTimeMinutes: r.avgPrepTime,
    openingHours: r.openingHours,
    reviews: safeReviews.filter(rv => String(rv.restaurantId) === String(r._id)).slice(0, 5)
  }));

  const safeFoods = foods
    .filter((f) => f.restaurantId?.isActive !== false)
    .map((f) => ({
      name: f.name,
      category: f.category,
      price: f.price,
      rating: f.avgRating || 0,
      description: f.description ? f.description.slice(0, 40) : "",
      restaurant: f.restaurantId?.name || "Unknown",
    }));

  return {
    stats: {
      restaurantCount: safeRestaurants.length,
      inStockItemCount: safeFoods.length,
      categories: [...new Set(safeFoods.map((f) => f.category).filter(Boolean))].slice(0, 20),
    },
    restaurants: safeRestaurants.slice(0, 50),
    foods: safeFoods.slice(0, 150),
  };
}


async function askGroq({ question, history, context }) {
  const systemPrompt = [
    "You are Crave AI, a close friend—chill, casual, and super punchy. TALK LIKE YOU ARE TEXTING.",
    "IMPORTANT: Use very short sentences. Avoid long paragraphs at all costs.",
    "Use plenty of line breaks. Each new thought or item should be on a new line.",
    "Use slang like 'yo', 'bestie', 'legit', 'lowkey', 'fr', 'no cap'.",
    "If you mention reviews, be blunt and quick. (e.g., 'KFC is mid fr. People saying service is slow.')",
    "Stay grounded in the data. Never leak private info.",
    "Use emojis to keep it vibe-y but don't overdo it. 🍔✨",
    "If they ask for recommendations, give 3-5 items on separate lines with prices.",
    context.activeBudget ? `CRITICAL: Budget is AED ${context.activeBudget}. Stick to it.` : "Honor any budget mentions.",
    "Output plain text only. No markdown symbols like **, __, #, or code blocks.",
    "",
    `Public data context (JSON):\n${JSON.stringify(context)}`,
  ].join("\n");

  const chatHistory = (history || [])
    .slice(-20)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
    }))
    .filter((m) => m.content.trim());

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: question },
      ],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!response.ok || !text) {
    const msg = data?.error?.message || "Groq API request failed";
    console.error("GROQ API ERROR:", data?.error || data);
    throw new Error(msg);
  }

  return formatAssistantReply(text);
}

function buildScopedContext(question, fullContext, menuItems, activeBudget) {
  const qTokens = tokenize(question);
  const budget = activeBudget || 0;

  const allFoods = menuItems.length ? menuItems : fullContext.foods;
  const allRestaurants = fullContext.restaurants || [];

  const scoredFoods = allFoods
    .map((f) => {
      const restName = String(f.restaurant || "").toLowerCase();
      const name = String(f.name || "").toLowerCase();
      const cat = String(f.category || "").toLowerCase();
      const desc = String(f.description || "").toLowerCase();
      
      let score = 0;
      for (const t of qTokens) {
        if (restName.includes(t)) score += 30; // Massive boost for restaurant match
        if (name.includes(t)) score += 10;
        if (cat.includes(t)) score += 5;
        if (desc.includes(t)) score += 3;
      }
      
      // Aggressive budget scoring
      if (budget > 0) {
        if (f.price > 0 && f.price <= budget) score += 15;
        else if (f.price > budget) score -= 60; // Heavily penalize over-budget items
      }
      
      if (/recommend|best|popular|top/i.test(question)) {
        score += Number(f.rating || 0) * 2;
      }
      return { ...f, _score: score };
    })
    .sort((a, b) => b._score - a._score || (a.price || 0) - (b.price || 0));

  // If budget exists, prioritize showing ONLY compliant items in the top slice
  const scoredRestaurants = allRestaurants
    .map((r) => {
      const hay = tokenize(`${r.name} ${r.address || ""}`);
      let score = 0;
      for (const t of qTokens) if (hay.includes(t)) score += 2;
      return { ...r, _score: score };
    })
    .sort((a, b) => b._score - a._score);

  const restaurants = scoredRestaurants.slice(0, 5).map(({ _score, ...rest }) => rest);

  return {
    stats: fullContext.stats,
    restaurants,
    foods: scoredFoods.slice(0, 10).map(({ _score, ...rest }) => rest),
    activeBudget: budget > 0 ? budget : null
  };
}

router.post("/", async (req, res) => {
  try {
    const { question = "", menuContext = "", history = [] } = req.body || {};
    const q = String(question).trim();

    if (!q) return res.json({ success: false, reply: "Please type a question first." });

    const dbContext = await buildPublicContext();
    const menuItems = parseMenuContext(menuContext);
    const workingItems = menuItems.length ? menuItems : dbContext.foods;
    
    // Persistent budget detection
    const activeBudget = getMostRecentBudget(history, q);
    const scopedContext = buildScopedContext(q, dbContext, menuItems, activeBudget);

    // Strict budget guard for CURRENT query to keep it lightning fast if possible
    const currentBudget = extractBudget(q);
    if (currentBudget) {
      const budgetReply = buildStrictBudgetReply(q, workingItems);
      if (budgetReply) {
        return res.json({ success: true, reply: formatAssistantReply(budgetReply) });
      }
    }

    const mergedContext = {
      ...scopedContext,
      frontendMenuSnapshot: menuItems.slice(0, 200),
    };

    // Provider: Groq only.
    if (GROQ_KEY) {
      try {
        const reply = await askGroq({ question: q, history, context: mergedContext });
        return res.json({ success: true, reply });
      } catch (groqErr) {
        console.error("[chat][groq]", groqErr.message);
        return res.json({ success: true, reply: fallbackReply(q, workingItems) });
      }
    }

    return res.json({ success: true, reply: fallbackReply(q, workingItems) });
  } catch (e) {
    console.error("[chat]", e.message);
    const fallbackItems = parseMenuContext(req.body?.menuContext || "");
    return res.json({
      success: true,
      reply: fallbackReply(req.body?.question || "", fallbackItems),
    });
  }
});

export default router;