const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupCommissionManagementPage(page, options = {}) {
  const safeOptions = {
    salesperson: escapeHtml(options.salesperson),
    plan: escapeHtml(options.plan),
    period: escapeHtml(options.period),
    salesAmount: escapeHtml(options.salesAmount),
    commissionRate: escapeHtml(options.commissionRate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Commission Management | Odoo</title>
      </head>
      <body>
        <h1>Commission Management</h1>
        <form id="commissionForm">
          <label for="salesperson">Salesperson *</label>
          <input id="salesperson" name="salesperson" type="text" value="${safeOptions.salesperson || ""}" required />

          <label for="plan">Commission plan *</label>
          <select id="plan" name="plan" required>
            <option value="">Select plan</option>
            <option value="Standard" ${safeOptions.plan === "Standard" ? "selected" : ""}>Standard</option>
            <option value="Accelerator" ${safeOptions.plan === "Accelerator" ? "selected" : ""}>Accelerator</option>
            <option value="Enterprise" ${safeOptions.plan === "Enterprise" ? "selected" : ""}>Enterprise</option>
          </select>

          <label for="period">Commission period *</label>
          <select id="period" name="period" required>
            <option value="">Select period</option>
            <option value="September 2026" ${safeOptions.period === "September 2026" ? "selected" : ""}>September 2026</option>
            <option value="October 2026" ${safeOptions.period === "October 2026" ? "selected" : ""}>October 2026</option>
            <option value="November 2026" ${safeOptions.period === "November 2026" ? "selected" : ""}>November 2026</option>
          </select>

          <label for="salesAmount">Sales amount *</label>
          <input id="salesAmount" name="salesAmount" type="number" step="0.01" value="${safeOptions.salesAmount || ""}" required />

          <label for="commissionRate">Commission rate (%) *</label>
          <input id="commissionRate" name="commissionRate" type="number" step="0.01" value="${safeOptions.commissionRate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Approved" ${safeOptions.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Paid" ${safeOptions.status === "Paid" ? "selected" : ""}>Paid</option>
          </select>

          <button type="submit">Calculate commission</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("commissionForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const salesperson = document.getElementById("salesperson").value;
            const plan = document.getElementById("plan").value;
            const period = document.getElementById("period").value;
            const salesAmount = Number(document.getElementById("salesAmount").value);
            const commissionRate = Number(document.getElementById("commissionRate").value);
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (commissionRate <= 0 || commissionRate > 100) {
              result.textContent = "Commission rate must be between 0 and 100";
              return;
            }

            if (salesAmount < 0) {
              result.textContent = "Sales amount cannot be negative";
              return;
            }

            const commission = (salesAmount * commissionRate / 100).toFixed(2);
            result.textContent = "Commission calculated: " + [salesperson, plan, period, salesAmount.toFixed(2), commissionRate.toFixed(2), status, commission].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    salespersonField: page.locator("#salesperson"),
    planField: page.locator("#plan"),
    periodField: page.locator("#period"),
    salesAmountField: page.locator("#salesAmount"),
    commissionRateField: page.locator("#commissionRate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /calculate commission/i }),
    result: page.locator("#result"),
  };
}

test("loads the commission management form", async ({ page }) => {
  const {
    salespersonField,
    planField,
    periodField,
    salesAmountField,
    commissionRateField,
    statusField,
    submitButton,
  } = await setupCommissionManagementPage(page);

  await expect(page).toHaveTitle(/Commission Management/i);
  await expect(salespersonField).toBeVisible();
  await expect(planField).toBeVisible();
  await expect(periodField).toBeVisible();
  await expect(salesAmountField).toBeVisible();
  await expect(commissionRateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("calculates a valid sales commission", async ({ page }) => {
  const {
    salespersonField,
    planField,
    periodField,
    salesAmountField,
    commissionRateField,
    statusField,
    submitButton,
    result,
  } = await setupCommissionManagementPage(page);

  await salespersonField.fill("Diyorbek Karimov");
  await planField.selectOption("Accelerator");
  await periodField.selectOption("September 2026");
  await salesAmountField.fill("27500");
  await commissionRateField.fill("7.5");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Commission calculated: Diyorbek Karimov | Accelerator | September 2026 | 27500.00 | 7.50 | Approved | 2062.50",
  );
});

test("requires commission details before calculating", async ({ page }) => {
  const {
    salespersonField,
    planField,
    periodField,
    salesAmountField,
    commissionRateField,
    statusField,
    submitButton,
  } = await setupCommissionManagementPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      salespersonField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      planField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      periodField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      salesAmountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      commissionRateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a commission rate outside the valid range", async ({ page }) => {
  const {
    salespersonField,
    planField,
    periodField,
    salesAmountField,
    commissionRateField,
    statusField,
    submitButton,
    result,
  } = await setupCommissionManagementPage(page);

  await salespersonField.fill("Madinabonu Saidova");
  await planField.selectOption("Standard");
  await periodField.selectOption("October 2026");
  await salesAmountField.fill("12000");
  await commissionRateField.fill("101");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Commission rate must be between 0 and 100");
});

test("keeps a pre-filled commission plan", async ({ page }) => {
  const {
    salespersonField,
    planField,
    periodField,
    salesAmountField,
    commissionRateField,
    statusField,
    submitButton,
    result,
  } = await setupCommissionManagementPage(page, {
    salesperson: 'Nodira "Nora" Abidova',
    plan: "Enterprise",
    period: "November 2026",
    salesAmount: "48000",
    commissionRate: "5",
    status: "Paid",
  });

  await expect(salespersonField).toHaveValue('Nodira "Nora" Abidova');
  await expect(planField).toHaveValue("Enterprise");
  await expect(periodField).toHaveValue("November 2026");
  await expect(salesAmountField).toHaveValue("48000");
  await expect(commissionRateField).toHaveValue("5");
  await expect(statusField).toHaveValue("Paid");
  await submitButton.click();

  await expect(result).toContainText('Nodira "Nora" Abidova');
  await expect(result).toContainText("Enterprise");
  await expect(result).toContainText("2400.00");
});
