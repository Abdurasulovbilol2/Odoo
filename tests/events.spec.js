const { test, expect } = require("@playwright/test");

async function setupEventsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Events | Odoo</title>
      </head>
      <body>
        <h1>Events</h1>
        <form id="eventForm">
          <label for="eventName">Event name *</label>
          <input id="eventName" name="eventName" type="text" value="${options.eventName || ""}" required />

          <label for="eventType">Event type *</label>
          <select id="eventType" name="eventType" required>
            <option value="">Select type</option>
            <option value="Conference" ${options.eventType === "Conference" ? "selected" : ""}>Conference</option>
            <option value="Seminar" ${options.eventType === "Seminar" ? "selected" : ""}>Seminar</option>
            <option value="Workshop" ${options.eventType === "Workshop" ? "selected" : ""}>Workshop</option>
          </select>

          <label for="startDate">Start date *</label>
          <input id="startDate" name="startDate" type="date" value="${options.startDate || ""}" required />

          <label for="endDate">End date *</label>
          <input id="endDate" name="endDate" type="date" value="${options.endDate || ""}" required />

          <label for="location">Location *</label>
          <input id="location" name="location" type="text" value="${options.location || ""}" required />

          <button type="submit">Create event</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("eventForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const start = document.getElementById("startDate").value;
            const end = document.getElementById("endDate").value;
            const result = document.getElementById("result");

            if (start && end && start > end) {
              result.textContent = "End date must be on or after start date";
              return;
            }

            const values = [
              document.getElementById("eventName").value,
              document.getElementById("eventType").value,
              start,
              end,
              document.getElementById("location").value,
            ];
            result.textContent = "Event created: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    eventNameField: page.locator("#eventName"),
    eventTypeField: page.locator("#eventType"),
    startDateField: page.locator("#startDate"),
    endDateField: page.locator("#endDate"),
    locationField: page.locator("#location"),
    submitButton: page.getByRole("button", { name: /create event/i }),
    result: page.locator("#result"),
  };
}

test("loads the events form", async ({ page }) => {
  const {
    eventNameField,
    eventTypeField,
    startDateField,
    endDateField,
    locationField,
    submitButton,
  } = await setupEventsPage(page);

  await expect(page).toHaveTitle(/Events/i);
  await expect(eventNameField).toBeVisible();
  await expect(eventTypeField).toBeVisible();
  await expect(startDateField).toBeVisible();
  await expect(endDateField).toBeVisible();
  await expect(locationField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a conference event", async ({ page }) => {
  const {
    eventNameField,
    eventTypeField,
    startDateField,
    endDateField,
    locationField,
    submitButton,
    result,
  } = await setupEventsPage(page);

  await eventNameField.fill("Odoo Community Days");
  await eventTypeField.selectOption("Conference");
  await startDateField.fill("2026-10-05");
  await endDateField.fill("2026-10-07");
  await locationField.fill("Lisbon");
  await submitButton.click();

  await expect(result).toHaveText(
    "Event created: Odoo Community Days | Conference | 2026-10-05 | 2026-10-07 | Lisbon",
  );
});

test("requires event details before creation", async ({ page }) => {
  const {
    eventNameField,
    eventTypeField,
    startDateField,
    endDateField,
    locationField,
    submitButton,
  } = await setupEventsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      eventNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      eventTypeField.evaluate((element) => element.validity.valueMissing),
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
      locationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects an event with an end date before the start date", async ({
  page,
}) => {
  const {
    eventNameField,
    eventTypeField,
    startDateField,
    endDateField,
    locationField,
    submitButton,
    result,
  } = await setupEventsPage(page);

  await eventNameField.fill("Partner training");
  await eventTypeField.selectOption("Workshop");
  await startDateField.fill("2026-11-12");
  await endDateField.fill("2026-11-10");
  await locationField.fill("Berlin");
  await submitButton.click();

  await expect(result).toHaveText("End date must be on or after start date");
});

test("keeps a pre-filled event schedule", async ({ page }) => {
  const {
    eventNameField,
    eventTypeField,
    startDateField,
    endDateField,
    locationField,
    submitButton,
    result,
  } = await setupEventsPage(page, {
    eventName: "Customer onboarding day",
    eventType: "Seminar",
    startDate: "2026-12-01",
    endDate: "2026-12-02",
    location: "Madrid",
  });

  await expect(eventNameField).toHaveValue("Customer onboarding day");
  await expect(eventTypeField).toHaveValue("Seminar");
  await expect(startDateField).toHaveValue("2026-12-01");
  await expect(endDateField).toHaveValue("2026-12-02");
  await expect(locationField).toHaveValue("Madrid");
  await submitButton.click();

  await expect(result).toContainText("Customer onboarding day");
  await expect(result).toContainText("Seminar");
  await expect(result).toContainText("Madrid");
});
