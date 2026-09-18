const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupServiceAppointmentsPage(page, options = {}) {
  const safeOptions = {
    customer: escapeHtml(options.customer),
    service: escapeHtml(options.service),
    specialist: escapeHtml(options.specialist),
    appointmentDate: escapeHtml(options.appointmentDate),
    startTime: escapeHtml(options.startTime),
    endTime: escapeHtml(options.endTime),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Service Appointments | Odoo</title>
      </head>
      <body>
        <h1>Service Appointments</h1>
        <form id="appointmentForm">
          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${safeOptions.customer || ""}" required />

          <label for="service">Service *</label>
          <input id="service" name="service" type="text" value="${safeOptions.service || ""}" required />

          <label for="specialist">Specialist *</label>
          <input id="specialist" name="specialist" type="text" value="${safeOptions.specialist || ""}" required />

          <label for="appointmentDate">Appointment date *</label>
          <input id="appointmentDate" name="appointmentDate" type="date" value="${safeOptions.appointmentDate || ""}" required />

          <label for="startTime">Start time *</label>
          <input id="startTime" name="startTime" type="time" value="${safeOptions.startTime || ""}" required />

          <label for="endTime">End time *</label>
          <input id="endTime" name="endTime" type="time" value="${safeOptions.endTime || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Requested" ${safeOptions.status === "Requested" ? "selected" : ""}>Requested</option>
            <option value="Confirmed" ${safeOptions.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="Completed" ${safeOptions.status === "Completed" ? "selected" : ""}>Completed</option>
            <option value="Cancelled" ${safeOptions.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>

          <button type="submit">Save appointment</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("appointmentForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const customer = document.getElementById("customer").value;
            const service = document.getElementById("service").value;
            const specialist = document.getElementById("specialist").value;
            const appointmentDate = document.getElementById("appointmentDate").value;
            const startTime = document.getElementById("startTime").value;
            const endTime = document.getElementById("endTime").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (startTime && endTime && startTime >= endTime) {
              result.textContent = "End time must be after start time";
              return;
            }

            result.textContent = "Appointment saved: " + [customer, service, specialist, appointmentDate, startTime, endTime, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customer"),
    serviceField: page.locator("#service"),
    specialistField: page.locator("#specialist"),
    appointmentDateField: page.locator("#appointmentDate"),
    startTimeField: page.locator("#startTime"),
    endTimeField: page.locator("#endTime"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save appointment/i }),
    result: page.locator("#result"),
  };
}

test("loads the service appointments form", async ({ page }) => {
  const {
    customerField,
    serviceField,
    specialistField,
    appointmentDateField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
  } = await setupServiceAppointmentsPage(page);

  await expect(page).toHaveTitle(/Service Appointments/i);
  await expect(customerField).toBeVisible();
  await expect(serviceField).toBeVisible();
  await expect(specialistField).toBeVisible();
  await expect(appointmentDateField).toBeVisible();
  await expect(startTimeField).toBeVisible();
  await expect(endTimeField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid service appointment", async ({ page }) => {
  const {
    customerField,
    serviceField,
    specialistField,
    appointmentDateField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
    result,
  } = await setupServiceAppointmentsPage(page);

  await customerField.fill("Laylo Mirzaeva");
  await serviceField.fill("Annual equipment inspection");
  await specialistField.fill("Bekzod Rakhimov");
  await appointmentDateField.fill("2026-09-22");
  await startTimeField.fill("09:30");
  await endTimeField.fill("11:00");
  await statusField.selectOption("Confirmed");
  await submitButton.click();

  await expect(result).toHaveText(
    "Appointment saved: Laylo Mirzaeva | Annual equipment inspection | Bekzod Rakhimov | 2026-09-22 | 09:30 | 11:00 | Confirmed",
  );
});

test("requires appointment details before saving", async ({ page }) => {
  const {
    customerField,
    serviceField,
    specialistField,
    appointmentDateField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
  } = await setupServiceAppointmentsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      serviceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      specialistField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      appointmentDateField.evaluate((element) => element.validity.valueMissing),
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

test("rejects an appointment with an invalid time range", async ({ page }) => {
  const {
    customerField,
    serviceField,
    specialistField,
    appointmentDateField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
    result,
  } = await setupServiceAppointmentsPage(page);

  await customerField.fill("Sardor Yusupov");
  await serviceField.fill("Safety consultation");
  await specialistField.fill("Madina Tursunova");
  await appointmentDateField.fill("2026-09-24");
  await startTimeField.fill("15:00");
  await endTimeField.fill("15:00");
  await statusField.selectOption("Requested");
  await submitButton.click();

  await expect(result).toHaveText("End time must be after start time");
});

test("keeps a pre-filled service appointment", async ({ page }) => {
  const {
    customerField,
    serviceField,
    specialistField,
    appointmentDateField,
    startTimeField,
    endTimeField,
    statusField,
    submitButton,
    result,
  } = await setupServiceAppointmentsPage(page, {
    customer: "Nova Textiles",
    service: 'Calibration review "Q4"',
    specialist: "Kamron Sobirov",
    appointmentDate: "2026-09-26",
    startTime: "13:15",
    endTime: "14:45",
    status: "Completed",
  });

  await expect(customerField).toHaveValue("Nova Textiles");
  await expect(serviceField).toHaveValue('Calibration review "Q4"');
  await expect(specialistField).toHaveValue("Kamron Sobirov");
  await expect(appointmentDateField).toHaveValue("2026-09-26");
  await expect(startTimeField).toHaveValue("13:15");
  await expect(endTimeField).toHaveValue("14:45");
  await expect(statusField).toHaveValue("Completed");
  await submitButton.click();

  await expect(result).toContainText("Nova Textiles");
  await expect(result).toContainText('Calibration review "Q4"');
  await expect(result).toContainText("Completed");
});
