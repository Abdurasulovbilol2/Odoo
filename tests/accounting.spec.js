const { test, expect } = require("@playwright/test");

async function setupAccountingPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Accounting | Odoo</title></head>
      <body>
        <h1>Journal Entries</h1>
        <form id="journalEntryForm">
          <label for="reference">Reference *</label>
          <input id="reference" name="reference" type="text" value="${options.reference || ""}" required />
          <label for="account">Account *</label>
          <input id="account" name="account" type="text" value="${options.account || ""}" required />
          <label for="debit">Debit *</label>
          <input id="debit" name="debit" type="number" min="0" step="0.01" value="${options.debit || ""}" required />
          <label for="credit">Credit *</label>
          <input id="credit" name="credit" type="number" min="0" step="0.01" value="${options.credit || ""}" required />
          <label for="status">Entry status *</label>
          <select id="status" name="status" required>
            <option value="">Select a status</option>
            <option value="draft" ${options.status === "draft" ? "selected" : ""}>Draft</option>
            <option value="posted" ${options.status === "posted" ? "selected" : ""}>Posted</option>
          </select>
          <button type="submit">Save journal entry</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("journalEntryForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const debit = Number(document.getElementById("debit").value);
            const credit = Number(document.getElementById("credit").value);
            const result = document.getElementById("result");
            if (debit !== credit) {
              result.textContent = "Entry must be balanced";
              return;
            }
            const values = ["reference", "account", "debit", "credit", "status"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            result.textContent = "Journal entry saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    referenceField: page.locator("#reference"),
    accountField: page.locator("#account"),
    debitField: page.locator("#debit"),
    creditField: page.locator("#credit"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save journal entry/i }),
    result: page.locator("#result"),
  };
}

test("loads the journal entry form", async ({ page }) => {
  const {
    referenceField,
    accountField,
    debitField,
    creditField,
    statusField,
    submitButton,
  } = await setupAccountingPage(page);

  await expect(page).toHaveTitle(/Accounting/i);
  await expect(referenceField).toBeVisible();
  await expect(accountField).toBeVisible();
  await expect(debitField).toBeVisible();
  await expect(creditField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a balanced posted journal entry", async ({ page }) => {
  const {
    referenceField,
    accountField,
    debitField,
    creditField,
    statusField,
    submitButton,
    result,
  } = await setupAccountingPage(page);

  await referenceField.fill("INV/2026/0001");
  await accountField.fill("Accounts Receivable");
  await debitField.fill("1250.50");
  await creditField.fill("1250.50");
  await statusField.selectOption("posted");
  await submitButton.click();

  await expect(result).toHaveText(
    "Journal entry saved: INV/2026/0001 | Accounts Receivable | 1250.50 | 1250.50 | posted",
  );
});

test("requires reference, account, debit, credit, and status", async ({
  page,
}) => {
  const {
    referenceField,
    accountField,
    debitField,
    creditField,
    statusField,
    submitButton,
  } = await setupAccountingPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      referenceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      accountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      debitField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      creditField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects an unbalanced journal entry", async ({ page }) => {
  const {
    referenceField,
    accountField,
    debitField,
    creditField,
    statusField,
    submitButton,
    result,
  } = await setupAccountingPage(page);

  await referenceField.fill("MISC/2026/0001");
  await accountField.fill("Miscellaneous Expenses");
  await debitField.fill("100");
  await creditField.fill("75");
  await statusField.selectOption("draft");
  await submitButton.click();

  await expect(result).toHaveText("Entry must be balanced");
});

test("posts an existing draft journal entry", async ({ page }) => {
  const {
    referenceField,
    accountField,
    debitField,
    creditField,
    statusField,
    submitButton,
    result,
  } = await setupAccountingPage(page, {
    reference: "BILL/2026/0002",
    account: "Accounts Payable",
    debit: "500",
    credit: "500",
    status: "draft",
  });

  await expect(statusField).toHaveValue("draft");
  await statusField.selectOption("posted");
  await submitButton.click();

  await expect(result).toContainText("BILL/2026/0002");
  await expect(result).toContainText("Accounts Payable");
  await expect(result).toContainText("posted");
});
