const { test, expect } = require("@playwright/test");

test.describe.configure({ retries: 2 });

test("loads the Odoo sign in form", async ({ page }) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto("https://www.odoo.com/web/login", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }

  await expect(page).toHaveURL(/\/web\/login/);
  await expect(page).toHaveTitle(/Odoo/i);

  const loginField = page
    .locator('input[name="login"], input[type="email"]')
    .first();
  const passwordField = page.locator('input[name="password"]').first();

  await expect(loginField).toBeVisible({ timeout: 20000 });
  await expect(passwordField).toBeVisible({ timeout: 20000 });
});
