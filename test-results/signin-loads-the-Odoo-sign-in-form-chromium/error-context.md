# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: signin.spec.js >> loads the Odoo sign in form
- Location: tests\signin.spec.js:5:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "https://www.odoo.com/web/login", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | const { test, expect } = require("@playwright/test");
  2  | 
  3  | test.describe.configure({ retries: 2 });
  4  | 
  5  | test("loads the Odoo sign in form", async ({ page }) => {
  6  |   for (let attempt = 1; attempt <= 3; attempt++) {
  7  |     try {
> 8  |       await page.goto("https://www.odoo.com/web/login", {
     |                  ^ Error: page.goto: Test timeout of 30000ms exceeded.
  9  |         waitUntil: "domcontentloaded",
  10 |         timeout: 60000,
  11 |       });
  12 |       break;
  13 |     } catch (error) {
  14 |       if (attempt === 3) throw error;
  15 |     }
  16 |   }
  17 | 
  18 |   await expect(page).toHaveURL(/\/web\/login/);
  19 |   await expect(page).toHaveTitle(/Odoo/i);
  20 | 
  21 |   const loginField = page
  22 |     .locator('input[name="login"], input[type="email"]')
  23 |     .first();
  24 |   const passwordField = page.locator('input[name="password"]').first();
  25 | 
  26 |   await expect(loginField).toBeVisible({ timeout: 20000 });
  27 |   await expect(passwordField).toBeVisible({ timeout: 20000 });
  28 | });
  29 | 
```