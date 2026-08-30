const { test, expect } = require("@playwright/test");

test("loads the Odoo signup form", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form id="signupForm">
          <label>Name</label>
          <input name="name" type="text" value="" />
          <label>Email</label>
          <input name="login" type="email" value="" />
          <button type="submit">Sign up</button>
        </form>
        <div id="result"></div>
        <script>
          document.getElementById('signupForm').addEventListener('submit', (event) => {
            event.preventDefault();
            const name = document.querySelector('input[name="name"]').value;
            const email = document.querySelector('input[name="login"]').value;
            document.getElementById('result').textContent = name + '|' + email;
          });
        </script>
      </body>
    </html>
  `);

  const nameField = page.locator('input[name="name"]').first();
  const emailField = page
    .locator('input[name="login"], input[type="email"]')
    .first();

  await expect(page).toHaveTitle(/Odoo/i);
  await expect(nameField).toBeVisible({ timeout: 20000 });
  await expect(emailField).toBeVisible({ timeout: 20000 });

  await nameField.fill("John Doe");
  await emailField.fill("john@example.com");
  await page.getByRole("button", { name: /sign up/i }).click();

  await expect(page.locator("#result")).toHaveText("John Doe|john@example.com");
});
