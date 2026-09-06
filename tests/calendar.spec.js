const { test, expect } = require("@playwright/test");

async function setupCalendarPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Calendar | Odoo</title>
      </head>
      <body>
        <h1>Calendar</h1>
        <form id="meetingForm">
          <label for="title">Meeting title *</label>
          <input id="title" name="title" type="text" value="${options.title || ""}" required />

          <label for="attendee">Attendee *</label>
          <input id="attendee" name="attendee" type="email" value="${options.attendee || ""}" required />

          <label for="startDate">Start date *</label>
          <input id="startDate" name="startDate" type="datetime-local" value="${options.startDate || ""}" required />

          <label for="endDate">End date *</label>
          <input id="endDate" name="endDate" type="datetime-local" value="${options.endDate || ""}" required />

          <label for="location">Location</label>
          <input id="location" name="location" type="text" value="${options.location || ""}" />

          <button type="submit">Save meeting</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("meetingForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const title = document.getElementById("title").value;
            const attendee = document.getElementById("attendee").value;
            const start = document.getElementById("startDate").value;
            const end = document.getElementById("endDate").value;
            const result = document.getElementById("result");

            if (start && end && start > end) {
              result.textContent = "End date must be on or after start date";
              return;
            }

            const values = [title, attendee, start, end]
              .join(" | ");
            result.textContent = "Meeting saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    titleField: page.locator("#title"),
    attendeeField: page.locator("#attendee"),
    startDateField: page.locator("#startDate"),
    endDateField: page.locator("#endDate"),
    locationField: page.locator("#location"),
    submitButton: page.getByRole("button", { name: /save meeting/i }),
    result: page.locator("#result"),
  };
}

test("loads the calendar meeting form", async ({ page }) => {
  const {
    titleField,
    attendeeField,
    startDateField,
    endDateField,
    locationField,
    submitButton,
  } = await setupCalendarPage(page);

  await expect(page).toHaveTitle(/Calendar/i);
  await expect(titleField).toBeVisible();
  await expect(attendeeField).toBeVisible();
  await expect(startDateField).toBeVisible();
  await expect(endDateField).toBeVisible();
  await expect(locationField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("schedules a new meeting with attendees and time slot", async ({
  page,
}) => {
  const {
    titleField,
    attendeeField,
    startDateField,
    endDateField,
    submitButton,
    result,
  } = await setupCalendarPage(page);

  await titleField.fill("Q3 planning review");
  await attendeeField.fill("manager@odoo.com");
  await startDateField.fill("2026-09-10T09:00");
  await endDateField.fill("2026-09-10T10:00");
  await submitButton.click();

  await expect(result).toHaveText(
    "Meeting saved: Q3 planning review | manager@odoo.com | 2026-09-10T09:00 | 2026-09-10T10:00",
  );
});

test("requires meeting title, attendee, and time range", async ({ page }) => {
  const {
    titleField,
    attendeeField,
    startDateField,
    endDateField,
    submitButton,
  } = await setupCalendarPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      titleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      attendeeField.evaluate((element) => element.validity.valueMissing),
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
});

test("rejects meetings ending before they start", async ({ page }) => {
  const {
    titleField,
    attendeeField,
    startDateField,
    endDateField,
    submitButton,
    result,
  } = await setupCalendarPage(page);

  await titleField.fill("Customer check-in");
  await attendeeField.fill("customer@odoo.com");
  await startDateField.fill("2026-09-15T16:00");
  await endDateField.fill("2026-09-15T15:30");
  await submitButton.click();

  await expect(result).toHaveText("End date must be on or after start date");
});

test("preserves a pre-filled calendar meeting", async ({ page }) => {
  const {
    titleField,
    attendeeField,
    startDateField,
    endDateField,
    submitButton,
    result,
  } = await setupCalendarPage(page, {
    title: "Leadership sync",
    attendee: "ceo@odoo.com",
    startDate: "2026-09-20T11:00",
    endDate: "2026-09-20T11:30",
    location: "Zoom",
  });

  await expect(titleField).toHaveValue("Leadership sync");
  await expect(attendeeField).toHaveValue("ceo@odoo.com");
  await expect(startDateField).toHaveValue("2026-09-20T11:00");
  await expect(endDateField).toHaveValue("2026-09-20T11:30");
  await submitButton.click();

  await expect(result).toContainText("Leadership sync");
  await expect(result).toContainText("ceo@odoo.com");
  await expect(result).toContainText("2026-09-20T11:30");
});
