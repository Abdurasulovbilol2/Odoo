const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupFleetOperationsPage(page, options = {}) {
  const safeOptions = {
    vehicle: escapeHtml(options.vehicle),
    driver: escapeHtml(options.driver),
    route: escapeHtml(options.route),
    startTime: escapeHtml(options.startTime),
    endTime: escapeHtml(options.endTime),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Fleet Operations | Odoo</title>
      </head>
      <body>
        <h1>Fleet Operations</h1>
        <form id="fleetForm">
          <label for="vehicle">Vehicle *</label>
          <input id="vehicle" name="vehicle" type="text" value="${safeOptions.vehicle || ""}" required />

          <label for="driver">Driver *</label>
          <input id="driver" name="driver" type="text" value="${safeOptions.driver || ""}" required />

          <label for="route">Route *</label>
          <input id="route" name="route" type="text" value="${safeOptions.route || ""}" required />

          <label for="startTime">Start time *</label>
          <input id="startTime" name="startTime" type="datetime-local" value="${safeOptions.startTime || ""}" required />

          <label for="endTime">End time *</label>
          <input id="endTime" name="endTime" type="datetime-local" value="${safeOptions.endTime || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Planned" ${safeOptions.status === "Planned" ? "selected" : ""}>Planned</option>
            <option value="In Progress" ${safeOptions.status === "In Progress" ? "selected" : ""}>In Progress</option>
            <option value="Completed" ${safeOptions.status === "Completed" ? "selected" : ""}>Completed</option>
          </select>

          <button type="submit">Save trip</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("fleetForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const vehicle = document.getElementById("vehicle").value;
            const driver = document.getElementById("driver").value;
            const route = document.getElementById("route").value;
            const startTime = document.getElementById("startTime").value;
            const endTime = document.getElementById("endTime").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (startTime && endTime && startTime > endTime) {
              result.textContent = "End time must be on or after start time";
              return;
            }

            result.textContent = "Trip saved: " + [vehicle, driver, route, startTime, endTime, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    vehicleField: page.locator("#vehicle"),
    driverField: page.locator("#driver"),
    routeField: page.locator("#route"),
    startTimeField: page.locator("#startTime"),
    endTimeField: page.locator("#endTime"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save trip/i }),
    result: page.locator("#result"),
  };
}

test("loads the fleet operations form", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    routeField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
  } = await setupFleetOperationsPage(page);

  await expect(page).toHaveTitle(/Fleet Operations/i);
  await expect(vehicleField).toBeVisible();
  await expect(driverField).toBeVisible();
  await expect(routeField).toBeVisible();
  await expect(startTimeField).toBeVisible();
  await expect(endTimeField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid fleet trip", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    routeField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
    result,
  } = await setupFleetOperationsPage(page);

  await vehicleField.fill("Truck-14");
  await driverField.fill("Elyor Sadikov");
  await routeField.fill("Tashkent to Samarkand");
  await startTimeField.fill("2026-09-18T08:00");
  await endTimeField.fill("2026-09-18T16:30");
  await statusField.selectOption("In Progress");
  await submitButton.click();

  await expect(result).toHaveText(
    "Trip saved: Truck-14 | Elyor Sadikov | Tashkent to Samarkand | 2026-09-18T08:00 | 2026-09-18T16:30 | In Progress",
  );
});

test("requires trip details before saving", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    routeField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
  } = await setupFleetOperationsPage(page);

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
      routeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      startTimeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      endTimeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a trip ending before it starts", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    routeField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
    result,
  } = await setupFleetOperationsPage(page);

  await vehicleField.fill("Van-9");
  await driverField.fill("Shavkat Olimov");
  await routeField.fill("Bukhara to Khiva");
  await startTimeField.fill("2026-09-19T18:00");
  await endTimeField.fill("2026-09-19T17:45");
  await statusField.selectOption("Planned");
  await submitButton.click();

  await expect(result).toHaveText("End time must be on or after start time");
});

test("keeps a pre-filled fleet trip", async ({ page }) => {
  const {
    vehicleField,
    driverField,
    routeField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
    result,
  } = await setupFleetOperationsPage(page, {
    vehicle: "Car-2",
    driver: "Karim Boboyev",
    route: "Office to Depot",
    startTime: "2026-09-20T09:15",
    endTime: "2026-09-20T10:00",
    status: "Completed",
  });

  await expect(vehicleField).toHaveValue("Car-2");
  await expect(driverField).toHaveValue("Karim Boboyev");
  await expect(routeField).toHaveValue("Office to Depot");
  await expect(startTimeField).toHaveValue("2026-09-20T09:15");
  await expect(endTimeField).toHaveValue("2026-09-20T10:00");
  await expect(statusField).toHaveValue("Completed");
  await submitButton.click();

  await expect(result).toContainText("Car-2");
  await expect(result).toContainText("Karim Boboyev");
  await expect(result).toContainText("Completed");
});
