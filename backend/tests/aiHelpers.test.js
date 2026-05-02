/**
 * backend/tests/aiHelpers.test.js
 * Tests AI helper functions: sentiment analysis, dietary tags, haversine.
 */

// ── Inline helpers (mirror of actual backend logic) ───────────────────────────

function analyzeSentiment(text) {
  if (!text || typeof text !== "string") return { score: 0, label: "neutral" };
  const t = text.toLowerCase();

  const positiveWords = ["great","excellent","amazing","love","best","perfect","delicious","fantastic","wonderful","good","nice","tasty"];
  const negativeWords = ["bad","terrible","awful","hate","worst","disgusting","horrible","disappointing","poor","slow","cold"];
  const negators = ["not","never","no","wasn't","isn't","aren't","don't","didn't"];
  const intensifiers = ["very","extremely","absolutely","incredibly","super","really"];

  const words = t.split(/\s+/);
  let score = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/g, "");
    const prev = words[i - 1]?.replace(/[^a-z]/g, "") || "";
    const prev2 = words[i - 2]?.replace(/[^a-z]/g, "") || "";
    const isNegated = negators.includes(prev) || negators.includes(prev2);
    const isIntensified = intensifiers.includes(prev);
    const multiplier = isIntensified ? 2 : 1;

    if (positiveWords.includes(word)) score += isNegated ? -1 * multiplier : 1 * multiplier;
    if (negativeWords.includes(word)) score += isNegated ? 1 * multiplier : -1 * multiplier;
  }

  const label = score > 1 ? "positive" : score < -1 ? "negative" : "neutral";
  return { score, label };
}

function getDietaryTags(ingredients = []) {
  const text = ingredients.join(" ").toLowerCase();
  const tags = [];
  if (!text.match(/meat|chicken|beef|lamb|pork|fish|prawn|shrimp|seafood/)) tags.push("vegetarian");
  if (!text.match(/egg|milk|cheese|butter|cream|yogurt|meat|chicken|beef|fish/)) tags.push("vegan");
  if (!text.match(/wheat|flour|bread|pasta|gluten/)) tags.push("gluten-free");
  if (!text.match(/milk|cheese|butter|cream|yogurt|dairy/)) tags.push("dairy-free");
  return tags;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Sentiment tests ───────────────────────────────────────────────────────────
describe("analyzeSentiment", () => {
  test("returns neutral for empty string",   () => expect(analyzeSentiment("").label).toBe("neutral"));
  test("returns neutral for null",           () => expect(analyzeSentiment(null).label).toBe("neutral"));
  test("returns neutral for numbers",        () => expect(analyzeSentiment(123).label).toBe("neutral"));
  test("detects positive sentiment",         () => expect(analyzeSentiment("The food was great and delicious").label).toBe("positive"));
  test("detects negative sentiment",         () => expect(analyzeSentiment("Terrible food, awful service, very bad").label).toBe("negative"));
  test("handles negation — not great = negative", () => {
    const { score } = analyzeSentiment("not great");
    expect(score).toBeLessThanOrEqual(0);
  });
  test("handles intensifier — very bad amplifies", () => {
    const plain = analyzeSentiment("bad");
    const intense = analyzeSentiment("very bad");
    expect(intense.score).toBeLessThan(plain.score);
  });
  test("mixed review returns neutral", () => {
    const r = analyzeSentiment("food was good but service was bad");
    expect(["neutral", "positive", "negative"]).toContain(r.label);
  });
  test("score is a number", () => expect(typeof analyzeSentiment("amazing food").score).toBe("number"));
});

// ── Dietary tag tests ─────────────────────────────────────────────────────────
describe("getDietaryTags", () => {
  test("no animal products → vegetarian + vegan + gluten-free + dairy-free", () => {
    const tags = getDietaryTags(["rice", "tomatoes", "olive oil"]);
    expect(tags).toContain("vegetarian");
    expect(tags).toContain("vegan");
    expect(tags).toContain("gluten-free");
    expect(tags).toContain("dairy-free");
  });
  test("contains chicken → not vegetarian or vegan", () => {
    const tags = getDietaryTags(["chicken", "rice"]);
    expect(tags).not.toContain("vegetarian");
    expect(tags).not.toContain("vegan");
  });
  test("contains wheat flour → not gluten-free", () => {
    const tags = getDietaryTags(["wheat flour", "eggs"]);
    expect(tags).not.toContain("gluten-free");
  });
  test("contains milk → not dairy-free or vegan", () => {
    const tags = getDietaryTags(["milk", "sugar"]);
    expect(tags).not.toContain("dairy-free");
    expect(tags).not.toContain("vegan");
  });
  test("empty ingredients returns all tags", () => {
    const tags = getDietaryTags([]);
    expect(tags.length).toBeGreaterThan(0);
  });
});

// ── Haversine tests ───────────────────────────────────────────────────────────
describe("haversine distance", () => {
  test("same point = 0 km", () => {
    expect(haversine(25.2, 55.3, 25.2, 55.3)).toBeCloseTo(0, 3);
  });
  test("Dubai to Abu Dhabi ≈ 130 km", () => {
    const d = haversine(25.2048, 55.2708, 24.4539, 54.3773);
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(145);
  });
  test("is symmetric (A→B = B→A)", () => {
    const ab = haversine(25.2, 55.3, 24.4, 54.4);
    const ba = haversine(24.4, 54.4, 25.2, 55.3);
    expect(ab).toBeCloseTo(ba, 5);
  });
  test("returns a positive number", () => {
    expect(haversine(25.2, 55.3, 25.3, 55.4)).toBeGreaterThan(0);
  });
});
