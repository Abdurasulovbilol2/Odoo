const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupMaintenanceRequestsPage(page, options = {}) {
  const safeOptions = {
    equipment: escapeHtml(options.equipment),
    requestor: escapeHtml(options.requestor),
    department: escapeHtml(options.department),
    issue: escapeHtml(options.issue),
    dueDate: escapeHtml(options.dueDate),
    priority: escapeHtml(options.priority),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Maintenance Requests | Odoo</title>
      </head>
      <body>
        <h1>Maintenance Requests</h1>
        <form id="maintenanceRequestForm">
          <label for="equipment">Equipment *</label>
          <input id="equipment" name="equipment" type="text" value="${safeOptions.equipment || ""}" required />

          <label for="requestor">Requestor *</label>
          <input id="requestor" name="requestor" type="text" value="${safeOptions.requestor || ""}" required />

          <label for="department">Department *</label>
          <input id="department" name="department" type="text" value="${safeOptions.department || ""}" required />

          <label for="issue">Issue description *</label>
          <textarea id="issue" name="issue" required>${safeOptions.issue || ""}</textarea>

          <label for="dueDate">Due date *</label>
          <input id="dueDate" name="dueDate" type="date" value="${safeOptions.dueDate || ""}" required />

          <label for="priority">Priority *</label>
          <select id="priority" name="priority" required>
            <option value="">Select priority</option>
            <option value="Low" ${safeOptions.priority === "Low" ? "selected" : ""}>Low</option>
            <option value="Medium" ${safeOptions.priority === "Medium" ? "selected" : ""}>Medium</option>
            <option value="High" ${safeOptions.priority === "High" ? "selected" : ""}>High</option>
            <option value="Critical" ${safeOptions.priority === "Critical" ? "selected" : ""}>Critical</option>
          </select>

          <button type="submit">Submit request</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("maintenanceRequestForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const equipment = document.getElementById("equipment").value;
            const requestor = document.getElementById("requestor").value;
            const department = document.getElementById("department").value;
            const issue = document.getElementById("issue").value;
            const dueDate = document.getElementById("dueDate").value;
            const priority = document.getElementById("priority").value;
            const result = document.getElementById("result");

            result.textContent = "Maintenance request submitted: " + [equipment, requestor, department, issue, dueDate, priority].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    equipmentField: page.locator("#equipment"),
    requestorField: page.locator("#requestor"),
    departmentField: page.locator("#department"),
    issueField: page.locator("#issue"),
    dueDateField: page.locator("#dueDate"),
    priorityField: page.locator("#priority"),
    submitButton: page.getByRole("button", { name: /submit request/i }),
    result: page.locator("#result"),
  };
}

test("loads the maintenance requests form", async ({ page }) => {
  const {
    equipmentField,
    requestorField,
    departmentField,
    issueField,
    dueDateField,
    priorityField,
    submitButton,
  } = await setupMaintenanceRequestsPage(page);

  await expect(page).toHaveTitle(/Maintenance Requests/i);
  await expect(equipmentField).toBeVisible();
  await expect(requestorField).toBeVisible();
  await expect(departmentField).toBeVisible();
  await expect(issueField).toBeVisible();
  await expect(dueDateField).toBeVisible();
  await expect(priorityField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("submits a valid maintenance request", async ({ page }) => {
  const {
    equipmentField,
    requestorField,
    departmentField,
    issueField,
    dueDateField,
    priorityField,
    submitButton,
    result,
  } = await setupMaintenanceRequestsPage(page);

  await equipmentField.fill("Compressor-02");
  await requestorField.fill("Mavluda Karimova");
  await departmentField.fill("Production");
  await issueField.fill("Cooling fan makes a grinding noise");
  await dueDateField.fill("2026-09-22");
  await priorityField.selectOption("High");
  await submitButton.click();

  await expect(result).toHaveText(
    "Maintenance request submitted: Compressor-02 | Mavluda Karimova | Production | Cooling fan makes a grinding noise | 2026-09-22 | High",
  );
});

test("requires maintenance request details before saving", async ({ page }) => {
  const {
    equipmentField,
    requestorField,
    departmentField,
    issueField,
    dueDateField,
    priorityField,
    submitButton,
  } = await setupMaintenanceRequestsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      equipmentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      requestorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      departmentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      issueField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      dueDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      priorityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("requires an issue description before submission", async ({ page }) => {
  const {
    equipmentField,
    requestorField,
    departmentField,
    issueField,
    dueDateField,
    priorityField,
    submitButton,
  } = await setupMaintenanceRequestsPage(page);

  await equipmentField.fill("Boiler-7");
  await requestorField.fill("Komila Rustamova");
  await departmentField.fill("Facilities");
  await dueDateField.fill("2026-09-24");
  await priorityField.selectOption("Critical");
  await submitButton.click();

  await expect(
    issueField.evaluate((element) => element.validity.valueMissing),
  ).resolves.toBeTruthy();
});

test("keeps a pre-filled maintenance request", async ({ page }) => {
  const {
    equipmentField,
    requestorField,
    departmentField,
    issueField,
    dueDateField,
    priorityField,
    submitButton,
    result,
  } = await setupMaintenanceRequestsPage(page, {
    equipment: "Generator-5",
    requestor: "Farhod Aliyev",
    department: "Utilities",
    issue: 'Leak near intake valve "main"',
    dueDate: "2026-09-26",
    priority: "Critical",
  });

  await expect(equipmentField).toHaveValue("Generator-5");
  await expect(requestorField).toHaveValue("Farhod Aliyev");
  await expect(departmentField).toHaveValue("Utilities");
  await expect(issueField).toHaveValue('Leak near intake valve "main"');
  await expect(dueDateField).toHaveValue("2026-09-26");
  await expect(priorityField).toHaveValue("Critical");
  await submitButton.click();

  await expect(result).toContainText("Generator-5");
  await expect(result).toContainText("Utilities");
  await expect(result).toContainText("Critical");
});
