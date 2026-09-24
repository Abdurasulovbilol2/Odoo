const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupStockLocationsPage(page, options = {}) {
  const safeOptions = {
    locationName: escapeHtml(options.locationName),
    zone: escapeHtml(options.zone),
    aisle: escapeHtml(options.aisle),
    capacity: escapeHtml(options.capacity),
    temperature: escapeHtml(options.temperature),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Stock Locations | Odoo</title>
      </head>
      <body>
        <h1>Stock Locations</h1>
        <form id="locationForm">
          <label for="locationName">Location name *</label>
          <input id="locationName" name="locationName" type="text" value="${safeOptions.locationName || ""}" required />

          <label for="zone">Zone *</label>
          <select id="zone" name="zone" required>
            <option value="">Select zone</option>
            <option value="Receiving" ${safeOptions.zone === "Receiving" ? "selected" : ""}>Receiving</option>
            <option value="Storage" ${safeOptions.zone === "Storage" ? "selected" : ""}>Storage</option>
            <option value="Cold Chain" ${safeOptions.zone === "Cold Chain" ? "selected" : ""}>Cold Chain</option>
            <option value="Quarantine" ${safeOptions.zone === "Quarantine" ? "selected" : ""}>Quarantine</option>
          </select>

          <label for="aisle">Aisle *</label>
          <input id="aisle" name="aisle" type="text" value="${safeOptions.aisle || ""}" required />

          <label for="capacity">Capacity *</label>
          <input id="capacity" name="capacity" type="number" step="0.01" value="${safeOptions.capacity || ""}" required />

          <label for="temperature">Temperature (°C) *</label>
          <input id="temperature" name="temperature" type="number" step="0.1" value="${safeOptions.temperature || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Active" ${safeOptions.status === "Active" ? "selected" : ""}>Active</option>
            <option value="Reserved" ${safeOptions.status === "Reserved" ? "selected" : ""}>Reserved</option>
            <option value="Blocked" ${safeOptions.status === "Blocked" ? "selected" : ""}>Blocked</option>
          </select>

          <button type="submit">Save location</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("locationForm").addEventListener("submit", (event) => {
            event.preventDefault();

            const locationName = document.getElementById("locationName").value.trim();
            const zone = document.getElementById("zone").value;
            const aisle = document.getElementById("aisle").value.trim();
            const capacity = Number(document.getElementById("capacity").value);
            const temperature = Number(document.getElementById("temperature").value);
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (capacity <= 0) {
              result.textContent = "Capacity must be greater than zero";
              return;
            }

            if (zone === "Cold Chain" && temperature > 5) {
              result.textContent = "Cold chain locations must stay at 5°C or below";
              return;
            }

            result.textContent = "Location saved: " + [locationName, zone, aisle, capacity.toFixed(2), temperature.toFixed(1), status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    locationNameField: page.locator("#locationName"),
    zoneField: page.locator("#zone"),
    aisleField: page.locator("#aisle"),
    capacityField: page.locator("#capacity"),
    temperatureField: page.locator("#temperature"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save location/i }),
    result: page.locator("#result"),
  };
}

test("loads the stock location form", async ({ page }) => {
  const {
    locationNameField,
    zoneField,
    aisleField,
    capacityField,
    temperatureField,
    statusField,
    submitButton,
  } = await setupStockLocationsPage(page);

  await expect(page).toHaveTitle(/Stock Locations/i);
  await expect(locationNameField).toBeVisible();
  await expect(zoneField).toBeVisible();
  await expect(aisleField).toBeVisible();
  await expect(capacityField).toBeVisible();
  await expect(temperatureField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a valid stock location", async ({ page }) => {
  const {
    locationNameField,
    zoneField,
    aisleField,
    capacityField,
    temperatureField,
    statusField,
    submitButton,
    result,
  } = await setupStockLocationsPage(page);

  await locationNameField.fill("Rack-12A");
  await zoneField.selectOption("Storage");
  await aisleField.fill("A-12");
  await capacityField.fill("220");
  await temperatureField.fill("18");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Location saved: Rack-12A | Storage | A-12 | 220.00 | 18.0 | Active",
  );
});

test("requires all location details before saving", async ({ page }) => {
  const {
    locationNameField,
    zoneField,
    aisleField,
    capacityField,
    temperatureField,
    statusField,
    submitButton,
  } = await setupStockLocationsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      locationNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      zoneField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      aisleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      capacityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      temperatureField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects invalid capacity values", async ({ page }) => {
  const {
    locationNameField,
    zoneField,
    aisleField,
    capacityField,
    temperatureField,
    statusField,
    submitButton,
    result,
  } = await setupStockLocationsPage(page);

  await locationNameField.fill("Cold Bay 3");
  await zoneField.selectOption("Cold Chain");
  await aisleField.fill("C-03");
  await capacityField.fill("0");
  await temperatureField.fill("4");
  await statusField.selectOption("Reserved");
  await submitButton.click();

  await expect(result).toHaveText("Capacity must be greater than zero");
});

test("keeps a pre-filled stock location", async ({ page }) => {
  const {
    locationNameField,
    zoneField,
    aisleField,
    capacityField,
    temperatureField,
    statusField,
    submitButton,
    result,
  } = await setupStockLocationsPage(page, {
    locationName: 'Cold Room "West"',
    zone: "Cold Chain",
    aisle: "W-09",
    capacity: "90",
    temperature: "3.5",
    status: "Active",
  });

  await expect(locationNameField).toHaveValue('Cold Room "West"');
  await expect(zoneField).toHaveValue("Cold Chain");
  await expect(aisleField).toHaveValue("W-09");
  await expect(capacityField).toHaveValue("90");
  await expect(temperatureField).toHaveValue("3.5");
  await expect(statusField).toHaveValue("Active");

  await submitButton.click();

  await expect(result).toContainText('Cold Room "West"');
  await expect(result).toContainText("Cold Chain");
  await expect(result).toContainText("90.00");
});
