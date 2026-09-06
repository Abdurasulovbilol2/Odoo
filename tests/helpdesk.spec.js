const { test, expect } = require("@playwright/test");

async function setupHelpdeskPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Helpdesk | Odoo</title>
      </head>
      <body>
        <h1>Helpdesk Tickets</h1>
        <form id="ticketForm">
          <label for="title">Ticket title *</label>
          <input id="title" name="title" type="text" value="${options.title || ""}" required />

          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${options.customer || ""}" required />

          <label for="priority">Priority *</label>
          <select id="priority" name="priority" required>
            <option value="">Select priority</option>
            <option value="Low" ${options.priority === "Low" ? "selected" : ""}>Low</option>
            <option value="Normal" ${options.priority === "Normal" ? "selected" : ""}>Normal</option>
            <option value="High" ${options.priority === "High" ? "selected" : ""}>High</option>
          </select>

          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="">Select category</option>
            <option value="Technical" ${options.category === "Technical" ? "selected" : ""}>Technical</option>
            <option value="Billing" ${options.category === "Billing" ? "selected" : ""}>Billing</option>
            <option value="Support" ${options.category === "Support" ? "selected" : ""}>Support</option>
          </select>

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="New" ${options.status === "New" ? "selected" : ""}>New</option>
            <option value="In Progress" ${options.status === "In Progress" ? "selected" : ""}>In Progress</option>
            <option value="Solved" ${options.status === "Solved" ? "selected" : ""}>Solved</option>
          </select>

          <label for="description">Description</label>
          <textarea id="description" name="description">${options.description || ""}</textarea>

          <button type="submit">Create ticket</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("ticketForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("title").value,
              document.getElementById("customer").value,
              document.getElementById("priority").value,
              document.getElementById("category").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Ticket created: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    titleField: page.locator("#title"),
    customerField: page.locator("#customer"),
    priorityField: page.locator("#priority"),
    categoryField: page.locator("#category"),
    statusField: page.locator("#status"),
    descriptionField: page.locator("#description"),
    submitButton: page.getByRole("button", { name: /create ticket/i }),
    result: page.locator("#result"),
  };
}

test("loads the helpdesk ticket form", async ({ page }) => {
  const {
    titleField,
    customerField,
    priorityField,
    categoryField,
    statusField,
    descriptionField,
    submitButton,
  } = await setupHelpdeskPage(page);

  await expect(page).toHaveTitle(/Helpdesk/i);
  await expect(titleField).toBeVisible();
  await expect(customerField).toBeVisible();
  await expect(priorityField).toBeVisible();
  await expect(categoryField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(descriptionField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a new support ticket", async ({ page }) => {
  const {
    titleField,
    customerField,
    priorityField,
    categoryField,
    statusField,
    submitButton,
    result,
  } = await setupHelpdeskPage(page);

  await titleField.fill("Login issue after update");
  await customerField.fill("acme@company.com");
  await priorityField.selectOption("High");
  await categoryField.selectOption("Technical");
  await statusField.selectOption("New");
  await submitButton.click();

  await expect(result).toHaveText(
    "Ticket created: Login issue after update | acme@company.com | High | Technical | New",
  );
});

test("requires ticket title, customer, and status details", async ({
  page,
}) => {
  const {
    titleField,
    customerField,
    priorityField,
    categoryField,
    statusField,
    submitButton,
  } = await setupHelpdeskPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      titleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      priorityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      categoryField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("keeps a pre-filled helpdesk ticket", async ({ page }) => {
  const {
    titleField,
    customerField,
    priorityField,
    categoryField,
    statusField,
    submitButton,
    result,
  } = await setupHelpdeskPage(page, {
    title: "Billing mismatch",
    customer: "northwind@store.com",
    priority: "Normal",
    category: "Billing",
    status: "In Progress",
    description: "Invoice total mismatch for renewal order",
  });

  await expect(titleField).toHaveValue("Billing mismatch");
  await expect(customerField).toHaveValue("northwind@store.com");
  await expect(priorityField).toHaveValue("Normal");
  await expect(categoryField).toHaveValue("Billing");
  await expect(statusField).toHaveValue("In Progress");
  await submitButton.click();

  await expect(result).toContainText("Billing mismatch");
  await expect(result).toContainText("northwind@store.com");
  await expect(result).toContainText("Normal");
});

test("marks an existing ticket as solved", async ({ page }) => {
  const {
    titleField,
    customerField,
    priorityField,
    categoryField,
    statusField,
    submitButton,
    result,
  } = await setupHelpdeskPage(page, {
    title: "Password reset request",
    customer: "ops@partner.com",
    priority: "Low",
    category: "Support",
    status: "Solved",
  });

  await expect(statusField).toHaveValue("Solved");
  await submitButton.click();

  await expect(result).toContainText("Password reset request");
  await expect(result).toContainText("Solved");
});
