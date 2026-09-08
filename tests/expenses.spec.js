const { test, expect } = require("@playwright/test");

async function setupExpensesPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Expenses | Odoo</title>
      </head>
      <body>
        <h1>Expenses</h1>
        <form id="expenseForm">
          <label for="employee">Employee *</label>
          <input id="employee" name="employee" type="text" value="${options.employee || ""}" required />

          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="">Select category</option>
            <option value="Travel" ${options.category === "Travel" ? "selected" : ""}>Travel</option>
            <option value="Meals" ${options.category === "Meals" ? "selected" : ""}>Meals</option>
            <option value="Office supplies" ${options.category === "Office supplies" ? "selected" : ""}>Office supplies</option>
          </select>

          <label for="amount">Amount *</label>
          <input id="amount" name="amount" type="number" min="0.01" step="0.01" value="${options.amount || ""}" required />

          <label for="expenseDate">Expense date *</label>
          <input id="expenseDate" name="expenseDate" type="date" value="${options.expenseDate || ""}" required />

          <label for="paymentStatus">Payment status *</label>
          <select id="paymentStatus" name="paymentStatus" required>
            <option value="">Select payment status</option>
            <option value="To submit" ${options.paymentStatus === "To submit" ? "selected" : ""}>To submit</option>
            <option value="Submitted" ${options.paymentStatus === "Submitted" ? "selected" : ""}>Submitted</option>
            <option value="Approved" ${options.paymentStatus === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Paid" ${options.paymentStatus === "Paid" ? "selected" : ""}>Paid</option>
          </select>

          <button type="submit">Save expense</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("expenseForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const amount = document.getElementById("amount").value;
            const values = [
              document.getElementById("employee").value,
              document.getElementById("category").value,
              amount,
              document.getElementById("expenseDate").value,
              document.getElementById("paymentStatus").value,
            ];
            document.getElementById("result").textContent = "Expense saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    employeeField: page.locator("#employee"),
    categoryField: page.locator("#category"),
    amountField: page.locator("#amount"),
    expenseDateField: page.locator("#expenseDate"),
    paymentStatusField: page.locator("#paymentStatus"),
    submitButton: page.getByRole("button", { name: /save expense/i }),
    result: page.locator("#result"),
  };
}

test("loads the expenses form", async ({ page }) => {
  const {
    employeeField,
    categoryField,
    amountField,
    expenseDateField,
    paymentStatusField,
    submitButton,
  } = await setupExpensesPage(page);

  await expect(page).toHaveTitle(/Expenses/i);
  await expect(employeeField).toBeVisible();
  await expect(categoryField).toBeVisible();
  await expect(amountField).toBeVisible();
  await expect(expenseDateField).toBeVisible();
  await expect(paymentStatusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a submitted travel expense", async ({ page }) => {
  const {
    employeeField,
    categoryField,
    amountField,
    expenseDateField,
    paymentStatusField,
    submitButton,
    result,
  } = await setupExpensesPage(page);

  await employeeField.fill("Bilol Abdurasulov");
  await categoryField.selectOption("Travel");
  await amountField.fill("245.75");
  await expenseDateField.fill("2026-09-08");
  await paymentStatusField.selectOption("Submitted");
  await submitButton.click();

  await expect(result).toHaveText(
    "Expense saved: Bilol Abdurasulov | Travel | 245.75 | 2026-09-08 | Submitted",
  );
});

test("requires expense details before saving", async ({ page }) => {
  const {
    employeeField,
    categoryField,
    amountField,
    expenseDateField,
    paymentStatusField,
    submitButton,
  } = await setupExpensesPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      employeeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      categoryField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      amountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      expenseDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      paymentStatusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero or negative expense amount", async ({ page }) => {
  const { amountField } = await setupExpensesPage(page);

  await amountField.fill("0");
  await expect(amountField).toHaveJSProperty("validity.valid", false);
  await expect(amountField).toHaveJSProperty("validity.rangeUnderflow", true);

  await amountField.fill("-12");
  await expect(amountField).toHaveJSProperty("validity.valid", false);
  await expect(amountField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps an approved pre-filled expense", async ({ page }) => {
  const {
    employeeField,
    categoryField,
    amountField,
    expenseDateField,
    paymentStatusField,
    submitButton,
    result,
  } = await setupExpensesPage(page, {
    employee: "Finance Team",
    category: "Office supplies",
    amount: "89.40",
    expenseDate: "2026-09-01",
    paymentStatus: "Approved",
  });

  await expect(employeeField).toHaveValue("Finance Team");
  await expect(categoryField).toHaveValue("Office supplies");
  await expect(amountField).toHaveValue("89.40");
  await expect(expenseDateField).toHaveValue("2026-09-01");
  await expect(paymentStatusField).toHaveValue("Approved");
  await submitButton.click();

  await expect(result).toContainText("Finance Team");
  await expect(result).toContainText("Office supplies");
  await expect(result).toContainText("Approved");
});
