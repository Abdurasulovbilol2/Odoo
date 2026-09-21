const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupTaxFilingsPage(page, options = {}) {
  const safeOptions = {
    company: escapeHtml(options.company),
    taxType: escapeHtml(options.taxType),
    period: escapeHtml(options.period),
    taxableAmount: escapeHtml(options.taxableAmount),
    taxRate: escapeHtml(options.taxRate),
    filingDate: escapeHtml(options.filingDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Tax Filings | Odoo</title>
      </head>
      <body>
        <h1>Tax Filings</h1>
        <form id="taxForm">
          <label for="company">Company *</label>
          <input id="company" name="company" type="text" value="${safeOptions.company || ""}" required />

          <label for="taxType">Tax type *</label>
          <select id="taxType" name="taxType" required>
            <option value="">Select tax type</option>
            <option value="VAT" ${safeOptions.taxType === "VAT" ? "selected" : ""}>VAT</option>
            <option value="Corporate income" ${safeOptions.taxType === "Corporate income" ? "selected" : ""}>Corporate income</option>
            <option value="Payroll" ${safeOptions.taxType === "Payroll" ? "selected" : ""}>Payroll</option>
            <option value="Sales" ${safeOptions.taxType === "Sales" ? "selected" : ""}>Sales</option>
          </select>

          <label for="period">Tax period *</label>
          <select id="period" name="period" required>
            <option value="">Select period</option>
            <option value="Q2 2026" ${safeOptions.period === "Q2 2026" ? "selected" : ""}>Q2 2026</option>
            <option value="Q3 2026" ${safeOptions.period === "Q3 2026" ? "selected" : ""}>Q3 2026</option>
            <option value="Q4 2026" ${safeOptions.period === "Q4 2026" ? "selected" : ""}>Q4 2026</option>
          </select>

          <label for="taxableAmount">Taxable amount *</label>
          <input id="taxableAmount" name="taxableAmount" type="number" step="0.01" value="${safeOptions.taxableAmount || ""}" required />

          <label for="taxRate">Tax rate (%) *</label>
          <input id="taxRate" name="taxRate" type="number" step="0.01" value="${safeOptions.taxRate || ""}" required />

          <label for="filingDate">Filing date *</label>
          <input id="filingDate" name="filingDate" type="date" value="${safeOptions.filingDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Submitted" ${safeOptions.status === "Submitted" ? "selected" : ""}>Submitted</option>
            <option value="Paid" ${safeOptions.status === "Paid" ? "selected" : ""}>Paid</option>
          </select>

          <button type="submit">Calculate tax filing</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("taxForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const company = document.getElementById("company").value;
            const taxType = document.getElementById("taxType").value;
            const period = document.getElementById("period").value;
            const taxableAmount = Number(document.getElementById("taxableAmount").value);
            const taxRate = Number(document.getElementById("taxRate").value);
            const filingDate = document.getElementById("filingDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (taxableAmount < 0) {
              result.textContent = "Taxable amount cannot be negative";
              return;
            }

            if (taxRate <= 0 || taxRate > 100) {
              result.textContent = "Tax rate must be between 0 and 100";
              return;
            }

            const taxDue = (taxableAmount * taxRate / 100).toFixed(2);
            result.textContent = "Tax filing calculated: " + [company, taxType, period, taxableAmount.toFixed(2), taxRate.toFixed(2), filingDate, status, taxDue].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    companyField: page.locator("#company"),
    taxTypeField: page.locator("#taxType"),
    periodField: page.locator("#period"),
    taxableAmountField: page.locator("#taxableAmount"),
    taxRateField: page.locator("#taxRate"),
    filingDateField: page.locator("#filingDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /calculate tax filing/i }),
    result: page.locator("#result"),
  };
}

test("loads the tax filings form", async ({ page }) => {
  const {
    companyField,
    taxTypeField,
    periodField,
    taxableAmountField,
    taxRateField,
    filingDateField,
    statusField,
    submitButton,
  } = await setupTaxFilingsPage(page);

  await expect(page).toHaveTitle(/Tax Filings/i);
  await expect(companyField).toBeVisible();
  await expect(taxTypeField).toBeVisible();
  await expect(periodField).toBeVisible();
  await expect(taxableAmountField).toBeVisible();
  await expect(taxRateField).toBeVisible();
  await expect(filingDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("calculates a valid tax filing", async ({ page }) => {
  const {
    companyField,
    taxTypeField,
    periodField,
    taxableAmountField,
    taxRateField,
    filingDateField,
    statusField,
    submitButton,
    result,
  } = await setupTaxFilingsPage(page);

  await companyField.fill("Nova Distribution");
  await taxTypeField.selectOption("VAT");
  await periodField.selectOption("Q3 2026");
  await taxableAmountField.fill("64000");
  await taxRateField.fill("12");
  await filingDateField.fill("2026-10-15");
  await statusField.selectOption("Submitted");
  await submitButton.click();

  await expect(result).toHaveText(
    "Tax filing calculated: Nova Distribution | VAT | Q3 2026 | 64000.00 | 12.00 | 2026-10-15 | Submitted | 7680.00",
  );
});

test("requires tax filing details before calculating", async ({ page }) => {
  const {
    companyField,
    taxTypeField,
    periodField,
    taxableAmountField,
    taxRateField,
    filingDateField,
    statusField,
    submitButton,
  } = await setupTaxFilingsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      companyField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      taxTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      periodField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      taxableAmountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      taxRateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      filingDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a tax rate outside the valid range", async ({ page }) => {
  const {
    companyField,
    taxTypeField,
    periodField,
    taxableAmountField,
    taxRateField,
    filingDateField,
    statusField,
    submitButton,
    result,
  } = await setupTaxFilingsPage(page);

  await companyField.fill("Eastline Retail");
  await taxTypeField.selectOption("Sales");
  await periodField.selectOption("Q4 2026");
  await taxableAmountField.fill("22000");
  await taxRateField.fill("101");
  await filingDateField.fill("2027-01-15");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Tax rate must be between 0 and 100");
});

test("keeps a pre-filled tax filing", async ({ page }) => {
  const {
    companyField,
    taxTypeField,
    periodField,
    taxableAmountField,
    taxRateField,
    filingDateField,
    statusField,
    submitButton,
    result,
  } = await setupTaxFilingsPage(page, {
    company: 'Atlas "Central" Foods',
    taxType: "Corporate income",
    period: "Q2 2026",
    taxableAmount: "95000",
    taxRate: "15",
    filingDate: "2026-07-15",
    status: "Paid",
  });

  await expect(companyField).toHaveValue('Atlas "Central" Foods');
  await expect(taxTypeField).toHaveValue("Corporate income");
  await expect(periodField).toHaveValue("Q2 2026");
  await expect(taxableAmountField).toHaveValue("95000");
  await expect(taxRateField).toHaveValue("15");
  await expect(filingDateField).toHaveValue("2026-07-15");
  await expect(statusField).toHaveValue("Paid");
  await submitButton.click();

  await expect(result).toContainText('Atlas "Central" Foods');
  await expect(result).toContainText("Corporate income");
  await expect(result).toContainText("14250.00");
});
