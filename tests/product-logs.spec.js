const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupProductLogsPage(page, options = {}) {
  const safeOptions = {
    product: escapeHtml(options.product),
    eventType: escapeHtml(options.eventType),
    user: escapeHtml(options.user),
    description: escapeHtml(options.description),
    eventDate: escapeHtml(options.eventDate),
    severity: escapeHtml(options.severity),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Product Logs | Odoo</title>
      </head>
      <body>
        <h1>Product Logs</h1>
        <form id="logForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="eventType">Event type *</label>
          <select id="eventType" name="eventType" required>
            <option value="">Select event</option>
            <option value="Created" ${safeOptions.eventType === "Created" ? "selected" : ""}>Created</option>
            <option value="Updated" ${safeOptions.eventType === "Updated" ? "selected" : ""}>Updated</option>
            <option value="Archived" ${safeOptions.eventType === "Archived" ? "selected" : ""}>Archived</option>
            <option value="Returned" ${safeOptions.eventType === "Returned" ? "selected" : ""}>Returned</option>
          </select>

          <label for="user">User *</label>
          <input id="user" name="user" type="text" value="${safeOptions.user || ""}" required />

          <label for="description">Description *</label>
          <textarea id="description" name="description" required>${safeOptions.description || ""}</textarea>

          <label for="eventDate">Event date *</label>
          <input id="eventDate" name="eventDate" type="date" value="${safeOptions.eventDate || ""}" required />

          <label for="severity">Severity *</label>
          <select id="severity" name="severity" required>
            <option value="">Select severity</option>
            <option value="Info" ${safeOptions.severity === "Info" ? "selected" : ""}>Info</option>
            <option value="Warning" ${safeOptions.severity === "Warning" ? "selected" : ""}>Warning</option>
            <option value="Critical" ${safeOptions.severity === "Critical" ? "selected" : ""}>Critical</option>
          </select>

          <button type="submit">Create log</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("logForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const product = document.getElementById("product").value;
            const eventType = document.getElementById("eventType").value;
            const user = document.getElementById("user").value;
            const description = document.getElementById("description").value.trim();
            const eventDate = document.getElementById("eventDate").value;
            const severity = document.getElementById("severity").value;
            const result = document.getElementById("result");

            if (!description || description.length < 8) {
              result.textContent = "Description must be detailed enough to log the event";
              return;
            }

            if (severity === "Critical" && eventType !== "Returned") {
              result.textContent = "Critical logs are reserved for returned products";
              return;
            }

            result.textContent = "Log created: " + [product, eventType, user, description, eventDate, severity].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    eventTypeField: page.locator("#eventType"),
    userField: page.locator("#user"),
    descriptionField: page.locator("#description"),
    eventDateField: page.locator("#eventDate"),
    severityField: page.locator("#severity"),
    submitButton: page.getByRole("button", { name: /create log/i }),
    result: page.locator("#result"),
  };
}

test("loads the product logs form", async ({ page }) => {
  const {
    productField,
    eventTypeField,
    userField,
    descriptionField,
    eventDateField,
    severityField,
    submitButton,
  } = await setupProductLogsPage(page);

  await expect(page).toHaveTitle(/Product Logs/i);
  await expect(productField).toBeVisible();
  await expect(eventTypeField).toBeVisible();
  await expect(userField).toBeVisible();
  await expect(descriptionField).toBeVisible();
  await expect(eventDateField).toBeVisible();
  await expect(severityField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a valid product log", async ({ page }) => {
  const {
    productField,
    eventTypeField,
    userField,
    descriptionField,
    eventDateField,
    severityField,
    submitButton,
    result,
  } = await setupProductLogsPage(page);

  await productField.fill("Air Purifier");
  await eventTypeField.selectOption("Updated");
  await userField.fill("sam.nguyen");
  await descriptionField.fill("Updated filter status after inspection");
  await eventDateField.fill("2026-09-24");
  await severityField.selectOption("Warning");
  await submitButton.click();

  await expect(result).toHaveText(
    "Log created: Air Purifier | Updated | sam.nguyen | Updated filter status after inspection | 2026-09-24 | Warning",
  );
});

test("requires all log fields before creation", async ({ page }) => {
  const {
    productField,
    eventTypeField,
    userField,
    descriptionField,
    eventDateField,
    severityField,
    submitButton,
  } = await setupProductLogsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      eventTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      userField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      descriptionField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      eventDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      severityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects vague log descriptions", async ({ page }) => {
  const {
    productField,
    eventTypeField,
    userField,
    descriptionField,
    eventDateField,
    severityField,
    submitButton,
    result,
  } = await setupProductLogsPage(page);

  await productField.fill("Desk Lamp");
  await eventTypeField.selectOption("Created");
  await userField.fill("aisha.lee");
  await descriptionField.fill("ok");
  await eventDateField.fill("2026-09-25");
  await severityField.selectOption("Info");
  await submitButton.click();

  await expect(result).toHaveText(
    "Description must be detailed enough to log the event",
  );
});

test("keeps a pre-filled product log", async ({ page }) => {
  const {
    productField,
    eventTypeField,
    userField,
    descriptionField,
    eventDateField,
    severityField,
    submitButton,
    result,
  } = await setupProductLogsPage(page, {
    product: 'Desk Organizer "Glass"',
    eventType: "Returned",
    user: "leo.martin",
    description: "Returned product due to damaged packaging",
    eventDate: "2026-09-20",
    severity: "Critical",
  });

  await expect(productField).toHaveValue('Desk Organizer "Glass"');
  await expect(eventTypeField).toHaveValue("Returned");
  await expect(userField).toHaveValue("leo.martin");
  await expect(descriptionField).toHaveValue(
    "Returned product due to damaged packaging",
  );
  await expect(eventDateField).toHaveValue("2026-09-20");
  await expect(severityField).toHaveValue("Critical");
  await submitButton.click();

  await expect(result).toContainText('Desk Organizer "Glass"');
  await expect(result).toContainText("leo.martin");
  await expect(result).toContainText("Returned");
});
