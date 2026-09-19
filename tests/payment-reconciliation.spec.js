const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupPaymentReconciliationPage(page, options = {}) {
  const safeOptions = {
    statementReference: escapeHtml(options.statementReference),
    partner: escapeHtml(options.partner),
    statementAmount: escapeHtml(options.statementAmount),
    invoiceAmount: escapeHtml(options.invoiceAmount),
    reconciliationDate: escapeHtml(options.reconciliationDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Payment Reconciliation | Odoo</title>
      </head>
      <body>
        <h1>Payment Reconciliation</h1>
        <form id="reconciliationForm">
          <label for="statementReference">Statement reference *</label>
          <input id="statementReference" name="statementReference" type="text" value="${safeOptions.statementReference || ""}" required />

          <label for="partner">Partner *</label>
          <input id="partner" name="partner" type="text" value="${safeOptions.partner || ""}" required />

          <label for="statementAmount">Statement amount *</label>
          <input id="statementAmount" name="statementAmount" type="number" step="0.01" value="${safeOptions.statementAmount || ""}" required />

          <label for="invoiceAmount">Invoice amount *</label>
          <input id="invoiceAmount" name="invoiceAmount" type="number" step="0.01" value="${safeOptions.invoiceAmount || ""}" required />

          <label for="reconciliationDate">Reconciliation date *</label>
          <input id="reconciliationDate" name="reconciliationDate" type="date" value="${safeOptions.reconciliationDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Matched" ${safeOptions.status === "Matched" ? "selected" : ""}>Matched</option>
            <option value="Partially matched" ${safeOptions.status === "Partially matched" ? "selected" : ""}>Partially matched</option>
            <option value="Unmatched" ${safeOptions.status === "Unmatched" ? "selected" : ""}>Unmatched</option>
          </select>

          <button type="submit">Reconcile payment</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("reconciliationForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const statementReference = document.getElementById("statementReference").value;
            const partner = document.getElementById("partner").value;
            const statementAmount = Number(document.getElementById("statementAmount").value);
            const invoiceAmount = Number(document.getElementById("invoiceAmount").value);
            const reconciliationDate = document.getElementById("reconciliationDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (statementAmount !== invoiceAmount) {
              result.textContent = "Statement and invoice amounts must match";
              return;
            }

            result.textContent = "Payment reconciled: " + [statementReference, partner, statementAmount.toFixed(2), invoiceAmount.toFixed(2), reconciliationDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    statementReferenceField: page.locator("#statementReference"),
    partnerField: page.locator("#partner"),
    statementAmountField: page.locator("#statementAmount"),
    invoiceAmountField: page.locator("#invoiceAmount"),
    reconciliationDateField: page.locator("#reconciliationDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /reconcile payment/i }),
    result: page.locator("#result"),
  };
}

test("loads the payment reconciliation form", async ({ page }) => {
  const {
    statementReferenceField,
    partnerField,
    statementAmountField,
    invoiceAmountField,
    reconciliationDateField,
    statusField,
    submitButton,
  } = await setupPaymentReconciliationPage(page);

  await expect(page).toHaveTitle(/Payment Reconciliation/i);
  await expect(statementReferenceField).toBeVisible();
  await expect(partnerField).toBeVisible();
  await expect(statementAmountField).toBeVisible();
  await expect(invoiceAmountField).toBeVisible();
  await expect(reconciliationDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("reconciles matching payment amounts", async ({ page }) => {
  const {
    statementReferenceField,
    partnerField,
    statementAmountField,
    invoiceAmountField,
    reconciliationDateField,
    statusField,
    submitButton,
    result,
  } = await setupPaymentReconciliationPage(page);

  await statementReferenceField.fill("BANK-2026-0918");
  await partnerField.fill("Silk Road Imports");
  await statementAmountField.fill("2450.75");
  await invoiceAmountField.fill("2450.75");
  await reconciliationDateField.fill("2026-09-19");
  await statusField.selectOption("Matched");
  await submitButton.click();

  await expect(result).toHaveText(
    "Payment reconciled: BANK-2026-0918 | Silk Road Imports | 2450.75 | 2450.75 | 2026-09-19 | Matched",
  );
});

test("requires reconciliation details before saving", async ({ page }) => {
  const {
    statementReferenceField,
    partnerField,
    statementAmountField,
    invoiceAmountField,
    reconciliationDateField,
    statusField,
    submitButton,
  } = await setupPaymentReconciliationPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      statementReferenceField.evaluate(
        (element) => element.validity.valueMissing,
      ),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      partnerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statementAmountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      invoiceAmountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      reconciliationDateField.evaluate(
        (element) => element.validity.valueMissing,
      ),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects payment amounts that do not match", async ({ page }) => {
  const {
    statementReferenceField,
    partnerField,
    statementAmountField,
    invoiceAmountField,
    reconciliationDateField,
    statusField,
    submitButton,
    result,
  } = await setupPaymentReconciliationPage(page);

  await statementReferenceField.fill("BANK-2026-0920");
  await partnerField.fill("Eastline Trading");
  await statementAmountField.fill("1800");
  await invoiceAmountField.fill("1799.99");
  await reconciliationDateField.fill("2026-09-20");
  await statusField.selectOption("Unmatched");
  await submitButton.click();

  await expect(result).toHaveText("Statement and invoice amounts must match");
});

test("keeps a pre-filled reconciliation record", async ({ page }) => {
  const {
    statementReferenceField,
    partnerField,
    statementAmountField,
    invoiceAmountField,
    reconciliationDateField,
    statusField,
    submitButton,
    result,
  } = await setupPaymentReconciliationPage(page, {
    statementReference: "BANK-2026-0901",
    partner: "Atlas Office Supply",
    statementAmount: "975.50",
    invoiceAmount: "975.50",
    reconciliationDate: "2026-09-21",
    status: "Matched",
  });

  await expect(statementReferenceField).toHaveValue("BANK-2026-0901");
  await expect(partnerField).toHaveValue("Atlas Office Supply");
  await expect(statementAmountField).toHaveValue("975.50");
  await expect(invoiceAmountField).toHaveValue("975.50");
  await expect(reconciliationDateField).toHaveValue("2026-09-21");
  await expect(statusField).toHaveValue("Matched");
  await submitButton.click();

  await expect(result).toContainText("BANK-2026-0901");
  await expect(result).toContainText("Atlas Office Supply");
  await expect(result).toContainText("Matched");
});
