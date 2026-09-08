const { test, expect } = require("@playwright/test");

async function setupMaintenancePage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Maintenance | Odoo</title>
      </head>
      <body>
        <h1>Maintenance</h1>
        <form id="maintenanceForm">
          <label for="equipment">Equipment *</label>
          <input id="equipment" name="equipment" type="text" value="${options.equipment || ""}" required />

          <label for="maintenanceType">Maintenance type *</label>
          <select id="maintenanceType" name="maintenanceType" required>
            <option value="">Select type</option>
            <option value="Preventive" ${options.maintenanceType === "Preventive" ? "selected" : ""}>Preventive</option>
            <option value="Corrective" ${options.maintenanceType === "Corrective" ? "selected" : ""}>Corrective</option>
            <option value="Inspection" ${options.maintenanceType === "Inspection" ? "selected" : ""}>Inspection</option>
          </select>

          <label for="responsible">Responsible technician *</label>
          <input id="responsible" name="responsible" type="text" value="${options.responsible || ""}" required />

          <label for="scheduledDate">Scheduled date *</label>
          <input id="scheduledDate" name="scheduledDate" type="date" value="${options.scheduledDate || ""}" required />

          <label for="cost">Estimated cost *</label>
          <input id="cost" name="cost" type="number" min="0.01" step="0.01" value="${options.cost || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="New" ${options.status === "New" ? "selected" : ""}>New</option>
            <option value="In progress" ${options.status === "In progress" ? "selected" : ""}>In progress</option>
            <option value="Completed" ${options.status === "Completed" ? "selected" : ""}>Completed</option>
            <option value="Cancelled" ${options.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>

          <button type="submit">Save maintenance request</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("maintenanceForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("equipment").value,
              document.getElementById("maintenanceType").value,
              document.getElementById("responsible").value,
              document.getElementById("scheduledDate").value,
              document.getElementById("cost").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Maintenance saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    equipmentField: page.locator("#equipment"),
    maintenanceTypeField: page.locator("#maintenanceType"),
    responsibleField: page.locator("#responsible"),
    scheduledDateField: page.locator("#scheduledDate"),
    costField: page.locator("#cost"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", {
      name: /save maintenance request/i,
    }),
    result: page.locator("#result"),
  };
}

test("loads the maintenance form", async ({ page }) => {
  const {
    equipmentField,
    maintenanceTypeField,
    responsibleField,
    scheduledDateField,
    costField,
    statusField,
    submitButton,
  } = await setupMaintenancePage(page);

  await expect(page).toHaveTitle(/Maintenance/i);
  await expect(equipmentField).toBeVisible();
  await expect(maintenanceTypeField).toBeVisible();
  await expect(responsibleField).toBeVisible();
  await expect(scheduledDateField).toBeVisible();
  await expect(costField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a preventive maintenance request", async ({ page }) => {
  const {
    equipmentField,
    maintenanceTypeField,
    responsibleField,
    scheduledDateField,
    costField,
    statusField,
    submitButton,
    result,
  } = await setupMaintenancePage(page);

  await equipmentField.fill("HVAC Unit A");
  await maintenanceTypeField.selectOption("Preventive");
  await responsibleField.fill("Facilities Team");
  await scheduledDateField.fill("2026-10-01");
  await costField.fill("350.00");
  await statusField.selectOption("New");
  await submitButton.click();

  await expect(result).toHaveText(
    "Maintenance saved: HVAC Unit A | Preventive | Facilities Team | 2026-10-01 | 350.00 | New",
  );
});

test("requires maintenance details before saving", async ({ page }) => {
  const {
    equipmentField,
    maintenanceTypeField,
    responsibleField,
    scheduledDateField,
    costField,
    statusField,
    submitButton,
  } = await setupMaintenancePage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      equipmentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      maintenanceTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      responsibleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      scheduledDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      costField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a maintenance cost below one cent", async ({ page }) => {
  const { costField } = await setupMaintenancePage(page);

  await costField.fill("0");
  await expect(costField).toHaveJSProperty("validity.valid", false);
  await expect(costField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a completed maintenance request", async ({ page }) => {
  const {
    equipmentField,
    maintenanceTypeField,
    responsibleField,
    scheduledDateField,
    costField,
    statusField,
    submitButton,
    result,
  } = await setupMaintenancePage(page, {
    equipment: "Packaging Line 2",
    maintenanceType: "Corrective",
    responsible: "Engineering Team",
    scheduledDate: "2026-09-05",
    cost: "1250.50",
    status: "Completed",
  });

  await expect(equipmentField).toHaveValue("Packaging Line 2");
  await expect(maintenanceTypeField).toHaveValue("Corrective");
  await expect(responsibleField).toHaveValue("Engineering Team");
  await expect(scheduledDateField).toHaveValue("2026-09-05");
  await expect(costField).toHaveValue("1250.50");
  await expect(statusField).toHaveValue("Completed");
  await submitButton.click();

  await expect(result).toContainText("Packaging Line 2");
  await expect(result).toContainText("1250.50");
  await expect(result).toContainText("Completed");
});
