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

test("rejects empty signup submission", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form id="signupForm">
          <label>Name</label>
          <input name="name" type="text" value="" required />
          <label>Email</label>
          <input name="login" type="email" value="" required />
          <button type="submit">Sign up</button>
        </form>
      </body>
    </html>
  `);

  const nameField = page.locator('input[name="name"]').first();
  const emailField = page.locator('input[name="login"]').first();

  await page.getByRole("button", { name: /sign up/i }).click();

  await expect
    .poll(async () => {
      return await nameField.evaluate((el) => el.validity.valueMissing);
    })
    .toBeTruthy();

  await expect
    .poll(async () => {
      return await emailField.evaluate((el) => el.validity.valueMissing);
    })
    .toBeTruthy();
});

test("rejects invalid email format on signup", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form id="signupForm">
          <label>Name</label>
          <input name="name" type="text" value="John Doe" required />
          <label>Email</label>
          <input name="login" type="email" value="invalid-email" required />
          <button type="submit">Sign up</button>
        </form>
      </body>
    </html>
  `);

  const emailField = page.locator('input[name="login"]').first();

  await page.getByRole("button", { name: /sign up/i }).click();

  await expect
    .poll(async () => {
      return await emailField.evaluate((el) => el.validity.typeMismatch);
    })
    .toBeTruthy();
});

test("rejects short password on signup", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <form id="signupForm">
          <label>Name</label>
          <input name="name" type="text" value="John Doe" required />
          <label>Email</label>
          <input name="login" type="email" value="john@example.com" required />
          <label>Password</label>
          <input name="password" type="password" value="123" required />
          <button type="submit">Sign up</button>
        </form>
        <div id="result"></div>
        <script>
          const form = document.getElementById('signupForm');
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            const password = document.querySelector('input[name="password"]').value;
            if (password.length < 6) {
              document.getElementById('result').textContent = 'Password must be at least 6 characters';
              return;
            }
            document.getElementById('result').textContent = 'valid';
          });
        </script>
      </body>
    </html>
  `);

  await page.getByRole("button", { name: /sign up/i }).click();

  await expect(page.locator("#result")).toHaveText(
    "Password must be at least 6 characters",
  );
});

test("navigates from signup to sign in", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Odoo</title>
      </head>
      <body>
        <div id="signupView">
          <h1>Sign up</h1>
          <a href="#signin">I already have an account</a>
        </div>
        <div id="signinView" hidden>
          <h1>Sign in</h1>
        </div>
        <script>
          document.querySelector('a[href="#signin"]').addEventListener('click', (event) => {
            event.preventDefault();
            document.getElementById('signupView').hidden = true;
            document.getElementById('signinView').hidden = false;
          });
        </script>
      </body>
    </html>
  `);

  const signInLink = page.getByRole("link", {
    name: /i already have an account/i,
  });
  await expect(signInLink).toBeVisible();

  await signInLink.click();

  await expect(page.locator("#signinView")).toBeVisible();
  await expect(page.locator("#signinView")).toHaveText(/Sign in/i);
});
