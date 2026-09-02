const { test, expect } = require("@playwright/test");

async function setupCustomersContactsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Customers and Contacts | Odoo</title></head>
      <body>
        <h1>Customers and Contacts</h1>
        <form id="contactForm">
          <label for="name">Contact name *</label>
          <input id="name" name="name" type="text" value="${options.name || ""}" required />
          <label for="email">Email</label>
          <input id="email" name="email" type="email" value="${options.email || ""}" />
          <label for="phone">Phone</label>
          <input id="phone" name="phone" type="tel" value="${options.phone || ""}" />
          <label for="company">Company</label>
          <input id="company" name="company" type="text" value="${options.company || ""}" />
          <button type="submit">Save contact</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("contactForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["name", "email", "phone", "company"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            document.getElementById("result").textContent = "Contact saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    nameField: page.locator("#name"),
    emailField: page.locator("#email"),
    phoneField: page.locator("#phone"),
    companyField: page.locator("#company"),
    submitButton: page.getByRole("button", { name: /save contact/i }),
    result: page.locator("#result"),
  };
}

test("loads the customers and contacts form", async ({ page }) => {
  const { nameField, emailField, phoneField, companyField, submitButton } =
    await setupCustomersContactsPage(page);

  await expect(page).toHaveTitle(/Customers and Contacts/i);
  await expect(nameField).toBeVisible();
  await expect(emailField).toBeVisible();
  await expect(phoneField).toBeVisible();
  await expect(companyField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a customer contact", async ({ page }) => {
  const {
    nameField,
    emailField,
    phoneField,
    companyField,
    submitButton,
    result,
  } = await setupCustomersContactsPage(page);

  await nameField.fill("Jane Smith");
  await emailField.fill("jane.smith@example.com");
  await phoneField.fill("+1234567890");
  await companyField.fill("Acme Corporation");
  await submitButton.click();

  await expect(result).toHaveText(
    "Contact saved: Jane Smith | jane.smith@example.com | +1234567890 | Acme Corporation",
  );
});

test("requires a customer contact name", async ({ page }) => {
  const { nameField, submitButton } = await setupCustomersContactsPage(page, {
    email: "jane.smith@example.com",
  });

  await submitButton.click();

  await expect
    .poll(async () =>
      nameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects an invalid customer email", async ({ page }) => {
  const { nameField, emailField, submitButton } =
    await setupCustomersContactsPage(page, {
      name: "Jane Smith",
      email: "invalid-email",
    });

  await nameField.fill("Jane Smith");
  await submitButton.click();

  await expect
    .poll(async () =>
      emailField.evaluate((element) => element.validity.typeMismatch),
    )
    .toBeTruthy();
});

test("updates an existing customer contact", async ({ page }) => {
  const {
    nameField,
    emailField,
    phoneField,
    companyField,
    submitButton,
    result,
  } = await setupCustomersContactsPage(page, {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "+1234567890",
    company: "Acme Corporation",
  });

  await expect(nameField).toHaveValue("Jane Smith");
  await expect(companyField).toHaveValue("Acme Corporation");

  await phoneField.fill("+19876543210");
  await companyField.fill("Acme International");
  await submitButton.click();

  await expect(result).toContainText("+19876543210");
  await expect(result).toContainText("Acme International");
});
