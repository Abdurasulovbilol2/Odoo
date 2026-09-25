const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupVendorBillsPage(page, options = {}) {
  const safeOptions = {
    vendor: escapeHtml(options.vendor),
    billNumber: escapeHtml(options.billNumber),
    amount: escapeHtml(options.amount),
    dueDate: escapeHtml(options.dueDate),
    paymentTerms: escapeHtml(options.paymentTerms),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Vendor Bills | Odoo</title>
      </head>
      <body>
        <h1>Vendor Bills</h1>
        <form id="vendorBillForm">
          <label for="vendor">Vendor *</label>
          <input id="vendor" name="vendor" type="text" value="${safeOptions.vendor || ""}" required />

          <label for="billNumber">Bill number *</label>
          <input id="billNumber" name="billNumber" type="text" value="${safeOptions.billNumber || ""}" required />

          <label for="amount">Amount *</label>
          <input id="amount" name="amount" type="number" step="0.01" value="${safeOptions.amount || ""}" required />

          <label for="dueDate">Due date *</label>
          <input id="dueDate" name="dueDate" type="date" value="${safeOptions.dueDate || ""}" required />

          <label for="paymentTerms">Payment terms *</label>
          <select id="paymentTerms" name="paymentTerms" required>
            <option value="">Select terms</option>
            <option value="Net 15" ${safeOptions.paymentTerms === "Net 15" ? "selected" : ""}>Net 15</option>
            <option value="Net 30" ${safeOptions.paymentTerms === "Net 30" ? "selected" : ""}>Net 30</option>
            <option value="Net 60" ${safeOptions.paymentTerms === "Net 60" ? "selected" : ""}>Net 60</option>
          </select>

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Approved" ${safeOptions.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Paid" ${safeOptions.status === "Paid" ? "selected" : ""}>Paid</option>
          </select>

          <button type="submit">Register bill</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("vendorBillForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const vendor = document.getElementById("vendor").value.trim();
            const billNumber = document.getElementById("billNumber").value.trim();
            const amount = Number(document.getElementById("amount").value);
            const dueDate = document.getElementById("dueDate").value;
            const paymentTerms = document.getElementById("paymentTerms").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (amount <= 0) {
              result.textContent = "Bill amount must be greater than zero";
              return;
            }

            if (status === "Paid" && paymentTerms === "Net 60") {
              result.textContent = "Paid bills cannot use Net 60 terms";
              return;
            }

            result.textContent = "Bill registered: " + [vendor, billNumber, amount.toFixed(2), dueDate, paymentTerms, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    vendorField: page.locator("#vendor"),
    billNumberField: page.locator("#billNumber"),
    amountField: page.locator("#amount"),
    dueDateField: page.locator("#dueDate"),
    paymentTermsField: page.locator("#paymentTerms"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /register bill/i }),
    result: page.locator("#result"),
  };
}

test("loads the vendor bills form", async ({ page }) => {
  const {
    vendorField,
    billNumberField,
    amountField,
    dueDateField,
    paymentTermsField,
    statusField,
    submitButton,
  } = await setupVendorBillsPage(page);

  await expect(page).toHaveTitle(/Vendor Bills/i);
  await expect(vendorField).toBeVisible();
  await expect(billNumberField).toBeVisible();
  await expect(amountField).toBeVisible();
  await expect(dueDateField).toBeVisible();
  await expect(paymentTermsField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("registers a valid vendor bill", async ({ page }) => {
  const {
    vendorField,
    billNumberField,
    amountField,
    dueDateField,
    paymentTermsField,
    statusField,
    submitButton,
    result,
  } = await setupVendorBillsPage(page);

  await vendorField.fill("Northwind Supplies");
  await billNumberField.fill("VB-5401");
  await amountField.fill("1825.50");
  await dueDateField.fill("2026-10-05");
  await paymentTermsField.selectOption("Net 30");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Bill registered: Northwind Supplies | VB-5401 | 1825.50 | 2026-10-05 | Net 30 | Approved",
  );
});

test("requires all bill fields before registration", async ({ page }) => {
  const {
    vendorField,
    billNumberField,
    amountField,
    dueDateField,
    paymentTermsField,
    statusField,
    submitButton,
  } = await setupVendorBillsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      vendorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      billNumberField.evaluate((element) => element.validity.valueMissing),
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
      paymentTermsField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative bill amounts", async ({ page }) => {
  const {
    vendorField,
    billNumberField,
    amountField,
    dueDateField,
    paymentTermsField,
    statusField,
    submitButton,
    result,
  } = await setupVendorBillsPage(page);

  await vendorField.fill("Blue Ridge Co");
  await billNumberField.fill("VB-7788");
  await amountField.fill("0");
  await dueDateField.fill("2026-10-07");
  await paymentTermsField.selectOption("Net 15");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Bill amount must be greater than zero");
});

test("keeps a pre-filled vendor bill", async ({ page }) => {
  const {
    vendorField,
    billNumberField,
    amountField,
    dueDateField,
    paymentTermsField,
    statusField,
    submitButton,
    result,
  } = await setupVendorBillsPage(page, {
    vendor: 'Atlas Goods "Prime"',
    billNumber: "VB-9991",
    amount: "450.25",
    dueDate: "2026-10-12",
    paymentTerms: "Net 60",
    status: "Approved",
  });

  await expect(vendorField).toHaveValue('Atlas Goods "Prime"');
  await expect(billNumberField).toHaveValue("VB-9991");
  await expect(amountField).toHaveValue("450.25");
  await expect(dueDateField).toHaveValue("2026-10-12");
  await expect(paymentTermsField).toHaveValue("Net 60");
  await expect(statusField).toHaveValue("Approved");

  await submitButton.click();

  await expect(result).toContainText('Atlas Goods "Prime"');
  await expect(result).toContainText("450.25");
});
