const { test, expect } = require("@playwright/test");

async function setupContractsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Contracts | Odoo</title>
      </head>
      <body>
        <h1>Contracts</h1>
        <form id="contractForm">
          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${options.customer || ""}" required />

          <label for="contractName">Contract name *</label>
          <input id="contractName" name="contractName" type="text" value="${options.contractName || ""}" required />

          <label for="startDate">Start date *</label>
          <input id="startDate" name="startDate" type="date" value="${options.startDate || ""}" required />

          <label for="endDate">End date *</label>
          <input id="endDate" name="endDate" type="date" value="${options.endDate || ""}" required />

          <label for="monthlyAmount">Monthly amount *</label>
          <input id="monthlyAmount" name="monthlyAmount" type="number" min="0.01" step="0.01" value="${options.monthlyAmount || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Running" ${options.status === "Running" ? "selected" : ""}>Running</option>
            <option value="Expired" ${options.status === "Expired" ? "selected" : ""}>Expired</option>
            <option value="Cancelled" ${options.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>

          <button type="submit">Save contract</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          const startDate = document.getElementById("startDate");
          const endDate = document.getElementById("endDate");
          const validateDates = () => {
            endDate.setCustomValidity(
              startDate.value && endDate.value && endDate.value < startDate.value
                ? "End date must be on or after the start date"
                : "",
            );
          };
          startDate.addEventListener("input", validateDates);
          endDate.addEventListener("input", validateDates);
          validateDates();

          document.getElementById("contractForm").addEventListener("submit", (event) => {
            validateDates();
            if (!event.target.checkValidity()) return;
            event.preventDefault();
            const values = [
              document.getElementById("customer").value,
              document.getElementById("contractName").value,
              startDate.value,
              endDate.value,
              document.getElementById("monthlyAmount").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Contract saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customer"),
    contractNameField: page.locator("#contractName"),
    startDateField: page.locator("#startDate"),
    endDateField: page.locator("#endDate"),
    monthlyAmountField: page.locator("#monthlyAmount"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save contract/i }),
    result: page.locator("#result"),
  };
}

test("loads the contracts form", async ({ page }) => {
  const {
    customerField,
    contractNameField,
    startDateField,
    endDateField,
    monthlyAmountField,
    statusField,
    submitButton,
  } = await setupContractsPage(page);

  await expect(page).toHaveTitle(/Contracts/i);
  await expect(customerField).toBeVisible();
  await expect(contractNameField).toBeVisible();
  await expect(startDateField).toBeVisible();
  await expect(endDateField).toBeVisible();
  await expect(monthlyAmountField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a running customer contract", async ({ page }) => {
  const {
    customerField,
    contractNameField,
    startDateField,
    endDateField,
    monthlyAmountField,
    statusField,
    submitButton,
    result,
  } = await setupContractsPage(page);

  await customerField.fill("Acme Corporation");
  await contractNameField.fill("Managed services agreement");
  await startDateField.fill("2026-09-01");
  await endDateField.fill("2027-09-01");
  await monthlyAmountField.fill("4200.00");
  await statusField.selectOption("Running");
  await submitButton.click();

  await expect(result).toHaveText(
    "Contract saved: Acme Corporation | Managed services agreement | 2026-09-01 | 2027-09-01 | 4200.00 | Running",
  );
});

test("requires contract details before saving", async ({ page }) => {
  const {
    customerField,
    contractNameField,
    startDateField,
    endDateField,
    monthlyAmountField,
    statusField,
    submitButton,
  } = await setupContractsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      contractNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      startDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      endDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      monthlyAmountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a contract ending before it starts", async ({ page }) => {
  const { startDateField, endDateField, submitButton } =
    await setupContractsPage(page, {
      customer: "Northwind",
      contractName: "Support retainer",
      startDate: "2026-10-15",
      endDate: "2026-10-10",
      monthlyAmount: "350.00",
      status: "Draft",
    });

  await expect(endDateField).toHaveJSProperty("validity.valid", false);
  await expect(endDateField).toHaveJSProperty("validity.customError", true);
  await submitButton.click();
  await expect(endDateField).toHaveJSProperty("validity.customError", true);
  await expect(startDateField).toHaveValue("2026-10-15");
});

test("keeps a pre-filled cancelled contract", async ({ page }) => {
  const {
    customerField,
    contractNameField,
    startDateField,
    endDateField,
    monthlyAmountField,
    statusField,
    submitButton,
    result,
  } = await setupContractsPage(page, {
    customer: "Metro Logistics",
    contractName: "Maintenance agreement",
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    monthlyAmount: "1800.00",
    status: "Cancelled",
  });

  await expect(customerField).toHaveValue("Metro Logistics");
  await expect(contractNameField).toHaveValue("Maintenance agreement");
  await expect(startDateField).toHaveValue("2026-01-01");
  await expect(endDateField).toHaveValue("2026-06-30");
  await expect(monthlyAmountField).toHaveValue("1800.00");
  await expect(statusField).toHaveValue("Cancelled");
  await submitButton.click();

  await expect(result).toContainText("Metro Logistics");
  await expect(result).toContainText("Maintenance agreement");
  await expect(result).toContainText("Cancelled");
});
