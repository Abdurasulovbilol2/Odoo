const { test, expect } = require("@playwright/test");

async function setupSubscriptionsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Subscriptions | Odoo</title>
      </head>
      <body>
        <h1>Subscriptions</h1>
        <form id="subscriptionForm">
          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${options.customer || ""}" required />

          <label for="plan">Subscription plan *</label>
          <input id="plan" name="plan" type="text" value="${options.plan || ""}" required />

          <label for="interval">Recurring interval *</label>
          <select id="interval" name="interval" required>
            <option value="">Select interval</option>
            <option value="Monthly" ${options.interval === "Monthly" ? "selected" : ""}>Monthly</option>
            <option value="Quarterly" ${options.interval === "Quarterly" ? "selected" : ""}>Quarterly</option>
            <option value="Yearly" ${options.interval === "Yearly" ? "selected" : ""}>Yearly</option>
          </select>

          <label for="startDate">Start date *</label>
          <input id="startDate" name="startDate" type="date" value="${options.startDate || ""}" required />

          <label for="amount">Recurring amount *</label>
          <input id="amount" name="amount" type="number" min="0.01" step="0.01" value="${options.amount || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Quotation" ${options.status === "Quotation" ? "selected" : ""}>Quotation</option>
            <option value="In progress" ${options.status === "In progress" ? "selected" : ""}>In progress</option>
            <option value="Active" ${options.status === "Active" ? "selected" : ""}>Active</option>
            <option value="Cancelled" ${options.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>

          <button type="submit">Save subscription</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("subscriptionForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("customer").value,
              document.getElementById("plan").value,
              document.getElementById("interval").value,
              document.getElementById("startDate").value,
              document.getElementById("amount").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Subscription saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customer"),
    planField: page.locator("#plan"),
    intervalField: page.locator("#interval"),
    startDateField: page.locator("#startDate"),
    amountField: page.locator("#amount"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save subscription/i }),
    result: page.locator("#result"),
  };
}

test("loads the subscriptions form", async ({ page }) => {
  const {
    customerField,
    planField,
    intervalField,
    startDateField,
    amountField,
    statusField,
    submitButton,
  } = await setupSubscriptionsPage(page);

  await expect(page).toHaveTitle(/Subscriptions/i);
  await expect(customerField).toBeVisible();
  await expect(planField).toBeVisible();
  await expect(intervalField).toBeVisible();
  await expect(startDateField).toBeVisible();
  await expect(amountField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves an active monthly subscription", async ({ page }) => {
  const {
    customerField,
    planField,
    intervalField,
    startDateField,
    amountField,
    statusField,
    submitButton,
    result,
  } = await setupSubscriptionsPage(page);

  await customerField.fill("Acme Corporation");
  await planField.fill("Premium support");
  await intervalField.selectOption("Monthly");
  await startDateField.fill("2026-09-09");
  await amountField.fill("199.99");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Subscription saved: Acme Corporation | Premium support | Monthly | 2026-09-09 | 199.99 | Active",
  );
});

test("requires subscription details before saving", async ({ page }) => {
  const {
    customerField,
    planField,
    intervalField,
    startDateField,
    amountField,
    statusField,
    submitButton,
  } = await setupSubscriptionsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      planField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      intervalField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      startDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      amountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero recurring subscription amount", async ({ page }) => {
  const { amountField } = await setupSubscriptionsPage(page);

  await amountField.fill("0");
  await expect(amountField).toHaveJSProperty("validity.valid", false);
  await expect(amountField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a cancelled yearly subscription", async ({ page }) => {
  const {
    customerField,
    planField,
    intervalField,
    startDateField,
    amountField,
    statusField,
    submitButton,
    result,
  } = await setupSubscriptionsPage(page, {
    customer: "Northwind Traders",
    plan: "Enterprise license",
    interval: "Yearly",
    startDate: "2026-01-01",
    amount: "2400.00",
    status: "Cancelled",
  });

  await expect(customerField).toHaveValue("Northwind Traders");
  await expect(planField).toHaveValue("Enterprise license");
  await expect(intervalField).toHaveValue("Yearly");
  await expect(startDateField).toHaveValue("2026-01-01");
  await expect(amountField).toHaveValue("2400.00");
  await expect(statusField).toHaveValue("Cancelled");
  await submitButton.click();

  await expect(result).toContainText("Northwind Traders");
  await expect(result).toContainText("Enterprise license");
  await expect(result).toContainText("Cancelled");
});
