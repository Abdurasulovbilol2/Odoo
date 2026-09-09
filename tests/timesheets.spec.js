const { test, expect } = require("@playwright/test");

async function setupTimesheetsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Timesheets | Odoo</title>
      </head>
      <body>
        <h1>Timesheets</h1>
        <form id="timesheetForm">
          <label for="employee">Employee *</label>
          <input id="employee" name="employee" type="text" value="${options.employee || ""}" required />

          <label for="project">Project *</label>
          <input id="project" name="project" type="text" value="${options.project || ""}" required />

          <label for="task">Task *</label>
          <input id="task" name="task" type="text" value="${options.task || ""}" required />

          <label for="workDate">Work date *</label>
          <input id="workDate" name="workDate" type="date" value="${options.workDate || ""}" required />

          <label for="hours">Hours *</label>
          <input id="hours" name="hours" type="number" min="0.01" step="0.01" value="${options.hours || ""}" required />

          <label for="billable">Billable status *</label>
          <select id="billable" name="billable" required>
            <option value="">Select billable status</option>
            <option value="Billable" ${options.billable === "Billable" ? "selected" : ""}>Billable</option>
            <option value="Non-billable" ${options.billable === "Non-billable" ? "selected" : ""}>Non-billable</option>
          </select>

          <button type="submit">Save timesheet</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("timesheetForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("employee").value,
              document.getElementById("project").value,
              document.getElementById("task").value,
              document.getElementById("workDate").value,
              document.getElementById("hours").value,
              document.getElementById("billable").value,
            ];
            document.getElementById("result").textContent = "Timesheet saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    employeeField: page.locator("#employee"),
    projectField: page.locator("#project"),
    taskField: page.locator("#task"),
    workDateField: page.locator("#workDate"),
    hoursField: page.locator("#hours"),
    billableField: page.locator("#billable"),
    submitButton: page.getByRole("button", { name: /save timesheet/i }),
    result: page.locator("#result"),
  };
}

test("loads the timesheets form", async ({ page }) => {
  const {
    employeeField,
    projectField,
    taskField,
    workDateField,
    hoursField,
    billableField,
    submitButton,
  } = await setupTimesheetsPage(page);

  await expect(page).toHaveTitle(/Timesheets/i);
  await expect(employeeField).toBeVisible();
  await expect(projectField).toBeVisible();
  await expect(taskField).toBeVisible();
  await expect(workDateField).toBeVisible();
  await expect(hoursField).toBeVisible();
  await expect(billableField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a billable project timesheet", async ({ page }) => {
  const {
    employeeField,
    projectField,
    taskField,
    workDateField,
    hoursField,
    billableField,
    submitButton,
    result,
  } = await setupTimesheetsPage(page);

  await employeeField.fill("Bilol Abdurasulov");
  await projectField.fill("Website rollout");
  await taskField.fill("Configure checkout");
  await workDateField.fill("2026-09-09");
  await hoursField.fill("6.5");
  await billableField.selectOption("Billable");
  await submitButton.click();

  await expect(result).toHaveText(
    "Timesheet saved: Bilol Abdurasulov | Website rollout | Configure checkout | 2026-09-09 | 6.5 | Billable",
  );
});

test("requires timesheet details before saving", async ({ page }) => {
  const {
    employeeField,
    projectField,
    taskField,
    workDateField,
    hoursField,
    billableField,
    submitButton,
  } = await setupTimesheetsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      employeeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      projectField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      taskField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      workDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      hoursField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      billableField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero timesheet hours", async ({ page }) => {
  const { hoursField } = await setupTimesheetsPage(page);

  await hoursField.fill("0");
  await expect(hoursField).toHaveJSProperty("validity.valid", false);
  await expect(hoursField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a pre-filled non-billable timesheet", async ({ page }) => {
  const {
    employeeField,
    projectField,
    taskField,
    workDateField,
    hoursField,
    billableField,
    submitButton,
    result,
  } = await setupTimesheetsPage(page, {
    employee: "Operations Team",
    project: "Internal automation",
    task: "Process documentation",
    workDate: "2026-09-08",
    hours: "2.25",
    billable: "Non-billable",
  });

  await expect(employeeField).toHaveValue("Operations Team");
  await expect(projectField).toHaveValue("Internal automation");
  await expect(taskField).toHaveValue("Process documentation");
  await expect(workDateField).toHaveValue("2026-09-08");
  await expect(hoursField).toHaveValue("2.25");
  await expect(billableField).toHaveValue("Non-billable");
  await submitButton.click();

  await expect(result).toContainText("Internal automation");
  await expect(result).toContainText("2.25");
  await expect(result).toContainText("Non-billable");
});
