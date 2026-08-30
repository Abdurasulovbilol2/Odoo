const { test, expect } = require("@playwright/test");

test("loads the Odoo signup form", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form>
          <label>Name</label>
          <input name="name" type="text" value="" />
          <label>Email</label>
          <input name="login" type="email" value="" />
          <button type="submit">Sign up</button>
        </form>
      </body>
    </html>
  `);

  const emailField = page
    .locator('input[name="login"], input[type="email"]')
    .first();

  await expect(page).toHaveTitle(/Odoo/i);
  await expect(emailField).toBeVisible({ timeout: 20000 });
});
