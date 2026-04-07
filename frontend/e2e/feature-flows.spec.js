import { test, expect } from "@playwright/test";

const API = "http://localhost:4000";

function uniqEmail(prefix = "e2e") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;
}

test.describe("feature flows", () => {
  test("frontend auth modal opens and supports tab switching", async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /sign in/i }).click();
    const modal = page.locator(".lp-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Crave." })).toBeVisible();

    await modal.getByRole("button", { name: /restaurant/i }).click();
    await expect(modal.getByRole("button", { name: /restaurant login/i })).toBeVisible();

    await modal.getByRole("button", { name: /admin/i }).click();
    await expect(modal.getByRole("button", { name: /admin login/i })).toBeVisible();

    await modal.getByRole("button", { name: /customer/i }).click();
    await expect(modal.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("invalid customer login stays on modal and does not crash", async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /sign in/i }).click();
    const modal = page.locator(".lp-modal");

    await modal.getByRole("button", { name: /customer/i }).click();
    await modal.getByRole("button", { name: /^sign in$/i }).first().click();

    await modal.locator("input[name='email']").fill(uniqEmail("nouser"));
    await modal.locator("input[name='password']").fill("WrongPass123");
    await modal.locator("#lp-agree").check();
    await modal.getByRole("button", { name: /^sign in$/i }).last().click();

    // Modal should still be open after failed auth
    await expect(modal.getByRole("button", { name: /^sign in$/i }).last()).toBeVisible();
  });

  test("customer register/login/profile API flow works", async ({ request }) => {
    const email = uniqEmail("user");
    const password = "TestPass123";

    const registerRes = await request.post(`${API}/api/user/register`, {
      data: { name: "E2E User", email, password },
    });
    expect(registerRes.ok()).toBeTruthy();
    const registerJson = await registerRes.json();
    expect(registerJson.success).toBeTruthy();
    expect(typeof registerJson.token).toBe("string");

    const loginRes = await request.post(`${API}/api/user/login`, {
      data: { email, password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    expect(loginJson.success).toBeTruthy();
    expect(typeof loginJson.token).toBe("string");

    const profileRes = await request.get(`${API}/api/user/profile`, {
      headers: { token: loginJson.token },
    });
    expect(profileRes.ok()).toBeTruthy();
    const profileJson = await profileRes.json();
    expect(profileJson.success).toBeTruthy();
    expect(profileJson.user.email).toBe(email);
  });

  test("shared delivery quote endpoint returns valid shape for authenticated user", async ({ request }) => {
    const email = uniqEmail("quote");
    const password = "TestPass123";

    const regRes = await request.post(`${API}/api/user/register`, {
      data: { name: "Quote User", email, password },
    });
    const regJson = await regRes.json();
    test.skip(!regJson?.success || !regJson?.token, "Could not create test user");

    const foodRes = await request.get(`${API}/api/food/list/public`);
    expect(foodRes.ok()).toBeTruthy();
    const foodJson = await foodRes.json();
    const firstFood = (foodJson?.data || []).find((f) => f?.restaurantId);

    test.skip(!firstFood, "No food data available to test shared quote");

    const quoteRes = await request.post(`${API}/api/order/shared-delivery/quote`, {
      headers: { token: regJson.token },
      data: {
        items: [{
          _id: firstFood._id,
          restaurantId: firstFood.restaurantId?._id || firstFood.restaurantId,
          price: Number(firstFood.price || 0),
          quantity: 1,
          name: firstFood.name || "Item",
        }],
        address: {
          firstName: "Test",
          lastName: "User",
          street: "Al Majaz",
          area: "Al Majaz",
          city: "Sharjah",
          country: "UAE",
          lat: 25.3463,
          lng: 55.4209,
        },
      },
    });

    expect(quoteRes.ok()).toBeTruthy();
    const quoteJson = await quoteRes.json();
    expect(quoteJson.success).toBeTruthy();
    expect(typeof quoteJson.data.eligible).toBe("boolean");
    expect(quoteJson.data).toHaveProperty("standardFee");
  });
});
