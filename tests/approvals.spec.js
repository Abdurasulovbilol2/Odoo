const { test, expect } = require("@playwright/test");

async function setupApprovalsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Approvals | Odoo</title>
      </head>
      <body>
        <h1>Approvals</h1>
        <form id="approvalForm">
          <label for="approvalType">Approval type *</label>
          <select id="approvalType" name="approvalType" required>
            <option value="">Select type</option>
            <option value="Expense" ${options.approvalType === "Expense" ? "selected" : ""}>Expense</option>
            <option value="Leave" ${options.approvalType === "Leave" ? "selected" : ""}>Leave</option>
            <option value="Purchase" ${options.approvalType === "Purchase" ? "selected" : ""}>Purchase</option>
            <option value="Travel" ${options.approvalType === "Travel" ? "selected" : ""}>Travel</option>
          </select>

          <label for="requester">Requester *</label>
          <input id="requester" name="requester" type="text" value="${options.requester || ""}" required />

          <label for="approver">Approver *</label>
          <input id="approver" name="approver" type="email" value="${options.approver || ""}" required />

          <label for="requestDate">Request date *</label>
          <input id="requestDate" name="requestDate" type="date" value="${options.requestDate || ""}" required />

          <label for="dueDate">Due date *</label>
          <input id="dueDate" name="dueDate" type="date" value="${options.dueDate || ""}" required />

          <label for="priority">Priority *</label>
          <select id="priority" name="priority" required>
            <option value="">Select priority</option>
            <option value="Normal" ${options.priority === "Normal" ? "selected" : ""}>Normal</option>
            <option value="High" ${options.priority === "High" ? "selected" : ""}>High</option>
            <option value="Urgent" ${options.priority === "Urgent" ? "selected" : ""}>Urgent</option>
          </select>

          <button type="submit">Submit approval</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("approvalForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const approvalType = document.getElementById("approvalType").value;
            const requester = document.getElementById("requester").value;
            const approver = document.getElementById("approver").value;
            const requestDate = document.getElementById("requestDate").value;
            const dueDate = document.getElementById("dueDate").value;
            const priority = document.getElementById("priority").value;
            const result = document.getElementById("result");

            if (requestDate && dueDate && requestDate > dueDate) {
              result.textContent = "Due date must be on or after request date";
              return;
            }

            result.textContent = "Approval submitted: " + [approvalType, requester, approver, requestDate, dueDate, priority].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    typeField: page.locator("#approvalType"),
    requesterField: page.locator("#requester"),
    approverField: page.locator("#approver"),
    requestDateField: page.locator("#requestDate"),
    dueDateField: page.locator("#dueDate"),
    priorityField: page.locator("#priority"),
    submitButton: page.getByRole("button", { name: /submit approval/i }),
    result: page.locator("#result"),
  };
}

test("loads the approvals form", async ({ page }) => {
  const {
    typeField,
    requesterField,
    approverField,
    requestDateField,
    dueDateField,
    priorityField,
    submitButton,
  } = await setupApprovalsPage(page);

  await expect(page).toHaveTitle(/Approvals/i);
  await expect(typeField).toBeVisible();
  await expect(requesterField).toBeVisible();
  await expect(approverField).toBeVisible();
  await expect(requestDateField).toBeVisible();
  await expect(dueDateField).toBeVisible();
  await expect(priorityField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("submits a valid travel approval request", async ({ page }) => {
  const {
    typeField,
    requesterField,
    approverField,
    requestDateField,
    dueDateField,
    priorityField,
    submitButton,
    result,
  } = await setupApprovalsPage(page);

  await typeField.selectOption("Travel");
  await requesterField.fill("Nora Ali");
  await approverField.fill("manager@odoo.com");
  await requestDateField.fill("2026-09-16");
  await dueDateField.fill("2026-09-18");
  await priorityField.selectOption("High");
  await submitButton.click();

  await expect(result).toHaveText(
    "Approval submitted: Travel | Nora Ali | manager@odoo.com | 2026-09-16 | 2026-09-18 | High",
  );
});

test("requires approval details before submitting", async ({ page }) => {
  const {
    typeField,
    requesterField,
    approverField,
    requestDateField,
    dueDateField,
    priorityField,
    submitButton,
  } = await setupApprovalsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      typeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      requesterField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      approverField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      requestDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      dueDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      priorityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a due date earlier than the request date", async ({ page }) => {
  const {
    typeField,
    requesterField,
    approverField,
    requestDateField,
    dueDateField,
    priorityField,
    submitButton,
    result,
  } = await setupApprovalsPage(page);

  await typeField.selectOption("Leave");
  await requesterField.fill("Samir Rahmon");
  await approverField.fill("lead@odoo.com");
  await requestDateField.fill("2026-09-25");
  await dueDateField.fill("2026-09-20");
  await priorityField.selectOption("Normal");
  await submitButton.click();

  await expect(result).toHaveText("Due date must be on or after request date");
});

test("keeps a pre-filled approval draft", async ({ page }) => {
  const {
    typeField,
    requesterField,
    approverField,
    requestDateField,
    dueDateField,
    priorityField,
    submitButton,
    result,
  } = await setupApprovalsPage(page, {
    approvalType: "Purchase",
    requester: "Hafsa Qodirova",
    approver: "finance@odoo.com",
    requestDate: "2026-09-10",
    dueDate: "2026-09-14",
    priority: "Urgent",
  });

  await expect(typeField).toHaveValue("Purchase");
  await expect(requesterField).toHaveValue("Hafsa Qodirova");
  await expect(approverField).toHaveValue("finance@odoo.com");
  await expect(requestDateField).toHaveValue("2026-09-10");
  await expect(dueDateField).toHaveValue("2026-09-14");
  await expect(priorityField).toHaveValue("Urgent");
  await submitButton.click();

  await expect(result).toContainText("Purchase");
  await expect(result).toContainText("Hafsa Qodirova");
  await expect(result).toContainText("finance@odoo.com");
  await expect(result).toContainText("Urgent");
});
