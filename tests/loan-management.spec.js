const { test, expect } = require("@playwright/test");

async function setupLoanManagementPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Loan Management | Odoo</title>
      </head>
      <body>
        <h1>Loan Management</h1>
        <form id="loanForm">
          <label for="borrower">Borrower *</label>
          <input id="borrower" name="borrower" type="text" value="${options.borrower || ""}" required />

          <label for="loanType">Loan type *</label>
          <select id="loanType" name="loanType" required>
            <option value="">Select loan type</option>
            <option value="Personal" ${options.loanType === "Personal" ? "selected" : ""}>Personal</option>
            <option value="Business" ${options.loanType === "Business" ? "selected" : ""}>Business</option>
            <option value="Vehicle" ${options.loanType === "Vehicle" ? "selected" : ""}>Vehicle</option>
          </select>

          <label for="principal">Principal amount *</label>
          <input id="principal" name="principal" type="number" min="0.01" step="0.01" value="${options.principal || ""}" required />

          <label for="termMonths">Term (months) *</label>
          <input id="termMonths" name="termMonths" type="number" min="1" step="1" value="${options.termMonths || ""}" required />

          <label for="interestRate">Interest rate (%) *</label>
          <input id="interestRate" name="interestRate" type="number" min="0.01" step="0.01" value="${options.interestRate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Approved" ${options.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Active" ${options.status === "Active" ? "selected" : ""}>Active</option>
            <option value="Closed" ${options.status === "Closed" ? "selected" : ""}>Closed</option>
          </select>

          <button type="submit">Save loan</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("loanForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("borrower").value,
              document.getElementById("loanType").value,
              document.getElementById("principal").value,
              document.getElementById("termMonths").value,
              document.getElementById("interestRate").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Loan saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    borrowerField: page.locator("#borrower"),
    loanTypeField: page.locator("#loanType"),
    principalField: page.locator("#principal"),
    termMonthsField: page.locator("#termMonths"),
    interestRateField: page.locator("#interestRate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save loan/i }),
    result: page.locator("#result"),
  };
}

test("loads the loan management form", async ({ page }) => {
  const {
    borrowerField,
    loanTypeField,
    principalField,
    termMonthsField,
    interestRateField,
    statusField,
    submitButton,
  } = await setupLoanManagementPage(page);

  await expect(page).toHaveTitle(/Loan Management/i);
  await expect(borrowerField).toBeVisible();
  await expect(loanTypeField).toBeVisible();
  await expect(principalField).toBeVisible();
  await expect(termMonthsField).toBeVisible();
  await expect(interestRateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves an approved business loan", async ({ page }) => {
  const {
    borrowerField,
    loanTypeField,
    principalField,
    termMonthsField,
    interestRateField,
    statusField,
    submitButton,
    result,
  } = await setupLoanManagementPage(page);

  await borrowerField.fill("Bilol Abdurasulov");
  await loanTypeField.selectOption("Business");
  await principalField.fill("15000.00");
  await termMonthsField.fill("24");
  await interestRateField.fill("7.5");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Loan saved: Bilol Abdurasulov | Business | 15000.00 | 24 | 7.5 | Approved",
  );
});

test("requires loan details before saving", async ({ page }) => {
  const {
    borrowerField,
    loanTypeField,
    principalField,
    termMonthsField,
    interestRateField,
    statusField,
    submitButton,
  } = await setupLoanManagementPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      borrowerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      loanTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      principalField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      termMonthsField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      interestRateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero principal amount", async ({ page }) => {
  const { principalField } = await setupLoanManagementPage(page);

  await principalField.fill("0");
  await expect(principalField).toHaveJSProperty("validity.valid", false);
  await expect(principalField).toHaveJSProperty(
    "validity.rangeUnderflow",
    true,
  );
});

test("keeps a pre-filled closed loan", async ({ page }) => {
  const {
    borrowerField,
    loanTypeField,
    principalField,
    termMonthsField,
    interestRateField,
    statusField,
    submitButton,
    result,
  } = await setupLoanManagementPage(page, {
    borrower: "Northwind Traders",
    loanType: "Vehicle",
    principal: "12000.00",
    termMonths: "36",
    interestRate: "4.25",
    status: "Closed",
  });

  await expect(borrowerField).toHaveValue("Northwind Traders");
  await expect(loanTypeField).toHaveValue("Vehicle");
  await expect(principalField).toHaveValue("12000.00");
  await expect(termMonthsField).toHaveValue("36");
  await expect(interestRateField).toHaveValue("4.25");
  await expect(statusField).toHaveValue("Closed");
  await submitButton.click();

  await expect(result).toContainText("Northwind Traders");
  await expect(result).toContainText("Vehicle");
  await expect(result).toContainText("Closed");
});
