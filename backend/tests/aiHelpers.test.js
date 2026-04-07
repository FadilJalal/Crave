import { describe, test, expect } from "@jest/globals";
import { analyzeSentiment, getDietaryTags, estimateCalories } from "../utils/aiHelpers.js";

describe("analyzeSentiment", () => {
  test("classifies clearly positive text", () => {
    const out = analyzeSentiment("The food was very delicious and the staff was friendly.");
    expect(out.label).toBe("positive");
    expect(out.score).toBeGreaterThan(0);
    expect(out.positive).toContain("delicious");
  });

  test("handles negation for positive word", () => {
    const out = analyzeSentiment("The food was not good.");
    expect(out.label).toBe("negative");
    expect(out.negative).toContain("good");
  });

  test("returns neutral for empty text", () => {
    const out = analyzeSentiment("");
    expect(out).toEqual({ score: 0, label: "neutral", positive: [], negative: [] });
  });
});

describe("getDietaryTags", () => {
  test("detects vegan and healthy tags", () => {
    const tags = getDietaryTags("Fresh Falafel Salad", "light and fresh", "salad");
    expect(tags).toContain("vegan");
    expect(tags).toContain("healthy");
  });

  test("does not mark vegetarian when meat is present", () => {
    const tags = getDietaryTags("Chicken Pizza", "cheesy and tasty", "pizza");
    expect(tags).not.toContain("vegetarian");
  });
});

describe("estimateCalories", () => {
  test("returns category-based calorie range", () => {
    const out = estimateCalories("Chicken Burger", "juicy", "burger", 30);
    expect(out.min).toBeGreaterThanOrEqual(450);
    expect(out.max).toBeLessThanOrEqual(750);
    expect(out.label).toMatch(/kcal$/);
  });

  test("applies high-price multiplier", () => {
    const cheap = estimateCalories("Chicken Burger", "juicy", "burger", 20);
    const expensive = estimateCalories("Chicken Burger", "juicy", "burger", 60);
    expect(expensive.min).toBeGreaterThan(cheap.min);
    expect(expensive.max).toBeGreaterThan(cheap.max);
  });
});
