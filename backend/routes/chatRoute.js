import express from "express";
import foodModel from "../models/foodModel.js";
import restaurantModel from "../models/restaurantModel.js";
const router = express.Router();

const GOOGLE_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GOOGLE_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_KEY = process.env.GROQ_API_KEY;

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
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
  const numbered = compact.replace(/\s([1-9]\.)\s/g, "\n$1 ");

  // Keep paragraphs compact in chat bubble.
  return numbered
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

  // Natural chat handling for greetings and small talk.
  if (/^(hi|hey|hello|yo|hola|salam|assalam|good morning|good evening)\b/.test(q)) {
    return "Hey! I can help you find food by budget, taste, category, or restaurant. Try: spicy under AED 30, best burgers, or vegetarian options.";
  }
  if (/\b(how are you|what can you do|help|who are you)\b/.test(q)) {
    return "I am Crave AI. Ask me about menu items, prices, restaurant info, delivery limits, or recommendations based on your budget and taste.";
  }

  if (q.includes("cheap") || q.includes("budget") || q.includes("under")) {
    const budget = Number(q.match(/(\d+)/)?.[1] || 40);
    const picks = items
      .filter((i) => i.price > 0 && i.price <= budget)
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);
    if (picks.length) return `Budget picks under AED ${budget}: ${picks.map((p) => `${p.name} (AED ${p.price})`).join(", ")}.`;

    const closest = items
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
    const picks = items.filter((i) => /spicy|hot|chili|chilli|pepper|masala/i.test(`${i.name} ${i.description}`)).slice(0, 4);
    if (picks.length) return `Spicy options: ${picks.map((p) => p.name).join(", ")}.`;
  }

  if (q.includes("vegetarian") || q.includes("vegan") || q.includes("healthy")) {
    const picks = items
      .filter((i) => /veg|vegan|salad|healthy|fresh/i.test(`${i.name} ${i.category} ${i.description}`))
      .slice(0, 4);
    if (picks.length) return `Try these lighter options: ${picks.map((p) => `${p.name} (AED ${p.price})`).join(", ")}.`;
  }

  if (q.includes("best") || q.includes("popular") || q.includes("recommend")) {
    const picks = items
      .slice()
      .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0) || Number(a.price || 0) - Number(b.price || 0))
      .slice(0, 4);
    if (picks.length) return `Top picks right now: ${picks.map((p) => `${p.name} (AED ${p.price})`).join(", ")}.`;
  }

  const picks = items.slice(0, 4);
  return `Here are a few popular options: ${picks.map((p) => `${p.name} (AED ${p.price})`).join(", ")}.`;
}

async function buildPublicContext() {
  const [restaurants, foods] = await Promise.all([
    restaurantModel
      .find({ isActive: true })
      .select("name address deliveryRadius minimumOrder avgPrepTime openingHours isActive")
      .lean(),
    foodModel
      .find({ inStock: true })
      .select("name description price category restaurantId inStock avgRating")
      .populate("restaurantId", "name isActive")
      .lean(),
  ]);

  const safeRestaurants = restaurants.map((r) => ({
    name: r.name,
    address: r.address,
    deliveryRadiusKm: r.deliveryRadius,
    minimumOrder: r.minimumOrder,
    avgPrepTimeMinutes: r.avgPrepTime,
    openingHours: r.openingHours,
  }));

  const safeFoods = foods
    .filter((f) => f.restaurantId?.isActive !== false)
    .map((f) => ({
      name: f.name,
      category: f.category,
      price: f.price,
      rating: f.avgRating || 0,
      description: f.description,
      restaurant: f.restaurantId?.name || "Unknown",
      inStock: f.inStock !== false,
    }));

  return {
    stats: {
      restaurantCount: safeRestaurants.length,
      inStockItemCount: safeFoods.length,
      categories: [...new Set(safeFoods.map((f) => f.category).filter(Boolean))].slice(0, 30),
    },
    restaurants: safeRestaurants.slice(0, 120),
    foods: safeFoods.slice(0, 400),
  };
}

async function askGemini({ question, history, context }) {
  const historyText = (history || [])
    .slice(-20)
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${String(m.content || "")}`)
    .join("\n");

  const prompt = [
    "You are Crave AI, a conversational customer assistant for food ordering.",
    "Chat naturally like Gemini/ChatGPT, but stay grounded in provided data.",
    "Use ONLY the provided PUBLIC context data.",
    "Never mention or infer private data such as passwords, tokens, emails, phone numbers, payment details, internal IDs.",
    "If answer is not in context, clearly say you do not have that info and suggest next best action.",
    "Keep responses concise, friendly, practical, and personalized to the user request.",
    "If user asks for recommendations, return 3-6 relevant items with prices.",
    "If user gives a budget (under AED X), strictly honor it. If none match, say so and provide closest alternatives.",
    "If user asks follow-up questions, use conversation history to maintain context.",
    "Include AED prices where relevant.",
    "Use short, clean responses with line breaks; avoid long dense paragraphs.",
    "For recommendations, prefer 3-5 bullet points or numbered lines.",
    "Avoid repeating the same sentence or item names unnecessarily.",
    "Output plain text only. Do not use markdown symbols like **, __, #, or code blocks.",
    "",
    `Conversation history:\n${historyText || "(no history)"}`,
    "",
    `User question: ${question}`,
    "",
    `Public data context (JSON):\n${JSON.stringify(context)}`,
  ].join("\n");

  const modelPath = GOOGLE_MODEL.startsWith("models/") ? GOOGLE_MODEL : `models/${GOOGLE_MODEL}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${GOOGLE_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 400,
      },
    }),
  });

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n")?.trim();
  if (!response.ok || !text) {
    const msg = data?.error?.message || "Gemini API request failed";
    throw new Error(msg);
  }

  return formatAssistantReply(text);
}

async function askGroq({ question, history, context }) {
  const systemPrompt = [
    "You are Crave AI, a conversational customer assistant for food ordering.",
    "Chat naturally like Gemini/ChatGPT, but stay grounded in provided data.",
    "Use ONLY the provided PUBLIC context data.",
    "Never mention or infer private data such as passwords, tokens, emails, phone numbers, payment details, internal IDs.",
    "If answer is not in context, clearly say you do not have that info and suggest next best action.",
    "Keep responses concise, friendly, practical, and personalized to the user request.",
    "If user asks for recommendations, return 3-6 relevant items with prices.",
    "If user gives a budget (under AED X), strictly honor it. If none match, say so and provide closest alternatives.",
    "If user asks follow-up questions, use conversation history to maintain context.",
    "Include AED prices where relevant.",
    "Use short, clean responses with line breaks; avoid long dense paragraphs.",
    "For recommendations, prefer 3-5 bullet points or numbered lines.",
    "Avoid repeating the same sentence or item names unnecessarily.",
    "Output plain text only. Do not use markdown symbols like **, __, #, or code blocks.",
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
    throw new Error(msg);
  }

  return formatAssistantReply(text);
}

function buildScopedContext(question, fullContext, menuItems) {
  const qTokens = tokenize(question);
  const hasBudget = /under\s*aed\s*\d+|under\s*\d+|below\s*\d+|less than\s*\d+/i.test(question);
  const budget = Number(question.match(/(\d+)/)?.[1] || 0);

  const allFoods = menuItems.length ? menuItems : fullContext.foods;
  const allRestaurants = fullContext.restaurants || [];

  const scoredFoods = allFoods
    .map((f) => {
      const hay = tokenize(`${f.name} ${f.category} ${f.description || ""} ${f.restaurant || ""}`);
      let score = 0;
      for (const t of qTokens) if (hay.includes(t)) score += 2;
      if (hasBudget && budget > 0 && f.price > 0 && f.price <= budget) score += 5;
      if (/recommend|best|popular|top/i.test(question)) score += Number(f.rating || 0);
      return { ...f, _score: score };
    })
    .sort((a, b) => b._score - a._score || (a.price || 0) - (b.price || 0));

  const foods = scoredFoods.slice(0, 120).map(({ _score, ...rest }) => rest);

  const scoredRestaurants = allRestaurants
    .map((r) => {
      const hay = tokenize(`${r.name} ${r.address || ""}`);
      let score = 0;
      for (const t of qTokens) if (hay.includes(t)) score += 2;
      return { ...r, _score: score };
    })
    .sort((a, b) => b._score - a._score);

  const restaurants = scoredRestaurants.slice(0, 60).map(({ _score, ...rest }) => rest);

  return {
    stats: fullContext.stats,
    restaurants,
    foods,
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
    const scopedContext = buildScopedContext(q, dbContext, menuItems);

    const mergedContext = {
      ...scopedContext,
      frontendMenuSnapshot: menuItems.slice(0, 200),
    };

    // Provider order: Groq (if available) -> Gemini -> deterministic fallback.
    if (GROQ_KEY) {
      try {
        const reply = await askGroq({ question: q, history, context: mergedContext });
        return res.json({ success: true, reply });
      } catch (groqErr) {
        console.error("[chat][groq]", groqErr.message);
      }
    }

    if (GOOGLE_KEY) {
      try {
        const reply = await askGemini({ question: q, history, context: mergedContext });
        return res.json({ success: true, reply });
      } catch (geminiErr) {
        console.error("[chat][gemini]", geminiErr.message);
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