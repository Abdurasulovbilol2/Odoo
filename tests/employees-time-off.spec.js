const { test, expect } = require("@playwright/test");

async function setupEmployeesPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Employees and Time Off | Odoo</title></head>
      <body>
        <h1>Employees and Time Off</h1>
        <form id="employeeLeaveForm">
          <label for="employee">Employee name *</label>
          <input id="employee" name="employee" type="text" value="${options.employee || ""}" required />
          <label for="department">Department *</label>
          <input id="department" name="department" type="text" value="${options.department || ""}" required />
          <label for="leaveType">Time off type *</label>
          <select id="leaveType" name="leaveType" required>
            <option value="">Select a type</option>
            <option value="annual" ${options.leaveType === "annual" ? "selected" : ""}>Annual leave</option>
            <option value="sick" ${options.leaveType === "sick" ? "selected" : ""}>Sick leave</option>
            <option value="unpaid" ${options.leaveType === "unpaid" ? "selected" : ""}>Unpaid leave</option>
          </select>
          <label for="startDate">Start date *</label>
          <input id="startDate" name="startDate" type="date" value="${options.startDate || ""}" required />
          <label for="endDate">End date *</label>
          <input id="endDate" name="endDate" type="date" value="${options.endDate || ""}" required />
          <label for="status">Request status *</label>
          <select id="status" name="status" required>
            <option value="">Select a status</option>
            <option value="pending" ${options.status === "pending" ? "selected" : ""}>Pending</option>
            <option value="approved" ${options.status === "approved" ? "selected" : ""}>Approved</option>
            <option value="refused" ${options.status === "refused" ? "selected" : ""}>Refused</option>
          </select>
          <button type="submit">Save time off request</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("employeeLeaveForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const start = document.getElementById("startDate").value;
            const end = document.getElementById("endDate").value;
            const result = document.getElementById("result");
            if (start > end) {
              result.textContent = "End date must be on or after start date";
              return;
            }
            const values = ["employee", "department", "leaveType", "startDate", "endDate", "status"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            result.textContent = "Time off request saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    employeeField: page.locator("#employee"),
    departmentField: page.locator("#department"),
    leaveTypeField: page.locator("#leaveType"),
    startDateField: page.locator("#startDate"),
    endDateField: page.locator("#endDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save time off request/i }),
    result: page.locator("#result"),
  };
}

test("loads the employees and time off form", async ({ page }) => {
  const {
    employeeField,
    departmentField,
    leaveTypeField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
  } = await setupEmployeesPage(page);

  await expect(page).toHaveTitle(/Employees and Time Off/i);
  await expect(employeeField).toBeVisible();
  await expect(departmentField).toBeVisible();
  await expect(leaveTypeField).toBeVisible();
  await expect(startDateField).toBeVisible();
  await expect(endDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates an approved annual leave request", async ({ page }) => {
  const {
    employeeField,
    departmentField,
    leaveTypeField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
    result,
  } = await setupEmployeesPage(page);

  await employeeField.fill("Jane Smith");
  await departmentField.fill("Sales");
  await leaveTypeField.selectOption("annual");
  await startDateField.fill("2026-09-14");
  await endDateField.fill("2026-09-18");
  await statusField.selectOption("approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Time off request saved: Jane Smith | Sales | annual | 2026-09-14 | 2026-09-18 | approved",
  );
});

test("requires employee, department, leave type, dates, and status", async ({
  page,
}) => {
  const {
    employeeField,
    departmentField,
    leaveTypeField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
  } = await setupEmployeesPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      employeeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      departmentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      leaveTypeField.evaluate((element) => element.validity.valueMissing),
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
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a time off request whose end date is before its start date", async ({
  page,
}) => {
  const {
    employeeField,
    departmentField,
    leaveTypeField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
    result,
  } = await setupEmployeesPage(page);

  await employeeField.fill("Jane Smith");
  await departmentField.fill("Sales");
  await leaveTypeField.selectOption("annual");
  await startDateField.fill("2026-09-18");
  await endDateField.fill("2026-09-14");
  await statusField.selectOption("pending");
  await submitButton.click();

  await expect(result).toHaveText("End date must be on or after start date");
});

test("approves an existing pending leave request", async ({ page }) => {
  const {
    employeeField,
    departmentField,
    leaveTypeField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
    result,
  } = await setupEmployeesPage(page, {
    employee: "Jane Smith",
    department: "Sales",
    leaveType: "sick",
    startDate: "2026-10-05",
    endDate: "2026-10-06",
    status: "pending",
  });

  await expect(statusField).toHaveValue("pending");
  await statusField.selectOption("approved");
  await submitButton.click();

  await expect(result).toContainText("Jane Smith");
  await expect(result).toContainText("sick");
  await expect(result).toContainText("approved");
});
