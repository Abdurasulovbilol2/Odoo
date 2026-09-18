const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupVehicleInspectionsPage(page, options = {}) {
  const safeOptions = {
    vehicle: escapeHtml(options.vehicle),
    inspector: escapeHtml(options.inspector),
    inspectionType: escapeHtml(options.inspectionType),
    inspectionDate: escapeHtml(options.inspectionDate),
    mileage: escapeHtml(options.mileage),
    result: escapeHtml(options.result),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Vehicle Inspections | Odoo</title>
      </head>
      <body>
        <h1>Vehicle Inspections</h1>
        <form id="inspectionForm">
          <label for="vehicle">Vehicle *</label>
          <input id="vehicle" name="vehicle" type="text" value="${safeOptions.vehicle || ""}" required />

          <label for="inspector">Inspector *</label>
          <input id="inspector" name="inspector" type="text" value="${safeOptions.inspector || ""}" required />

          <label for="inspectionType">Inspection type *</label>
          <select id="inspectionType" name="inspectionType" required>
            <option value="">Select inspection type</option>
            <option value="Routine" ${safeOptions.inspectionType === "Routine" ? "selected" : ""}>Routine</option>
            <option value="Safety" ${safeOptions.inspectionType === "Safety" ? "selected" : ""}>Safety</option>
            <option value="Pre-trip" ${safeOptions.inspectionType === "Pre-trip" ? "selected" : ""}>Pre-trip</option>
            <option value="Annual" ${safeOptions.inspectionType === "Annual" ? "selected" : ""}>Annual</option>
          </select>

          <label for="inspectionDate">Inspection date *</label>
          <input id="inspectionDate" name="inspectionDate" type="date" value="${safeOptions.inspectionDate || ""}" required />

          <label for="mileage">Mileage (km) *</label>
          <input id="mileage" name="mileage" type="number" step="1" value="${safeOptions.mileage || ""}" required />

          <label for="result">Inspection result *</label>
          <select id="result" name="result" required>
            <option value="">Select result</option>
            <option value="Pass" ${safeOptions.result === "Pass" ? "selected" : ""}>Pass</option>
            <option value="Pass with notes" ${safeOptions.result === "Pass with notes" ? "selected" : ""}>Pass with notes</option>
            <option value="Fail" ${safeOptions.result === "Fail" ? "selected" : ""}>Fail</option>
          </select>

          <button type="submit">Save inspection</button>
        </form>
        <div id="resultMessage" role="status"></div>
        <script>
          document.getElementById("inspectionForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const vehicle = document.getElementById("vehicle").value;
            const inspector = document.getElementById("inspector").value;
            const inspectionType = document.getElementById("inspectionType").value;
            const inspectionDate = document.getElementById("inspectionDate").value;
            const mileage = document.getElementById("mileage").value;
            const inspectionResult = document.getElementById("result").value;
            const resultMessage = document.getElementById("resultMessage");

            if (Number(mileage) < 0) {
              resultMessage.textContent = "Mileage cannot be negative";
              return;
            }

            resultMessage.textContent = "Inspection saved: " + [vehicle, inspector, inspectionType, inspectionDate, mileage, inspectionResult].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    vehicleField: page.locator("#vehicle"),
    inspectorField: page.locator("#inspector"),
    inspectionTypeField: page.locator("#inspectionType"),
    inspectionDateField: page.locator("#inspectionDate"),
    mileageField: page.locator("#mileage"),
    resultField: page.locator("#result"),
    submitButton: page.getByRole("button", { name: /save inspection/i }),
    resultMessage: page.locator("#resultMessage"),
  };
}

test("loads the vehicle inspections form", async ({ page }) => {
  const {
    vehicleField,
    inspectorField,
    inspectionTypeField,
    inspectionDateField,
    mileageField,
    resultField,
    submitButton,
  } = await setupVehicleInspectionsPage(page);

  await expect(page).toHaveTitle(/Vehicle Inspections/i);
  await expect(vehicleField).toBeVisible();
  await expect(inspectorField).toBeVisible();
  await expect(inspectionTypeField).toBeVisible();
  await expect(inspectionDateField).toBeVisible();
  await expect(mileageField).toBeVisible();
  await expect(resultField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid vehicle inspection", async ({ page }) => {
  const {
    vehicleField,
    inspectorField,
    inspectionTypeField,
    inspectionDateField,
    mileageField,
    resultField,
    submitButton,
    resultMessage,
  } = await setupVehicleInspectionsPage(page);

  await vehicleField.fill("Truck-18");
  await inspectorField.fill("Olimjon Karimov");
  await inspectionTypeField.selectOption("Safety");
  await inspectionDateField.fill("2026-09-22");
  await mileageField.fill("84210");
  await resultField.selectOption("Pass with notes");
  await submitButton.click();

  await expect(resultMessage).toHaveText(
    "Inspection saved: Truck-18 | Olimjon Karimov | Safety | 2026-09-22 | 84210 | Pass with notes",
  );
});

test("requires inspection details before saving", async ({ page }) => {
  const {
    vehicleField,
    inspectorField,
    inspectionTypeField,
    inspectionDateField,
    mileageField,
    resultField,
    submitButton,
  } = await setupVehicleInspectionsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      vehicleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      inspectorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      inspectionTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      inspectionDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      mileageField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      resultField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects negative mileage", async ({ page }) => {
  const {
    vehicleField,
    inspectorField,
    inspectionTypeField,
    inspectionDateField,
    mileageField,
    resultField,
    submitButton,
    resultMessage,
  } = await setupVehicleInspectionsPage(page);

  await vehicleField.fill("Van-04");
  await inspectorField.fill("Nodira Xasanova");
  await inspectionTypeField.selectOption("Routine");
  await inspectionDateField.fill("2026-09-24");
  await mileageField.fill("-10");
  await resultField.selectOption("Fail");
  await submitButton.click();

  await expect(resultMessage).toHaveText("Mileage cannot be negative");
});

test("keeps a pre-filled vehicle inspection", async ({ page }) => {
  const {
    vehicleField,
    inspectorField,
    inspectionTypeField,
    inspectionDateField,
    mileageField,
    resultField,
    submitButton,
    resultMessage,
  } = await setupVehicleInspectionsPage(page, {
    vehicle: "Sedan-07",
    inspector: "Rustam Aliyev",
    inspectionType: "Annual",
    inspectionDate: "2026-09-28",
    mileage: "45200",
    result: "Pass",
  });

  await expect(vehicleField).toHaveValue("Sedan-07");
  await expect(inspectorField).toHaveValue("Rustam Aliyev");
  await expect(inspectionTypeField).toHaveValue("Annual");
  await expect(inspectionDateField).toHaveValue("2026-09-28");
  await expect(mileageField).toHaveValue("45200");
  await expect(resultField).toHaveValue("Pass");
  await submitButton.click();

  await expect(resultMessage).toContainText("Sedan-07");
  await expect(resultMessage).toContainText("Rustam Aliyev");
  await expect(resultMessage).toContainText("Pass");
});
