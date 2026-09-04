const { test, expect } = require("@playwright/test");

async function setupReportsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Reports and Dashboards | Odoo</title></head>
      <body>
        <h1>Reports and Dashboards</h1>
        <form id="reportForm">
          <label for="report">Report *</label>
          <select id="report" name="report" required>
            <option value="">Select a report</option>
            <option value="sales" ${options.report === "sales" ? "selected" : ""}>Sales analysis</option>
            <option value="inventory" ${options.report === "inventory" ? "selected" : ""}>Inventory valuation</option>
            <option value="accounting" ${options.report === "accounting" ? "selected" : ""}>Accounting summary</option>
          </select>
          <label for="startDate">Start date *</label>
          <input id="startDate" name="startDate" type="date" value="${options.startDate || ""}" required />
          <label for="endDate">End date *</label>
          <input id="endDate" name="endDate" type="date" value="${options.endDate || ""}" required />
          <label for="groupBy">Group by *</label>
          <select id="groupBy" name="groupBy" required>
            <option value="">Select grouping</option>
            <option value="day" ${options.groupBy === "day" ? "selected" : ""}>Day</option>
            <option value="month" ${options.groupBy === "month" ? "selected" : ""}>Month</option>
            <option value="category" ${options.groupBy === "category" ? "selected" : ""}>Category</option>
          </select>
          <button type="submit">Generate report</button>
        </form>
        <div id="total" aria-label="Report total"></div>
        <div id="result" role="status"></div>
        <button id="export" type="button" disabled>Export report</button>
        <script>
          document.getElementById("reportForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const start = document.getElementById("startDate").value;
            const end = document.getElementById("endDate").value;
            const result = document.getElementById("result");
            if (start > end) {
              result.textContent = "End date must be on or after start date";
              return;
            }
            const values = ["report", "startDate", "endDate", "groupBy"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            result.textContent = "Report generated: " + values;
            document.getElementById("total").textContent = "Total: 12500";
            document.getElementById("export").disabled = false;
          });
        </script>
      </body>
    </html>
  `);

  return {
    reportField: page.locator("#report"),
    startDateField: page.locator("#startDate"),
    endDateField: page.locator("#endDate"),
    groupByField: page.locator("#groupBy"),
    submitButton: page.getByRole("button", { name: /generate report/i }),
    exportButton: page.getByRole("button", { name: /export report/i }),
    total: page.locator("#total"),
    result: page.locator("#result"),
  };
}

test("loads the reports and dashboards form", async ({ page }) => {
  const {
    reportField,
    startDateField,
    endDateField,
    groupByField,
    submitButton,
    exportButton,
  } = await setupReportsPage(page);

  await expect(page).toHaveTitle(/Reports and Dashboards/i);
  await expect(reportField).toBeVisible();
  await expect(startDateField).toBeVisible();
  await expect(endDateField).toBeVisible();
  await expect(groupByField).toBeVisible();
  await expect(submitButton).toBeEnabled();
  await expect(exportButton).toBeDisabled();
});

test("generates a grouped sales report", async ({ page }) => {
  const {
    reportField,
    startDateField,
    endDateField,
    groupByField,
    submitButton,
    result,
    total,
    exportButton,
  } = await setupReportsPage(page);

  await reportField.selectOption("sales");
  await startDateField.fill("2026-09-01");
  await endDateField.fill("2026-09-30");
  await groupByField.selectOption("month");
  await submitButton.click();

  await expect(result).toHaveText(
    "Report generated: sales | 2026-09-01 | 2026-09-30 | month",
  );
  await expect(total).toHaveText("Total: 12500");
  await expect(exportButton).toBeEnabled();
});

test("requires report, date range, and grouping", async ({ page }) => {
  const {
    reportField,
    startDateField,
    endDateField,
    groupByField,
    submitButton,
  } = await setupReportsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      reportField.evaluate((element) => element.validity.valueMissing),
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
      groupByField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a report date range in reverse order", async ({ page }) => {
  const {
    reportField,
    startDateField,
    endDateField,
    groupByField,
    submitButton,
    result,
  } = await setupReportsPage(page);

  await reportField.selectOption("inventory");
  await startDateField.fill("2026-09-30");
  await endDateField.fill("2026-09-01");
  await groupByField.selectOption("category");
  await submitButton.click();

  await expect(result).toHaveText("End date must be on or after start date");
});

test("preserves existing report filters", async ({ page }) => {
  const {
    reportField,
    startDateField,
    endDateField,
    groupByField,
    submitButton,
    result,
  } = await setupReportsPage(page, {
    report: "accounting",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    groupBy: "category",
  });

  await expect(reportField).toHaveValue("accounting");
  await expect(startDateField).toHaveValue("2026-08-01");
  await expect(endDateField).toHaveValue("2026-08-31");
  await expect(groupByField).toHaveValue("category");
  await submitButton.click();

  await expect(result).toContainText("accounting");
  await expect(result).toContainText("2026-08-31");
});
