const { test, expect } = require("@playwright/test");

async function setupAttendancePage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Attendance | Odoo</title>
      </head>
      <body>
        <h1>Attendance</h1>
        <form id="attendanceForm">
          <label for="employee">Employee *</label>
          <input id="employee" name="employee" type="text" value="${options.employee || ""}" required />

          <label for="checkIn">Check-in *</label>
          <input id="checkIn" name="checkIn" type="datetime-local" value="${options.checkIn || ""}" required />

          <label for="checkOut">Check-out *</label>
          <input id="checkOut" name="checkOut" type="datetime-local" value="${options.checkOut || ""}" required />

          <label for="location">Location *</label>
          <input id="location" name="location" type="text" value="${options.location || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Present" ${options.status === "Present" ? "selected" : ""}>Present</option>
            <option value="Late" ${options.status === "Late" ? "selected" : ""}>Late</option>
            <option value="Remote" ${options.status === "Remote" ? "selected" : ""}>Remote</option>
            <option value="Leave" ${options.status === "Leave" ? "selected" : ""}>Leave</option>
          </select>

          <label for="notes">Notes</label>
          <textarea id="notes" name="notes">${options.notes || ""}</textarea>

          <button type="submit">Save attendance</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("attendanceForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const employee = document.getElementById("employee").value;
            const checkIn = document.getElementById("checkIn").value;
            const checkOut = document.getElementById("checkOut").value;
            const location = document.getElementById("location").value;
            const status = document.getElementById("status").value;
            const notes = document.getElementById("notes").value;
            const result = document.getElementById("result");

            if (checkIn && checkOut && checkIn > checkOut) {
              result.textContent = "Check-out must be on or after check-in";
              return;
            }

            result.textContent = "Attendance saved: " + [employee, checkIn, checkOut, location, status, notes || "No notes"].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    employeeField: page.locator("#employee"),
    checkInField: page.locator("#checkIn"),
    checkOutField: page.locator("#checkOut"),
    locationField: page.locator("#location"),
    statusField: page.locator("#status"),
    notesField: page.locator("#notes"),
    submitButton: page.getByRole("button", { name: /save attendance/i }),
    result: page.locator("#result"),
  };
}

test("loads the attendance form", async ({ page }) => {
  const {
    employeeField,
    checkInField,
    checkOutField,
    locationField,
    statusField,
    notesField,
    submitButton,
  } = await setupAttendancePage(page);

  await expect(page).toHaveTitle(/Attendance/i);
  await expect(employeeField).toBeVisible();
  await expect(checkInField).toBeVisible();
  await expect(checkOutField).toBeVisible();
  await expect(locationField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(notesField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("records a valid attendance entry", async ({ page }) => {
  const {
    employeeField,
    checkInField,
    checkOutField,
    locationField,
    statusField,
    submitButton,
    result,
  } = await setupAttendancePage(page);

  await employeeField.fill("Nodir Tursunov");
  await checkInField.fill("2026-09-15T09:00");
  await checkOutField.fill("2026-09-15T18:00");
  await locationField.fill("Office HQ");
  await statusField.selectOption("Present");
  await submitButton.click();

  await expect(result).toHaveText(
    "Attendance saved: Nodir Tursunov | 2026-09-15T09:00 | 2026-09-15T18:00 | Office HQ | Present | No notes",
  );
});

test("requires employee, time, and location details", async ({ page }) => {
  const {
    employeeField,
    checkInField,
    checkOutField,
    locationField,
    statusField,
    submitButton,
  } = await setupAttendancePage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      employeeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      checkInField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      checkOutField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      locationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a checkout before check-in", async ({ page }) => {
  const {
    employeeField,
    checkInField,
    checkOutField,
    locationField,
    statusField,
    submitButton,
    result,
  } = await setupAttendancePage(page);

  await employeeField.fill("Mira Sultonova");
  await checkInField.fill("2026-09-16T15:00");
  await checkOutField.fill("2026-09-16T14:30");
  await locationField.fill("Warehouse A");
  await statusField.selectOption("Late");
  await submitButton.click();

  await expect(result).toHaveText("Check-out must be on or after check-in");
});

test("keeps a pre-filled attendance record", async ({ page }) => {
  const {
    employeeField,
    checkInField,
    checkOutField,
    locationField,
    statusField,
    notesField,
    submitButton,
    result,
  } = await setupAttendancePage(page, {
    employee: "Jamshid Rahimov",
    checkIn: "2026-09-17T08:30",
    checkOut: "2026-09-17T17:45",
    location: "Remote Office",
    status: "Remote",
    notes: "Client call block",
  });

  await expect(employeeField).toHaveValue("Jamshid Rahimov");
  await expect(checkInField).toHaveValue("2026-09-17T08:30");
  await expect(checkOutField).toHaveValue("2026-09-17T17:45");
  await expect(locationField).toHaveValue("Remote Office");
  await expect(statusField).toHaveValue("Remote");
  await expect(notesField).toHaveValue("Client call block");
  await submitButton.click();

  await expect(result).toContainText("Jamshid Rahimov");
  await expect(result).toContainText("Remote Office");
  await expect(result).toContainText("Remote");
  await expect(result).toContainText("Client call block");
});
