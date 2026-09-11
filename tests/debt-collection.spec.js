const { test, expect } = require("@playwright/test");

async function setupDebtCollectionPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Debt Collection | Odoo</title>
      </head>
      <body>
        <h1>Debt Collection</h1>
        <form id="debtForm">
          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${options.customer || ""}" required />

          <label for="invoice">Invoice reference *</label>
          <input id="invoice" name="invoice" type="text" value="${options.invoice || ""}" required />

          <label for="amount">Outstanding amount *</label>
          <input id="amount" name="amount" type="number" min="0.01" step="0.01" value="${options.amount || ""}" required />

          <label for="dueDate">Due date *</label>
          <input id="dueDate" name="dueDate" type="date" value="${options.dueDate || ""}" required />

          <label for="collector">Collector *</label>
          <input id="collector" name="collector" type="text" value="${options.collector || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Follow up" ${options.status === "Follow up" ? "selected" : ""}>Follow up</option>
            <option value="In negotiation" ${options.status === "In negotiation" ? "selected" : ""}>In negotiation</option>
            <option value="Paid" ${options.status === "Paid" ? "selected" : ""}>Paid</option>
            <option value="Closed" ${options.status === "Closed" ? "selected" : ""}>Closed</option>
          </select>

          <button type="submit">Save collection case</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("debtForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("customer").value,
              document.getElementById("invoice").value,
              document.getElementById("amount").value,
              document.getElementById("dueDate").value,
              document.getElementById("collector").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Collection saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customer"),
    invoiceField: page.locator("#invoice"),
    amountField: page.locator("#amount"),
    dueDateField: page.locator("#dueDate"),
    collectorField: page.locator("#collector"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save collection case/i }),
    result: page.locator("#result"),
  };
}

test("loads the debt collection form", async ({ page }) => {
  const {
    customerField,
    invoiceField,
    amountField,
    dueDateField,
    collectorField,
    statusField,
    submitButton,
  } = await setupDebtCollectionPage(page);

  await expect(page).toHaveTitle(/Debt Collection/i);
  await expect(customerField).toBeVisible();
  await expect(invoiceField).toBeVisible();
  await expect(amountField).toBeVisible();
  await expect(dueDateField).toBeVisible();
  await expect(collectorField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a follow-up debt case", async ({ page }) => {
  const {
    customerField,
    invoiceField,
    amountField,
    dueDateField,
    collectorField,
    statusField,
    submitButton,
    result,
  } = await setupDebtCollectionPage(page);

  await customerField.fill("Northwind Traders");
  await invoiceField.fill("INV-1042");
  await amountField.fill("6200.00");
  await dueDateField.fill("2026-09-15");
  await collectorField.fill("Finance follow-up");
  await statusField.selectOption("Follow up");
  await submitButton.click();

  await expect(result).toHaveText(
    "Collection saved: Northwind Traders | INV-1042 | 6200.00 | 2026-09-15 | Finance follow-up | Follow up",
  );
});

test("requires collection details before saving", async ({ page }) => {
  const {
    customerField,
    invoiceField,
    amountField,
    dueDateField,
    collectorField,
    statusField,
    submitButton,
  } = await setupDebtCollectionPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      invoiceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      amountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      dueDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      collectorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero debt amount", async ({ page }) => {
  const { amountField } = await setupDebtCollectionPage(page);

  await amountField.fill("0");
  await expect(amountField).toHaveJSProperty("validity.valid", false);
  await expect(amountField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a pre-filled paid debt case", async ({ page }) => {
  const {
    customerField,
    invoiceField,
    amountField,
    dueDateField,
    collectorField,
    statusField,
    submitButton,
    result,
  } = await setupDebtCollectionPage(page, {
    customer: "Acme Corporation",
    invoice: "INV-2001",
    amount: "1500.75",
    dueDate: "2026-08-30",
    collector: "Collections desk",
    status: "Paid",
  });

  await expect(customerField).toHaveValue("Acme Corporation");
  await expect(invoiceField).toHaveValue("INV-2001");
  await expect(amountField).toHaveValue("1500.75");
  await expect(dueDateField).toHaveValue("2026-08-30");
  await expect(collectorField).toHaveValue("Collections desk");
  await expect(statusField).toHaveValue("Paid");
  await submitButton.click();

  await expect(result).toContainText("Acme Corporation");
  await expect(result).toContainText("INV-2001");
  await expect(result).toContainText("Paid");
});
