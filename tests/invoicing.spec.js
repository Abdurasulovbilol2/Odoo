const { test, expect } = require("@playwright/test");

async function setupInvoicingPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Invoicing | Odoo</title></head>
      <body>
        <h1>Customer Invoices</h1>
        <form id="invoiceForm">
          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${options.customer || ""}" required />
          <label for="invoiceDate">Invoice date *</label>
          <input id="invoiceDate" name="invoiceDate" type="date" value="${options.invoiceDate || ""}" required />
          <label for="amount">Total amount *</label>
          <input id="amount" name="amount" type="number" min="0.01" step="0.01" value="${options.amount || ""}" required />
          <label for="status">Payment status *</label>
          <select id="status" name="status" required>
            <option value="">Select a status</option>
            <option value="draft" ${options.status === "draft" ? "selected" : ""}>Draft</option>
            <option value="posted" ${options.status === "posted" ? "selected" : ""}>Posted</option>
            <option value="paid" ${options.status === "paid" ? "selected" : ""}>Paid</option>
          </select>
          <button type="submit">Save invoice</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("invoiceForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["customer", "invoiceDate", "amount", "status"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            document.getElementById("result").textContent = "Invoice saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customer"),
    invoiceDateField: page.locator("#invoiceDate"),
    amountField: page.locator("#amount"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save invoice/i }),
    result: page.locator("#result"),
  };
}

test("loads the customer invoicing form", async ({ page }) => {
  const {
    customerField,
    invoiceDateField,
    amountField,
    statusField,
    submitButton,
  } = await setupInvoicingPage(page);

  await expect(page).toHaveTitle(/Invoicing/i);
  await expect(customerField).toBeVisible();
  await expect(invoiceDateField).toBeVisible();
  await expect(amountField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a posted customer invoice", async ({ page }) => {
  const {
    customerField,
    invoiceDateField,
    amountField,
    statusField,
    submitButton,
    result,
  } = await setupInvoicingPage(page);

  await customerField.fill("Acme Corporation");
  await invoiceDateField.fill("2026-09-02");
  await amountField.fill("1250.50");
  await statusField.selectOption("posted");
  await submitButton.click();

  await expect(result).toHaveText(
    "Invoice saved: Acme Corporation | 2026-09-02 | 1250.50 | posted",
  );
});

test("requires customer, date, amount, and payment status", async ({
  page,
}) => {
  const {
    customerField,
    invoiceDateField,
    amountField,
    statusField,
    submitButton,
  } = await setupInvoicingPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      invoiceDateField.evaluate((element) => element.validity.valueMissing),
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

test("rejects an invoice amount below one cent", async ({ page }) => {
  const {
    customerField,
    invoiceDateField,
    amountField,
    statusField,
    submitButton,
  } = await setupInvoicingPage(page, {
    customer: "Acme Corporation",
    invoiceDate: "2026-09-02",
    amount: "0",
    status: "draft",
  });

  await customerField.fill("Acme Corporation");
  await invoiceDateField.fill("2026-09-02");
  await statusField.selectOption("draft");
  await submitButton.click();

  await expect
    .poll(async () =>
      amountField.evaluate((element) => element.validity.rangeUnderflow),
    )
    .toBeTruthy();
});

test("marks an existing invoice as paid", async ({ page }) => {
  const {
    customerField,
    invoiceDateField,
    amountField,
    statusField,
    submitButton,
    result,
  } = await setupInvoicingPage(page, {
    customer: "Acme Corporation",
    invoiceDate: "2026-09-02",
    amount: "1250.50",
    status: "posted",
  });

  await expect(statusField).toHaveValue("posted");
  await statusField.selectOption("paid");
  await submitButton.click();

  await expect(result).toContainText("Acme Corporation");
  await expect(result).toContainText("1250.50");
  await expect(result).toContainText("paid");
});
