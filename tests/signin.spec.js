const { test, expect } = require("@playwright/test");
const { setupSigninForm, setupForgotPasswordForm } = require("./fixtures");

test("loads the Odoo sign in form", async ({ page }) => {
  const { emailField, passwordField, submitButton, resultDiv } =
    await setupSigninForm(page);

  await expect(page).toHaveTitle(/Odoo/i);
  await expect(emailField).toBeVisible({ timeout: 20000 });
  await expect(passwordField).toBeVisible({ timeout: 20000 });

  await emailField.fill("user@example.com");
  await passwordField.fill("secret123");
  await submitButton.click();

  await expect(resultDiv).toHaveText("user@example.com|secret123");
});

test("rejects empty sign in submission", async ({ page }) => {
  const { emailField, passwordField, submitButton } = await setupSigninForm(
    page,
    {
      emailRequired: true,
      passwordRequired: true,
    },
  );

  await submitButton.click();

  await expect
    .poll(async () => {
      return await emailField.evaluate((el) => el.validity.valueMissing);
    })
    .toBeTruthy();

  await expect
    .poll(async () => {
      return await passwordField.evaluate((el) => el.validity.valueMissing);
    })
    .toBeTruthy();
});

test("rejects invalid email format", async ({ page }) => {
  const { emailField, submitButton } = await setupSigninForm(page, {
    email: "invalid-email",
    emailRequired: true,
    password: "secret123",
  });

  await submitButton.click();

  await expect
    .poll(async () => {
      return await emailField.evaluate((el) => el.validity.typeMismatch);
    })
    .toBeTruthy();
});

test("rejects short password on sign in", async ({ page }) => {
  const { submitButton, resultDiv } = await setupSigninForm(page, {
    email: "user@example.com",
    password: "123",
    passwordRequired: true,
  });

  await submitButton.click();

  await expect(resultDiv).toHaveText("Password must be at least 6 characters");
});

test("navigates to forgot password flow", async ({ page }) => {
  const { resetLink, resetContainer } = await setupForgotPasswordForm(page);

  await expect(resetLink).toBeVisible();
  await resetLink.click();

  await expect(resetContainer).toBeVisible();
  await expect(resetContainer).toHaveText("Reset instructions sent");
});
