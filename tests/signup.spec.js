const { test, expect } = require("@playwright/test");
const { setupSignupForm, setupNavigationForm } = require("./fixtures");

test("loads the Odoo signup form", async ({ page }) => {
  const { nameField, emailField, submitButton, resultDiv } =
    await setupSignupForm(page);

  await expect(page).toHaveTitle(/Odoo/i);
  await expect(nameField).toBeVisible({ timeout: 20000 });
  await expect(emailField).toBeVisible({ timeout: 20000 });

  await nameField.fill("John Doe");
  await emailField.fill("john@example.com");
  await submitButton.click();

  await expect(resultDiv).toHaveText("John Doe|john@example.com");
});

test("rejects empty signup submission", async ({ page }) => {
  const { nameField, emailField, submitButton } = await setupSignupForm(page, {
    nameRequired: true,
    emailRequired: true,
  });

  await submitButton.click();

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
  const { emailField, submitButton } = await setupSignupForm(page, {
    name: "John Doe",
    email: "invalid-email",
    emailRequired: true,
  });

  await submitButton.click();

  await expect
    .poll(async () => {
      return await emailField.evaluate((el) => el.validity.typeMismatch);
    })
    .toBeTruthy();
});

test("rejects short password on signup", async ({ page }) => {
  const { submitButton, resultDiv } = await setupSignupForm(page, {
    name: "John Doe",
    email: "john@example.com",
    password: "123",
    includePassword: true,
    passwordRequired: true,
  });

  await submitButton.click();

  await expect(resultDiv).toHaveText("Password must be at least 6 characters");
});

test("navigates from signup to sign in", async ({ page }) => {
  const { signupView, signinView, signInLink } =
    await setupNavigationForm(page);

  await expect(signInLink).toBeVisible();
  await signInLink.click();

  await expect(signinView).toBeVisible();
  await expect(signinView).toHaveText(/Sign in/i);
});
