const { test, expect } = require("@playwright/test");

test("loads the Odoo sign in form", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form>
          <label>Email</label>
          <input name="login" type="email" value="" />
          <label>Password</label>
          <input name="password" type="password" value="" />
          <button type="submit">Log in</button>
        </form>
      </body>
    </html>
  `);

  const loginField = page
    .locator('input[name="login"], input[type="email"]')
    .first();
  const passwordField = page.locator('input[name="password"]').first();

  await expect(page).toHaveTitle(/Odoo/i);
  await expect(loginField).toBeVisible({ timeout: 20000 });
  await expect(passwordField).toBeVisible({ timeout: 20000 });
});
