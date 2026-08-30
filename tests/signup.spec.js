const { test, expect } = require("@playwright/test");

test.describe.configure({ retries: 2 });

test("loads the Odoo signup form", async ({ page }) => {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto("https://www.odoo.com/web/signup", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 3) throw error;
    }
  }

  await expect(page).toHaveURL(/\/web\/signup/);
  await expect(page).toHaveTitle(/Odoo/i);

  const emailField = page
    .locator('input[name="login"], input[type="email"]')
    .first();
  await expect(emailField).toBeVisible({ timeout: 20000 });
});
