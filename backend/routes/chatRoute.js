import express from "express";
const router = express.Router();

// Smart keyword-based food chat — no API needed
router.post("/", async (req, res) => {
  const { question = "", menuContext = "" } = req.body;
  const q = question.toLowerCase().trim();

  // Parse menu from context string back into items
  const lines = menuContext.split("\n").filter(l => l.startsWith("- "));
  const items = lines.map(line => {
    const parts = line.slice(2).split(" | ");
    const priceMatch = parts[1]?.match(/[\d.]+/);
    return {
      name: parts[0]?.trim(),
      category: parts[1]?.trim(),
      price: priceMatch ? parseFloat(priceMatch[0]) : 0,
      description: parts[3]?.replace(/"/g, "").trim() || ""
    };
  }).filter(i => i.name);

  if (!items.length) {
    return res.json({ success: true, reply: "I'm still loading the menu — try again in a second! 🙏" });
  }

  const prices = items.map(i => i.price).filter(p => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Intent detection helpers
  const has = (...words) => words.some(w => q.includes(w));

  let matched = [];
  let reply = "";

  // --- Budget / cheap ---
  if (has("cheap", "budget", "affordable", "cheap", "low", "inexpensive", "save", "under", "less than", "below")) {
    const maxBudget = (() => {
      const m = q.match(/(\d+)/);
      return m ? parseFloat(m[1]) : avgPrice;
    })();
    matched = items.filter(i => i.price <= maxBudget).sort((a, b) => a.price - b.price).slice(0, 3);
    reply = matched.length
      ? `Here are some wallet-friendly picks under ${Math.ceil(maxBudget)}! 💰 ${matched.map(i => i.name).join(", ")} — all easy on the pocket.`
      : `Our most affordable option is ${items.sort((a,b) => a.price - b.price)[0]?.name} — great value!`;
  }

  // --- Spicy ---
  else if (has("spicy", "hot", "fiery", "chilli", "chili", "pepper", "heat")) {
    matched = items.filter(i =>
      i.name.match(/spicy|hot|chilli|chili|pepper|masala|buffalo|jalapeño|sriracha/i) ||
      i.description.match(/spicy|hot|fiery|chilli|heat/i)
    ).slice(0, 3);
    reply = matched.length
      ? `Ooh, you like it hot! 🌶️ Try ${matched.map(i => i.name).join(", ")} — these bring the heat!`
      : `We don't have anything labelled spicy right now, but try customising your order for extra chilli! 🌶️`;
  }

  // --- Healthy / light ---
  else if (has("healthy", "light", "salad", "fresh", "diet", "low cal", "veg", "vegetarian", "vegan", "green")) {
    matched = items.filter(i =>
      i.name.match(/salad|veg|healthy|light|fresh|wrap|grain|bowl/i) ||
      i.category.match(/salad|healthy|veg/i) ||
      i.description.match(/fresh|light|healthy|vegan|vegetarian/i)
    ).slice(0, 3);
    if (!matched.length) matched = items.filter(i => i.category.match(/salad|wrap|healthy/i)).slice(0, 3);
    reply = matched.length
      ? `Eating clean? Great choice! 🥗 ${matched.map(i => i.name).join(", ")} are some of our lighter options.`
      : `We're adding more healthy options soon — in the meantime our wraps and salads are a great pick! 🥗`;
  }

  // --- Quick / fast ---
  else if (has("quick", "fast", "asap", "urgent", "hurry", "hungry now", "right now")) {
    matched = items.sort(() => Math.random() - 0.5).slice(0, 3);
    reply = `Hungry NOW? We got you! ⚡ ${matched.map(i => i.name).join(", ")} are all ready to go fast.`;
  }

  // --- Premium / best / top ---
  else if (has("best", "top", "popular", "recommend", "favourite", "special", "premium", "signature")) {
    matched = items.sort((a, b) => b.price - a.price).slice(0, 3);
    reply = `Our crowd favourites and top picks! 🏆 ${matched.map(i => i.name).join(", ")} — you really can't go wrong.`;
  }

  // --- Category match ---
  else {
    const categories = [...new Set(items.map(i => i.category))];
    const matchedCat = categories.find(cat => q.includes(cat.toLowerCase()));
    if (matchedCat) {
      matched = items.filter(i => i.category === matchedCat).sort(() => Math.random() - 0.5).slice(0, 3);
      reply = `Great choice! Here's what we have in ${matchedCat} 🍽️ — ${matched.map(i => i.name).join(", ")}. All delicious!`;
    }
  }

  // --- Direct name match ---
  if (!matched.length) {
    matched = items.filter(i => q.includes(i.name.toLowerCase())).slice(0, 3);
    if (matched.length) reply = `Found it! 🎯 ${matched.map(i => `${i.name} (AED ${i.price})`).join(", ")} — great pick!`;
  }

  // --- Fallback: random picks ---
  if (!matched.length) {
    matched = items.sort(() => Math.random() - 0.5).slice(0, 3);
    const suggestions = [
      `Hmm, not sure exactly what you mean — but how about these? 😋 ${matched.map(i => i.name).join(", ")}`,
      `Let me suggest some crowd-pleasers! 🔥 ${matched.map(i => i.name).join(", ")} — always a hit.`,
      `Not 100% sure, but these are always popular: ${matched.map(i => i.name).join(", ")} 🍽️`,
    ];
    reply = suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  res.json({ success: true, reply });
});

export default router;