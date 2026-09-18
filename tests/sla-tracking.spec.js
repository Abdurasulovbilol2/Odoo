const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupSlaTrackingPage(page, options = {}) {
  const safeOptions = {
    ticket: escapeHtml(options.ticket),
    customer: escapeHtml(options.customer),
    serviceLevel: escapeHtml(options.serviceLevel),
    openedAt: escapeHtml(options.openedAt),
    deadline: escapeHtml(options.deadline),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>SLA Tracking | Odoo</title>
      </head>
      <body>
        <h1>SLA Tracking</h1>
        <form id="slaForm">
          <label for="ticket">Ticket reference *</label>
          <input id="ticket" name="ticket" type="text" value="${safeOptions.ticket || ""}" required />

          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${safeOptions.customer || ""}" required />

          <label for="serviceLevel">Service level *</label>
          <select id="serviceLevel" name="serviceLevel" required>
            <option value="">Select service level</option>
            <option value="Standard" ${safeOptions.serviceLevel === "Standard" ? "selected" : ""}>Standard</option>
            <option value="Priority" ${safeOptions.serviceLevel === "Priority" ? "selected" : ""}>Priority</option>
            <option value="Critical" ${safeOptions.serviceLevel === "Critical" ? "selected" : ""}>Critical</option>
          </select>

          <label for="openedAt">Opened date *</label>
          <input id="openedAt" name="openedAt" type="date" value="${safeOptions.openedAt || ""}" required />

          <label for="deadline">Resolution deadline *</label>
          <input id="deadline" name="deadline" type="date" value="${safeOptions.deadline || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Running" ${safeOptions.status === "Running" ? "selected" : ""}>Running</option>
            <option value="At Risk" ${safeOptions.status === "At Risk" ? "selected" : ""}>At Risk</option>
            <option value="Met" ${safeOptions.status === "Met" ? "selected" : ""}>Met</option>
            <option value="Breached" ${safeOptions.status === "Breached" ? "selected" : ""}>Breached</option>
          </select>

          <button type="submit">Save SLA</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("slaForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const ticket = document.getElementById("ticket").value;
            const customer = document.getElementById("customer").value;
            const serviceLevel = document.getElementById("serviceLevel").value;
            const openedAt = document.getElementById("openedAt").value;
            const deadline = document.getElementById("deadline").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (openedAt && deadline && openedAt > deadline) {
              result.textContent = "Deadline must be on or after opened date";
              return;
            }

            result.textContent = "SLA saved: " + [ticket, customer, serviceLevel, openedAt, deadline, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    ticketField: page.locator("#ticket"),
    customerField: page.locator("#customer"),
    serviceLevelField: page.locator("#serviceLevel"),
    openedAtField: page.locator("#openedAt"),
    deadlineField: page.locator("#deadline"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save sla/i }),
    result: page.locator("#result"),
  };
}

test("loads the SLA tracking form", async ({ page }) => {
  const {
    ticketField,
    customerField,
    serviceLevelField,
    openedAtField,
    deadlineField,
    statusField,
    submitButton,
  } = await setupSlaTrackingPage(page);

  await expect(page).toHaveTitle(/SLA Tracking/i);
  await expect(ticketField).toBeVisible();
  await expect(customerField).toBeVisible();
  await expect(serviceLevelField).toBeVisible();
  await expect(openedAtField).toBeVisible();
  await expect(deadlineField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid SLA record", async ({ page }) => {
  const {
    ticketField,
    customerField,
    serviceLevelField,
    openedAtField,
    deadlineField,
    statusField,
    submitButton,
    result,
  } = await setupSlaTrackingPage(page);

  await ticketField.fill("HELP-2048");
  await customerField.fill("Orion Manufacturing");
  await serviceLevelField.selectOption("Priority");
  await openedAtField.fill("2026-09-18");
  await deadlineField.fill("2026-09-21");
  await statusField.selectOption("Running");
  await submitButton.click();

  await expect(result).toHaveText(
    "SLA saved: HELP-2048 | Orion Manufacturing | Priority | 2026-09-18 | 2026-09-21 | Running",
  );
});

test("requires SLA details before saving", async ({ page }) => {
  const {
    ticketField,
    customerField,
    serviceLevelField,
    openedAtField,
    deadlineField,
    statusField,
    submitButton,
  } = await setupSlaTrackingPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      ticketField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      serviceLevelField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      openedAtField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      deadlineField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a deadline before the opened date", async ({ page }) => {
  const {
    ticketField,
    customerField,
    serviceLevelField,
    openedAtField,
    deadlineField,
    statusField,
    submitButton,
    result,
  } = await setupSlaTrackingPage(page);

  await ticketField.fill("HELP-2055");
  await customerField.fill("Vertex Retail");
  await serviceLevelField.selectOption("Critical");
  await openedAtField.fill("2026-09-25");
  await deadlineField.fill("2026-09-22");
  await statusField.selectOption("At Risk");
  await submitButton.click();

  await expect(result).toHaveText("Deadline must be on or after opened date");
});

test("keeps a pre-filled SLA record", async ({ page }) => {
  const {
    ticketField,
    customerField,
    serviceLevelField,
    openedAtField,
    deadlineField,
    statusField,
    submitButton,
    result,
  } = await setupSlaTrackingPage(page, {
    ticket: "HELP-1999",
    customer: "Atlas Energy",
    serviceLevel: "Standard",
    openedAt: "2026-09-20",
    deadline: "2026-09-27",
    status: "Met",
  });

  await expect(ticketField).toHaveValue("HELP-1999");
  await expect(customerField).toHaveValue("Atlas Energy");
  await expect(serviceLevelField).toHaveValue("Standard");
  await expect(openedAtField).toHaveValue("2026-09-20");
  await expect(deadlineField).toHaveValue("2026-09-27");
  await expect(statusField).toHaveValue("Met");
  await submitButton.click();

  await expect(result).toContainText("HELP-1999");
  await expect(result).toContainText("Atlas Energy");
  await expect(result).toContainText("Met");
});
