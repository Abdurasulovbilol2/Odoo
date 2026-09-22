const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupReturnsApprovalPage(page, options = {}) {
  const safeOptions = {
    returnReference: escapeHtml(options.returnReference),
    customer: escapeHtml(options.customer),
    reason: escapeHtml(options.reason),
    returnQty: escapeHtml(options.returnQty),
    approvalStatus: escapeHtml(options.approvalStatus),
    requestedDate: escapeHtml(options.requestedDate),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Returns Approval | Odoo</title>
      </head>
      <body>
        <h1>Returns Approval</h1>
        <form id="approvalForm">
          <label for="returnReference">Return reference *</label>
          <input id="returnReference" name="returnReference" type="text" value="${safeOptions.returnReference || ""}" required />

          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${safeOptions.customer || ""}" required />

          <label for="reason">Return reason *</label>
          <select id="reason" name="reason" required>
            <option value="">Select reason</option>
            <option value="Damaged item" ${safeOptions.reason === "Damaged item" ? "selected" : ""}>Damaged item</option>
            <option value="Wrong item" ${safeOptions.reason === "Wrong item" ? "selected" : ""}>Wrong item</option>
            <option value="Late delivery" ${safeOptions.reason === "Late delivery" ? "selected" : ""}>Late delivery</option>
            <option value="Changed mind" ${safeOptions.reason === "Changed mind" ? "selected" : ""}>Changed mind</option>
          </select>

          <label for="returnQty">Return quantity *</label>
          <input id="returnQty" name="returnQty" type="number" step="1" value="${safeOptions.returnQty || ""}" required />

          <label for="approvalStatus">Approval status *</label>
          <select id="approvalStatus" name="approvalStatus" required>
            <option value="">Select status</option>
            <option value="Pending" ${safeOptions.approvalStatus === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Approved" ${safeOptions.approvalStatus === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Rejected" ${safeOptions.approvalStatus === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>

          <label for="requestedDate">Requested date *</label>
          <input id="requestedDate" name="requestedDate" type="date" value="${safeOptions.requestedDate || ""}" required />

          <button type="submit">Review return</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("approvalForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const returnReference = document.getElementById("returnReference").value;
            const customer = document.getElementById("customer").value;
            const reason = document.getElementById("reason").value;
            const returnQty = Number(document.getElementById("returnQty").value);
            const approvalStatus = document.getElementById("approvalStatus").value;
            const requestedDate = document.getElementById("requestedDate").value;
            const result = document.getElementById("result");

            if (returnQty <= 0) {
              result.textContent = "Return quantity must be greater than zero";
              return;
            }

            if (approvalStatus === "Approved" && reason === "Changed mind") {
              result.textContent = "Changed mind returns cannot be approved automatically";
              return;
            }

            result.textContent = "Return reviewed: " + [returnReference, customer, reason, returnQty.toFixed(0), approvalStatus, requestedDate].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    returnReferenceField: page.locator("#returnReference"),
    customerField: page.locator("#customer"),
    reasonField: page.locator("#reason"),
    returnQtyField: page.locator("#returnQty"),
    approvalStatusField: page.locator("#approvalStatus"),
    requestedDateField: page.locator("#requestedDate"),
    submitButton: page.getByRole("button", { name: /review return/i }),
    result: page.locator("#result"),
  };
}

test("loads the returns approval form", async ({ page }) => {
  const {
    returnReferenceField,
    customerField,
    reasonField,
    returnQtyField,
    approvalStatusField,
    requestedDateField,
    submitButton,
  } = await setupReturnsApprovalPage(page);

  await expect(page).toHaveTitle(/Returns Approval/i);
  await expect(returnReferenceField).toBeVisible();
  await expect(customerField).toBeVisible();
  await expect(reasonField).toBeVisible();
  await expect(returnQtyField).toBeVisible();
  await expect(approvalStatusField).toBeVisible();
  await expect(requestedDateField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("reviews a valid return approval", async ({ page }) => {
  const {
    returnReferenceField,
    customerField,
    reasonField,
    returnQtyField,
    approvalStatusField,
    requestedDateField,
    submitButton,
    result,
  } = await setupReturnsApprovalPage(page);

  await returnReferenceField.fill("RET-2026-110");
  await customerField.fill("Stone & Co.");
  await reasonField.selectOption("Damaged item");
  await returnQtyField.fill("3");
  await approvalStatusField.selectOption("Approved");
  await requestedDateField.fill("2026-09-21");
  await submitButton.click();

  await expect(result).toHaveText(
    "Return reviewed: RET-2026-110 | Stone & Co. | Damaged item | 3 | Approved | 2026-09-21",
  );
});

test("requires all approval fields before review", async ({ page }) => {
  const {
    returnReferenceField,
    customerField,
    reasonField,
    returnQtyField,
    approvalStatusField,
    requestedDateField,
    submitButton,
  } = await setupReturnsApprovalPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      returnReferenceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      reasonField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      returnQtyField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      approvalStatusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      requestedDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative return quantities", async ({ page }) => {
  const {
    returnReferenceField,
    customerField,
    reasonField,
    returnQtyField,
    approvalStatusField,
    requestedDateField,
    submitButton,
    result,
  } = await setupReturnsApprovalPage(page);

  await returnReferenceField.fill("RET-2026-115");
  await customerField.fill("Harbor Supply");
  await reasonField.selectOption("Wrong item");
  await returnQtyField.fill("0");
  await approvalStatusField.selectOption("Pending");
  await requestedDateField.fill("2026-09-22");
  await submitButton.click();

  await expect(result).toHaveText("Return quantity must be greater than zero");
});

test("keeps a pre-filled return approval", async ({ page }) => {
  const {
    returnReferenceField,
    customerField,
    reasonField,
    returnQtyField,
    approvalStatusField,
    requestedDateField,
    submitButton,
    result,
  } = await setupReturnsApprovalPage(page, {
    returnReference: 'RET-2026-200 "VIP"',
    customer: "North Lakes",
    reason: "Late delivery",
    returnQty: "2",
    approvalStatus: "Rejected",
    requestedDate: "2026-09-18",
  });

  await expect(returnReferenceField).toHaveValue('RET-2026-200 "VIP"');
  await expect(customerField).toHaveValue("North Lakes");
  await expect(reasonField).toHaveValue("Late delivery");
  await expect(returnQtyField).toHaveValue("2");
  await expect(approvalStatusField).toHaveValue("Rejected");
  await expect(requestedDateField).toHaveValue("2026-09-18");
  await submitButton.click();

  await expect(result).toContainText('RET-2026-200 "VIP"');
  await expect(result).toContainText("North Lakes");
  await expect(result).toContainText("2");
});
