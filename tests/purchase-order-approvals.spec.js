const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupPurchaseOrderApprovalsPage(page, options = {}) {
  const safeOptions = {
    orderNumber: escapeHtml(options.orderNumber),
    vendor: escapeHtml(options.vendor),
    item: escapeHtml(options.item),
    amount: escapeHtml(options.amount),
    approver: escapeHtml(options.approver),
    approvalDate: escapeHtml(options.approvalDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Purchase Order Approvals | Odoo</title>
      </head>
      <body>
        <h1>Purchase Order Approvals</h1>
        <form id="approvalForm">
          <label for="orderNumber">Order number *</label>
          <input id="orderNumber" name="orderNumber" type="text" value="${safeOptions.orderNumber || ""}" required />

          <label for="vendor">Vendor *</label>
          <input id="vendor" name="vendor" type="text" value="${safeOptions.vendor || ""}" required />

          <label for="item">Item *</label>
          <input id="item" name="item" type="text" value="${safeOptions.item || ""}" required />

          <label for="amount">Amount *</label>
          <input id="amount" name="amount" type="number" step="0.01" value="${safeOptions.amount || ""}" required />

          <label for="approver">Approver *</label>
          <input id="approver" name="approver" type="text" value="${safeOptions.approver || ""}" required />

          <label for="approvalDate">Approval date *</label>
          <input id="approvalDate" name="approvalDate" type="date" value="${safeOptions.approvalDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Pending" ${safeOptions.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Approved" ${safeOptions.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Rejected" ${safeOptions.status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>

          <button type="submit">Submit approval</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("approvalForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const orderNumber = document.getElementById("orderNumber").value.trim();
            const vendor = document.getElementById("vendor").value.trim();
            const item = document.getElementById("item").value.trim();
            const amount = Number(document.getElementById("amount").value);
            const approver = document.getElementById("approver").value.trim();
            const approvalDate = document.getElementById("approvalDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (amount <= 0) {
              result.textContent = "Approval amount must be greater than zero";
              return;
            }

            if (status === "Rejected" && amount > 5000) {
              result.textContent = "Large approvals cannot be rejected without review";
              return;
            }

            result.textContent = "Approval submitted: " + [orderNumber, vendor, item, amount.toFixed(2), approver, approvalDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    orderNumberField: page.locator("#orderNumber"),
    vendorField: page.locator("#vendor"),
    itemField: page.locator("#item"),
    amountField: page.locator("#amount"),
    approverField: page.locator("#approver"),
    approvalDateField: page.locator("#approvalDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /submit approval/i }),
    result: page.locator("#result"),
  };
}

test("loads the purchase order approvals form", async ({ page }) => {
  const {
    orderNumberField,
    vendorField,
    itemField,
    amountField,
    approverField,
    approvalDateField,
    statusField,
    submitButton,
  } = await setupPurchaseOrderApprovalsPage(page);

  await expect(page).toHaveTitle(/Purchase Order Approvals/i);
  await expect(orderNumberField).toBeVisible();
  await expect(vendorField).toBeVisible();
  await expect(itemField).toBeVisible();
  await expect(amountField).toBeVisible();
  await expect(approverField).toBeVisible();
  await expect(approvalDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("submits a valid approval", async ({ page }) => {
  const {
    orderNumberField,
    vendorField,
    itemField,
    amountField,
    approverField,
    approvalDateField,
    statusField,
    submitButton,
    result,
  } = await setupPurchaseOrderApprovalsPage(page);

  await orderNumberField.fill("PO-1042");
  await vendorField.fill("Northwind Supplies");
  await itemField.fill("Industrial Labels");
  await amountField.fill("900");
  await approverField.fill("I. Morris");
  await approvalDateField.fill("2026-09-27");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Approval submitted: PO-1042 | Northwind Supplies | Industrial Labels | 900.00 | I. Morris | 2026-09-27 | Approved",
  );
});

test("requires all approval fields before submission", async ({ page }) => {
  const {
    orderNumberField,
    vendorField,
    itemField,
    amountField,
    approverField,
    approvalDateField,
    statusField,
    submitButton,
  } = await setupPurchaseOrderApprovalsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      orderNumberField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      vendorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      itemField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      amountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      approverField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      approvalDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects invalid approval amounts", async ({ page }) => {
  const {
    orderNumberField,
    vendorField,
    itemField,
    amountField,
    approverField,
    approvalDateField,
    statusField,
    submitButton,
    result,
  } = await setupPurchaseOrderApprovalsPage(page);

  await orderNumberField.fill("PO-1140");
  await vendorField.fill("Compute Source");
  await itemField.fill("Server Rack");
  await amountField.fill("0");
  await approverField.fill("C. Ross");
  await approvalDateField.fill("2026-09-28");
  await statusField.selectOption("Pending");
  await submitButton.click();

  await expect(result).toHaveText("Approval amount must be greater than zero");
});

test("keeps a pre-filled approval", async ({ page }) => {
  const {
    orderNumberField,
    vendorField,
    itemField,
    amountField,
    approverField,
    approvalDateField,
    statusField,
    submitButton,
    result,
  } = await setupPurchaseOrderApprovalsPage(page, {
    orderNumber: 'PO-2040 "Rush"',
    vendor: "Westlake Parts",
    item: "Assembly Kit",
    amount: "2500.00",
    approver: "D. Chen",
    approvalDate: "2026-09-29",
    status: "Approved",
  });

  await expect(orderNumberField).toHaveValue('PO-2040 "Rush"');
  await expect(vendorField).toHaveValue("Westlake Parts");
  await expect(itemField).toHaveValue("Assembly Kit");
  await expect(amountField).toHaveValue("2500.00");
  await expect(approverField).toHaveValue("D. Chen");
  await expect(approvalDateField).toHaveValue("2026-09-29");
  await expect(statusField).toHaveValue("Approved");

  await submitButton.click();

  await expect(result).toContainText('PO-2040 "Rush"');
  await expect(result).toContainText("2500.00");
});
