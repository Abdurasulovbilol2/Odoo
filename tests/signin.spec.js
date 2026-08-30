const { test, expect } = require("@playwright/test");

test("loads the Odoo sign in form", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form id="loginForm">
          <label>Email</label>
          <input name="login" type="email" value="" />
          <label>Password</label>
          <input name="password" type="password" value="" />
          <button type="submit">Log in</button>
        </form>
        <div id="result"></div>
        <script>
          document.getElementById('loginForm').addEventListener('submit', (event) => {
            event.preventDefault();
            const login = document.querySelector('input[name="login"]').value;
            const password = document.querySelector('input[name="password"]').value;
            document.getElementById('result').textContent = login + '|' + password;
          });
        </script>
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

  await loginField.fill("user@example.com");
  await passwordField.fill("secret123");
  await page.getByRole("button", { name: /log in/i }).click();

  await expect(page.locator("#result")).toHaveText(
    "user@example.com|secret123",
  );
});

test("rejects empty sign in submission", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form id="loginForm">
          <label>Email</label>
          <input name="login" type="email" value="" required />
          <label>Password</label>
          <input name="password" type="password" value="" required />
          <button type="submit">Log in</button>
        </form>
      </body>
    </html>
  `);

  const loginField = page.locator('input[name="login"]').first();
  const passwordField = page.locator('input[name="password"]').first();

  await page.getByRole("button", { name: /log in/i }).click();

  await expect
    .poll(async () => {
      return await loginField.evaluate((el) => el.validity.valueMissing);
    })
    .toBeTruthy();

  await expect
    .poll(async () => {
      return await passwordField.evaluate((el) => el.validity.valueMissing);
    })
    .toBeTruthy();
});

test("rejects invalid email format", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form id="loginForm">
          <label>Email</label>
          <input name="login" type="email" value="invalid-email" required />
          <label>Password</label>
          <input name="password" type="password" value="secret123" required />
          <button type="submit">Log in</button>
        </form>
      </body>
    </html>
  `);

  const loginField = page.locator('input[name="login"]').first();

  await page.getByRole("button", { name: /log in/i }).click();

  await expect
    .poll(async () => {
      return await loginField.evaluate((el) => el.validity.typeMismatch);
    })
    .toBeTruthy();
});
