const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupPayrollRunsPage(page, options = {}) {
  const safeOptions = {
    employee: escapeHtml(options.employee),
    period: escapeHtml(options.period),
    contractType: escapeHtml(options.contractType),
    grossSalary: escapeHtml(options.grossSalary),
    deductions: escapeHtml(options.deductions),
    paymentDate: escapeHtml(options.paymentDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Payroll Runs | Odoo</title>
      </head>
      <body>
        <h1>Payroll Runs</h1>
        <form id="payrollForm">
          <label for="employee">Employee *</label>
          <input id="employee" name="employee" type="text" value="${safeOptions.employee || ""}" required />

          <label for="period">Payroll period *</label>
          <select id="period" name="period" required>
            <option value="">Select period</option>
            <option value="September 2026" ${safeOptions.period === "September 2026" ? "selected" : ""}>September 2026</option>
            <option value="October 2026" ${safeOptions.period === "October 2026" ? "selected" : ""}>October 2026</option>
            <option value="November 2026" ${safeOptions.period === "November 2026" ? "selected" : ""}>November 2026</option>
          </select>

          <label for="contractType">Contract type *</label>
          <select id="contractType" name="contractType" required>
            <option value="">Select contract</option>
            <option value="Full-time" ${safeOptions.contractType === "Full-time" ? "selected" : ""}>Full-time</option>
            <option value="Part-time" ${safeOptions.contractType === "Part-time" ? "selected" : ""}>Part-time</option>
            <option value="Contractor" ${safeOptions.contractType === "Contractor" ? "selected" : ""}>Contractor</option>
          </select>

          <label for="grossSalary">Gross salary *</label>
          <input id="grossSalary" name="grossSalary" type="number" step="0.01" value="${safeOptions.grossSalary || ""}" required />

          <label for="deductions">Deductions *</label>
          <input id="deductions" name="deductions" type="number" step="0.01" value="${safeOptions.deductions || ""}" required />

          <label for="paymentDate">Payment date *</label>
          <input id="paymentDate" name="paymentDate" type="date" value="${safeOptions.paymentDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Approved" ${safeOptions.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Paid" ${safeOptions.status === "Paid" ? "selected" : ""}>Paid</option>
          </select>

          <button type="submit">Calculate payroll</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("payrollForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const employee = document.getElementById("employee").value;
            const period = document.getElementById("period").value;
            const contractType = document.getElementById("contractType").value;
            const grossSalary = Number(document.getElementById("grossSalary").value);
            const deductions = Number(document.getElementById("deductions").value);
            const paymentDate = document.getElementById("paymentDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (deductions > grossSalary) {
              result.textContent = "Deductions cannot exceed gross salary";
              return;
            }

            if (deductions < 0) {
              result.textContent = "Deductions cannot be negative";
              return;
            }

            const netSalary = (grossSalary - deductions).toFixed(2);
            result.textContent = "Payroll calculated: " + [employee, period, contractType, grossSalary.toFixed(2), deductions.toFixed(2), paymentDate, status, netSalary].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    employeeField: page.locator("#employee"),
    periodField: page.locator("#period"),
    contractTypeField: page.locator("#contractType"),
    grossSalaryField: page.locator("#grossSalary"),
    deductionsField: page.locator("#deductions"),
    paymentDateField: page.locator("#paymentDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /calculate payroll/i }),
    result: page.locator("#result"),
  };
}

test("loads the payroll runs form", async ({ page }) => {
  const {
    employeeField,
    periodField,
    contractTypeField,
    grossSalaryField,
    deductionsField,
    paymentDateField,
    statusField,
    submitButton,
  } = await setupPayrollRunsPage(page);

  await expect(page).toHaveTitle(/Payroll Runs/i);
  await expect(employeeField).toBeVisible();
  await expect(periodField).toBeVisible();
  await expect(contractTypeField).toBeVisible();
  await expect(grossSalaryField).toBeVisible();
  await expect(deductionsField).toBeVisible();
  await expect(paymentDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("calculates a valid payroll run", async ({ page }) => {
  const {
    employeeField,
    periodField,
    contractTypeField,
    grossSalaryField,
    deductionsField,
    paymentDateField,
    statusField,
    submitButton,
    result,
  } = await setupPayrollRunsPage(page);

  await employeeField.fill("Aziza Tursunova");
  await periodField.selectOption("September 2026");
  await contractTypeField.selectOption("Full-time");
  await grossSalaryField.fill("4200");
  await deductionsField.fill("650.50");
  await paymentDateField.fill("2026-09-30");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Payroll calculated: Aziza Tursunova | September 2026 | Full-time | 4200.00 | 650.50 | 2026-09-30 | Approved | 3549.50",
  );
});

test("requires payroll details before calculating", async ({ page }) => {
  const {
    employeeField,
    periodField,
    contractTypeField,
    grossSalaryField,
    deductionsField,
    paymentDateField,
    statusField,
    submitButton,
  } = await setupPayrollRunsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      employeeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      periodField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      contractTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      grossSalaryField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      deductionsField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      paymentDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects deductions above gross salary", async ({ page }) => {
  const {
    employeeField,
    periodField,
    contractTypeField,
    grossSalaryField,
    deductionsField,
    paymentDateField,
    statusField,
    submitButton,
    result,
  } = await setupPayrollRunsPage(page);

  await employeeField.fill("Bekzod Rahimov");
  await periodField.selectOption("October 2026");
  await contractTypeField.selectOption("Contractor");
  await grossSalaryField.fill("1800");
  await deductionsField.fill("2000");
  await paymentDateField.fill("2026-10-31");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Deductions cannot exceed gross salary");
});

test("keeps a pre-filled payroll run", async ({ page }) => {
  const {
    employeeField,
    periodField,
    contractTypeField,
    grossSalaryField,
    deductionsField,
    paymentDateField,
    statusField,
    submitButton,
    result,
  } = await setupPayrollRunsPage(page, {
    employee: 'Nargiza "Nora" Karimova',
    period: "November 2026",
    contractType: "Part-time",
    grossSalary: "2800",
    deductions: "300",
    paymentDate: "2026-11-30",
    status: "Paid",
  });

  await expect(employeeField).toHaveValue('Nargiza "Nora" Karimova');
  await expect(periodField).toHaveValue("November 2026");
  await expect(contractTypeField).toHaveValue("Part-time");
  await expect(grossSalaryField).toHaveValue("2800");
  await expect(deductionsField).toHaveValue("300");
  await expect(paymentDateField).toHaveValue("2026-11-30");
  await expect(statusField).toHaveValue("Paid");
  await submitButton.click();

  await expect(result).toContainText('Nargiza "Nora" Karimova');
  await expect(result).toContainText("Part-time");
  await expect(result).toContainText("2500.00");
});
