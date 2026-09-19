const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupBudgetControlPage(page, options = {}) {
  const safeOptions = {
    budgetName: escapeHtml(options.budgetName),
    department: escapeHtml(options.department),
    budgetPeriod: escapeHtml(options.budgetPeriod),
    plannedAmount: escapeHtml(options.plannedAmount),
    actualAmount: escapeHtml(options.actualAmount),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Budget Control | Odoo</title>
      </head>
      <body>
        <h1>Budget Control</h1>
        <form id="budgetForm">
          <label for="budgetName">Budget name *</label>
          <input id="budgetName" name="budgetName" type="text" value="${safeOptions.budgetName || ""}" required />

          <label for="department">Department *</label>
          <input id="department" name="department" type="text" value="${safeOptions.department || ""}" required />

          <label for="budgetPeriod">Budget period *</label>
          <select id="budgetPeriod" name="budgetPeriod" required>
            <option value="">Select period</option>
            <option value="Q1 2026" ${safeOptions.budgetPeriod === "Q1 2026" ? "selected" : ""}>Q1 2026</option>
            <option value="Q2 2026" ${safeOptions.budgetPeriod === "Q2 2026" ? "selected" : ""}>Q2 2026</option>
            <option value="Q3 2026" ${safeOptions.budgetPeriod === "Q3 2026" ? "selected" : ""}>Q3 2026</option>
            <option value="Q4 2026" ${safeOptions.budgetPeriod === "Q4 2026" ? "selected" : ""}>Q4 2026</option>
          </select>

          <label for="plannedAmount">Planned amount *</label>
          <input id="plannedAmount" name="plannedAmount" type="number" step="0.01" value="${safeOptions.plannedAmount || ""}" required />

          <label for="actualAmount">Actual amount *</label>
          <input id="actualAmount" name="actualAmount" type="number" step="0.01" value="${safeOptions.actualAmount || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Approved" ${safeOptions.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Exceeded" ${safeOptions.status === "Exceeded" ? "selected" : ""}>Exceeded</option>
            <option value="Closed" ${safeOptions.status === "Closed" ? "selected" : ""}>Closed</option>
          </select>

          <button type="submit">Save budget</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("budgetForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const budgetName = document.getElementById("budgetName").value;
            const department = document.getElementById("department").value;
            const budgetPeriod = document.getElementById("budgetPeriod").value;
            const plannedAmount = Number(document.getElementById("plannedAmount").value);
            const actualAmount = Number(document.getElementById("actualAmount").value);
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (actualAmount > plannedAmount && status !== "Exceeded") {
              result.textContent = "Exceeded budgets must use Exceeded status";
              return;
            }

            const variance = (plannedAmount - actualAmount).toFixed(2);
            result.textContent = "Budget saved: " + [budgetName, department, budgetPeriod, plannedAmount.toFixed(2), actualAmount.toFixed(2), status, variance].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    budgetNameField: page.locator("#budgetName"),
    departmentField: page.locator("#department"),
    budgetPeriodField: page.locator("#budgetPeriod"),
    plannedAmountField: page.locator("#plannedAmount"),
    actualAmountField: page.locator("#actualAmount"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save budget/i }),
    result: page.locator("#result"),
  };
}

test("loads the budget control form", async ({ page }) => {
  const {
    budgetNameField,
    departmentField,
    budgetPeriodField,
    plannedAmountField,
    actualAmountField,
    statusField,
    submitButton,
  } = await setupBudgetControlPage(page);

  await expect(page).toHaveTitle(/Budget Control/i);
  await expect(budgetNameField).toBeVisible();
  await expect(departmentField).toBeVisible();
  await expect(budgetPeriodField).toBeVisible();
  await expect(plannedAmountField).toBeVisible();
  await expect(actualAmountField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a budget within plan", async ({ page }) => {
  const {
    budgetNameField,
    departmentField,
    budgetPeriodField,
    plannedAmountField,
    actualAmountField,
    statusField,
    submitButton,
    result,
  } = await setupBudgetControlPage(page);

  await budgetNameField.fill("Operations Q3");
  await departmentField.fill("Operations");
  await budgetPeriodField.selectOption("Q3 2026");
  await plannedAmountField.fill("50000");
  await actualAmountField.fill("43750.50");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Budget saved: Operations Q3 | Operations | Q3 2026 | 50000.00 | 43750.50 | Approved | 6249.50",
  );
});

test("requires budget details before saving", async ({ page }) => {
  const {
    budgetNameField,
    departmentField,
    budgetPeriodField,
    plannedAmountField,
    actualAmountField,
    statusField,
    submitButton,
  } = await setupBudgetControlPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      budgetNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      departmentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      budgetPeriodField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      plannedAmountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      actualAmountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("requires Exceeded status when actual spending is above plan", async ({
  page,
}) => {
  const {
    budgetNameField,
    departmentField,
    budgetPeriodField,
    plannedAmountField,
    actualAmountField,
    statusField,
    submitButton,
    result,
  } = await setupBudgetControlPage(page);

  await budgetNameField.fill("Marketing Q4");
  await departmentField.fill("Marketing");
  await budgetPeriodField.selectOption("Q4 2026");
  await plannedAmountField.fill("10000");
  await actualAmountField.fill("12500");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText("Exceeded budgets must use Exceeded status");
});

test("keeps a pre-filled budget plan", async ({ page }) => {
  const {
    budgetNameField,
    departmentField,
    budgetPeriodField,
    plannedAmountField,
    actualAmountField,
    statusField,
    submitButton,
    result,
  } = await setupBudgetControlPage(page, {
    budgetName: 'IT Infrastructure "Refresh"',
    department: "Information Technology",
    budgetPeriod: "Q2 2026",
    plannedAmount: "80000",
    actualAmount: "82500",
    status: "Exceeded",
  });

  await expect(budgetNameField).toHaveValue('IT Infrastructure "Refresh"');
  await expect(departmentField).toHaveValue("Information Technology");
  await expect(budgetPeriodField).toHaveValue("Q2 2026");
  await expect(plannedAmountField).toHaveValue("80000");
  await expect(actualAmountField).toHaveValue("82500");
  await expect(statusField).toHaveValue("Exceeded");
  await submitButton.click();

  await expect(result).toContainText('IT Infrastructure "Refresh"');
  await expect(result).toContainText("Information Technology");
  await expect(result).toContainText("-2500.00");
});
