const { test, expect } = require("@playwright/test");
const { setupAccountDetailsForm } = require("./fixtures");

test("loads the account details form", async ({ page }) => {
  const { nameField, emailField, phoneField, submitButton } =
    await setupAccountDetailsForm(page);

  await expect(page).toHaveTitle(/Account Details/i);
  await expect(nameField).toBeVisible({ timeout: 20000 });
  await expect(emailField).toBeVisible({ timeout: 20000 });
  await expect(phoneField).toBeVisible({ timeout: 20000 });
  await expect(submitButton).toBeVisible();
});

test("fills out and submits account details", async ({ page }) => {
  const { nameField, emailField, phoneField, submitButton, resultDiv } =
    await setupAccountDetailsForm(page);

  await nameField.fill("Biloliddin");
  await emailField.fill("abdurasulovbiloliddin98@gmail.com");
  await phoneField.fill("+1234567890");

  await submitButton.click();

  await expect(resultDiv).toBeVisible();
  await expect(resultDiv).toHaveText(/Account details saved/i);
  await expect(resultDiv).toContainText("Biloliddin");
  await expect(resultDiv).toContainText("abdurasulovbiloliddin98@gmail.com");
  await expect(resultDiv).toContainText("+1234567890");
});

test("rejects empty account details submission", async ({ page }) => {
  const { nameField, emailField, phoneField, submitButton } =
    await setupAccountDetailsForm(page);

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

  await expect
    .poll(async () => {
      return await phoneField.evaluate((el) => el.validity.valueMissing);
    })
    .toBeTruthy();
});

test("rejects invalid email in account details", async ({ page }) => {
  const { nameField, emailField, phoneField, submitButton } =
    await setupAccountDetailsForm(page, {
      name: "John Doe",
      email: "invalid-email",
      phone: "+1234567890",
    });

  await submitButton.click();

  await expect
    .poll(async () => {
      return await emailField.evaluate((el) => el.validity.typeMismatch);
    })
    .toBeTruthy();
});

test("updates account details with pre-filled values", async ({ page }) => {
  const { nameField, emailField, phoneField, submitButton, resultDiv } =
    await setupAccountDetailsForm(page, {
      name: "Biloliddin",
      email: "abdurasulovbiloliddin98@gmail.com",
      phone: "+1234567890",
    });

  // Verify pre-filled values
  await expect(nameField).toHaveValue("Biloliddin");
  await expect(emailField).toHaveValue("abdurasulovbiloliddin98@gmail.com");
  await expect(phoneField).toHaveValue("+1234567890");

  // Update phone number
  await phoneField.clear();
  await phoneField.fill("+9876543210");

  await submitButton.click();

  await expect(resultDiv).toHaveText(/Account details saved/i);
  await expect(resultDiv).toContainText("+9876543210");
});

test("account details form fields are properly labeled", async ({ page }) => {
  await setupAccountDetailsForm(page);

  const nameLabel = page.getByText("Your name *");
  const emailLabel = page.getByText("Email *");
  const phoneLabel = page.getByText("Phone *");

  await expect(nameLabel).toBeVisible();
  await expect(emailLabel).toBeVisible();
  await expect(phoneLabel).toBeVisible();
});
