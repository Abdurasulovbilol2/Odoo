const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupFieldServicePage(page, options = {}) {
  const safeOptions = {
    technician: escapeHtml(options.technician),
    site: escapeHtml(options.site),
    task: escapeHtml(options.task),
    scheduledDate: escapeHtml(options.scheduledDate),
    duration: escapeHtml(options.duration),
    priority: escapeHtml(options.priority),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Field Service | Odoo</title>
      </head>
      <body>
        <h1>Field Service</h1>
        <form id="fieldServiceForm">
          <label for="technician">Technician *</label>
          <input id="technician" name="technician" type="text" value="${safeOptions.technician || ""}" required />

          <label for="site">Service site *</label>
          <input id="site" name="site" type="text" value="${safeOptions.site || ""}" required />

          <label for="task">Task *</label>
          <input id="task" name="task" type="text" value="${safeOptions.task || ""}" required />

          <label for="scheduledDate">Scheduled date *</label>
          <input id="scheduledDate" name="scheduledDate" type="date" value="${safeOptions.scheduledDate || ""}" required />

          <label for="duration">Duration (hours) *</label>
          <input id="duration" name="duration" type="number" step="0.5" value="${safeOptions.duration || ""}" required />

          <label for="priority">Priority *</label>
          <select id="priority" name="priority" required>
            <option value="">Select priority</option>
            <option value="Low" ${safeOptions.priority === "Low" ? "selected" : ""}>Low</option>
            <option value="Normal" ${safeOptions.priority === "Normal" ? "selected" : ""}>Normal</option>
            <option value="High" ${safeOptions.priority === "High" ? "selected" : ""}>High</option>
            <option value="Urgent" ${safeOptions.priority === "Urgent" ? "selected" : ""}>Urgent</option>
          </select>

          <button type="submit">Schedule service</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("fieldServiceForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const technician = document.getElementById("technician").value;
            const site = document.getElementById("site").value;
            const task = document.getElementById("task").value;
            const scheduledDate = document.getElementById("scheduledDate").value;
            const duration = document.getElementById("duration").value;
            const priority = document.getElementById("priority").value;
            const result = document.getElementById("result");

            if (Number(duration) <= 0) {
              result.textContent = "Duration must be greater than 0 hours";
              return;
            }

            result.textContent = "Service scheduled: " + [technician, site, task, scheduledDate, duration, priority].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    technicianField: page.locator("#technician"),
    siteField: page.locator("#site"),
    taskField: page.locator("#task"),
    scheduledDateField: page.locator("#scheduledDate"),
    durationField: page.locator("#duration"),
    priorityField: page.locator("#priority"),
    submitButton: page.getByRole("button", { name: /schedule service/i }),
    result: page.locator("#result"),
  };
}

test("loads the field service form", async ({ page }) => {
  const {
    technicianField,
    siteField,
    taskField,
    scheduledDateField,
    durationField,
    priorityField,
    submitButton,
  } = await setupFieldServicePage(page);

  await expect(page).toHaveTitle(/Field Service/i);
  await expect(technicianField).toBeVisible();
  await expect(siteField).toBeVisible();
  await expect(taskField).toBeVisible();
  await expect(scheduledDateField).toBeVisible();
  await expect(durationField).toBeVisible();
  await expect(priorityField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("schedules a valid service call", async ({ page }) => {
  const {
    technicianField,
    siteField,
    taskField,
    scheduledDateField,
    durationField,
    priorityField,
    submitButton,
    result,
  } = await setupFieldServicePage(page);

  await technicianField.fill("Samandar Azizov");
  await siteField.fill("New Market Plaza");
  await taskField.fill("HVAC inspection");
  await scheduledDateField.fill("2026-09-21");
  await durationField.fill("4");
  await priorityField.selectOption("High");
  await submitButton.click();

  await expect(result).toHaveText(
    "Service scheduled: Samandar Azizov | New Market Plaza | HVAC inspection | 2026-09-21 | 4 | High",
  );
});

test("requires service details before scheduling", async ({ page }) => {
  const {
    technicianField,
    siteField,
    taskField,
    scheduledDateField,
    durationField,
    priorityField,
    submitButton,
  } = await setupFieldServicePage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      technicianField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      siteField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      taskField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      scheduledDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      durationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      priorityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative service duration", async ({ page }) => {
  const {
    technicianField,
    siteField,
    taskField,
    scheduledDateField,
    durationField,
    priorityField,
    submitButton,
    result,
  } = await setupFieldServicePage(page);

  await technicianField.fill("Jasur Rahmonov");
  await siteField.fill("Alisher Avenue");
  await taskField.fill("Generator maintenance");
  await scheduledDateField.fill("2026-09-22");
  await durationField.fill("0");
  await priorityField.selectOption("Normal");
  await submitButton.click();

  await expect(result).toHaveText("Duration must be greater than 0 hours");
});

test("keeps a pre-filled scheduled service", async ({ page }) => {
  const {
    technicianField,
    siteField,
    taskField,
    scheduledDateField,
    durationField,
    priorityField,
    submitButton,
    result,
  } = await setupFieldServicePage(page, {
    technician: "Azizbek Yuldashev",
    site: "Central Station",
    task: 'Pump replacement "A"',
    scheduledDate: "2026-09-24",
    duration: "6",
    priority: "Urgent",
  });

  await expect(technicianField).toHaveValue("Azizbek Yuldashev");
  await expect(siteField).toHaveValue("Central Station");
  await expect(taskField).toHaveValue('Pump replacement "A"');
  await expect(scheduledDateField).toHaveValue("2026-09-24");
  await expect(durationField).toHaveValue("6");
  await expect(priorityField).toHaveValue("Urgent");
  await submitButton.click();

  await expect(result).toContainText("Azizbek Yuldashev");
  await expect(result).toContainText('Pump replacement "A"');
  await expect(result).toContainText("Urgent");
});
