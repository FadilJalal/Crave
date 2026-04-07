import { test, expect } from "@playwright/test";

const targets = [
  { name: "customer frontend", url: "http://localhost:5173" },
  { name: "restaurant admin", url: "http://localhost:5174" },
  { name: "super admin", url: "http://localhost:5175" },
];

test.describe("platform smoke checks", () => {
  for (const target of targets) {
    test(`${target.name} is reachable`, async ({ page }) => {
      const response = await page.goto(target.url, { waitUntil: "domcontentloaded" });
      expect(response).not.toBeNull();
      expect(response.ok()).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await expect(page).toHaveTitle(/.+/);
    });
  }

  test("backend API health is reachable", async ({ request }) => {
    const response = await request.get("http://localhost:4000/");
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.success).toBeTruthy();
  });
});
