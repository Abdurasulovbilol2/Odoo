const { test, expect } = require("@playwright/test");

async function setupFleetPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Fleet | Odoo</title>
      </head>
      <body>
        <h1>Fleet</h1>
        <form id="fleetForm">
          <label for="vehicle">Vehicle *</label>
          <input id="vehicle" name="vehicle" type="text" value="${options.vehicle || ""}" required />

          <label for="driver">Driver *</label>
          <input id="driver" name="driver" type="text" value="${options.driver || ""}" required />

          <label for="odometer">Odometer (km) *</label>
          <input id="odometer" name="odometer" type="number" min="0" step="1" value="${options.odometer || ""}" required />

          <label for="serviceDate">Next service date *</label>
          <input id="serviceDate" name="serviceDate" type="date" value="${options.serviceDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Available" ${options.status === "Available" ? "selected" : ""}>Available</option>
            <option value="Assigned" ${options.status === "Assigned" ? "selected" : ""}>Assigned</option>
            <option value="In service" ${options.status === "In service" ? "selected" : ""}>In service</option>
            <option value="Retired" ${options.status === "Retired" ? "selected" : ""}>Retired</option>
          </select>

          <button type="submit">Save vehicle</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("fleetForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("vehicle").value,
              document.getElementById("driver").value,
              document.getElementById("odometer").value,
              document.getElementById("serviceDate").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Vehicle saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    vehicleField: page.locator("#vehicle"),
    driverField: page.locator("#driver"),
    odometerField: page.locator("#odometer"),
    serviceDateField: page.locator("#serviceDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save vehicle/i }),
    result: page.locator("#result"),
  };
}

test("loads the fleet form", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    odometerField,
    serviceDateField,
    statusField,
    submitButton,
  } = await setupFleetPage(page);

  await expect(page).toHaveTitle(/Fleet/i);
  await expect(vehicleField).toBeVisible();
  await expect(driverField).toBeVisible();
  await expect(odometerField).toBeVisible();
  await expect(serviceDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves an assigned fleet vehicle", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    odometerField,
    serviceDateField,
    statusField,
    submitButton,
    result,
  } = await setupFleetPage(page);

  await vehicleField.fill("Toyota Hilux");
  await driverField.fill("Bilol Abdurasulov");
  await odometerField.fill("48250");
  await serviceDateField.fill("2026-10-15");
  await statusField.selectOption("Assigned");
  await submitButton.click();

  await expect(result).toHaveText(
    "Vehicle saved: Toyota Hilux | Bilol Abdurasulov | 48250 | 2026-10-15 | Assigned",
  );
});

test("requires vehicle details before saving", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    odometerField,
    serviceDateField,
    statusField,
    submitButton,
  } = await setupFleetPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      vehicleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      driverField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      odometerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      serviceDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a negative odometer reading", async ({ page }) => {
  const { odometerField } = await setupFleetPage(page);

  await odometerField.fill("-1");
  await expect(odometerField).toHaveJSProperty("validity.valid", false);
  await expect(odometerField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a vehicle marked for service", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    odometerField,
    serviceDateField,
    statusField,
    submitButton,
    result,
  } = await setupFleetPage(page, {
    vehicle: "Ford Transit",
    driver: "Operations Team",
    odometer: "120000",
    serviceDate: "2026-09-30",
    status: "In service",
  });

  await expect(vehicleField).toHaveValue("Ford Transit");
  await expect(driverField).toHaveValue("Operations Team");
  await expect(odometerField).toHaveValue("120000");
  await expect(serviceDateField).toHaveValue("2026-09-30");
  await expect(statusField).toHaveValue("In service");
  await submitButton.click();

  await expect(result).toContainText("Ford Transit");
  await expect(result).toContainText("120000");
  await expect(result).toContainText("In service");
});
