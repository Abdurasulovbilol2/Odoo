const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupPurchaseReceiptsPage(page, options = {}) {
  const safeOptions = {
    purchaseOrder: escapeHtml(options.purchaseOrder),
    vendor: escapeHtml(options.vendor),
    product: escapeHtml(options.product),
    orderedQuantity: escapeHtml(options.orderedQuantity),
    receivedQuantity: escapeHtml(options.receivedQuantity),
    receiptDate: escapeHtml(options.receiptDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Purchase Receipts | Odoo</title>
      </head>
      <body>
        <h1>Purchase Receipts</h1>
        <form id="receiptForm">
          <label for="purchaseOrder">Purchase order *</label>
          <input id="purchaseOrder" name="purchaseOrder" type="text" value="${safeOptions.purchaseOrder || ""}" required />

          <label for="vendor">Vendor *</label>
          <input id="vendor" name="vendor" type="text" value="${safeOptions.vendor || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="orderedQuantity">Ordered quantity *</label>
          <input id="orderedQuantity" name="orderedQuantity" type="number" step="0.01" value="${safeOptions.orderedQuantity || ""}" required />

          <label for="receivedQuantity">Received quantity *</label>
          <input id="receivedQuantity" name="receivedQuantity" type="number" step="0.01" value="${safeOptions.receivedQuantity || ""}" required />

          <label for="receiptDate">Receipt date *</label>
          <input id="receiptDate" name="receiptDate" type="date" value="${safeOptions.receiptDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Partial" ${safeOptions.status === "Partial" ? "selected" : ""}>Partial</option>
            <option value="Received" ${safeOptions.status === "Received" ? "selected" : ""}>Received</option>
            <option value="Rejected" ${safeOptions.status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>

          <button type="submit">Validate receipt</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("receiptForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const purchaseOrder = document.getElementById("purchaseOrder").value;
            const vendor = document.getElementById("vendor").value;
            const product = document.getElementById("product").value;
            const orderedQuantity = Number(document.getElementById("orderedQuantity").value);
            const receivedQuantity = Number(document.getElementById("receivedQuantity").value);
            const receiptDate = document.getElementById("receiptDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (receivedQuantity < 0 || receivedQuantity > orderedQuantity) {
              result.textContent = "Received quantity must be between 0 and ordered quantity";
              return;
            }

            result.textContent = "Receipt validated: " + [purchaseOrder, vendor, product, orderedQuantity.toFixed(2), receivedQuantity.toFixed(2), receiptDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    purchaseOrderField: page.locator("#purchaseOrder"),
    vendorField: page.locator("#vendor"),
    productField: page.locator("#product"),
    orderedQuantityField: page.locator("#orderedQuantity"),
    receivedQuantityField: page.locator("#receivedQuantity"),
    receiptDateField: page.locator("#receiptDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /validate receipt/i }),
    result: page.locator("#result"),
  };
}

test("loads the purchase receipts form", async ({ page }) => {
  const {
    purchaseOrderField,
    vendorField,
    productField,
    orderedQuantityField,
    receivedQuantityField,
    receiptDateField,
    statusField,
    submitButton,
  } = await setupPurchaseReceiptsPage(page);

  await expect(page).toHaveTitle(/Purchase Receipts/i);
  await expect(purchaseOrderField).toBeVisible();
  await expect(vendorField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(orderedQuantityField).toBeVisible();
  await expect(receivedQuantityField).toBeVisible();
  await expect(receiptDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("validates a complete purchase receipt", async ({ page }) => {
  const {
    purchaseOrderField,
    vendorField,
    productField,
    orderedQuantityField,
    receivedQuantityField,
    receiptDateField,
    statusField,
    submitButton,
    result,
  } = await setupPurchaseReceiptsPage(page);

  await purchaseOrderField.fill("PO-2026-0421");
  await vendorField.fill("Global Parts Supply");
  await productField.fill("Hydraulic Filter");
  await orderedQuantityField.fill("80");
  await receivedQuantityField.fill("80");
  await receiptDateField.fill("2026-09-22");
  await statusField.selectOption("Received");
  await submitButton.click();

  await expect(result).toHaveText(
    "Receipt validated: PO-2026-0421 | Global Parts Supply | Hydraulic Filter | 80.00 | 80.00 | 2026-09-22 | Received",
  );
});

test("requires receipt details before validation", async ({ page }) => {
  const {
    purchaseOrderField,
    vendorField,
    productField,
    orderedQuantityField,
    receivedQuantityField,
    receiptDateField,
    statusField,
    submitButton,
  } = await setupPurchaseReceiptsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      purchaseOrderField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      vendorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      orderedQuantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      receivedQuantityField.evaluate(
        (element) => element.validity.valueMissing,
      ),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      receiptDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a receipt exceeding the ordered quantity", async ({ page }) => {
  const {
    purchaseOrderField,
    vendorField,
    productField,
    orderedQuantityField,
    receivedQuantityField,
    receiptDateField,
    statusField,
    submitButton,
    result,
  } = await setupPurchaseReceiptsPage(page);

  await purchaseOrderField.fill("PO-2026-0430");
  await vendorField.fill("Metro Components");
  await productField.fill("Control Board");
  await orderedQuantityField.fill("25");
  await receivedQuantityField.fill("30");
  await receiptDateField.fill("2026-09-23");
  await statusField.selectOption("Rejected");
  await submitButton.click();

  await expect(result).toHaveText(
    "Received quantity must be between 0 and ordered quantity",
  );
});

test("keeps a pre-filled purchase receipt", async ({ page }) => {
  const {
    purchaseOrderField,
    vendorField,
    productField,
    orderedQuantityField,
    receivedQuantityField,
    receiptDateField,
    statusField,
    submitButton,
    result,
  } = await setupPurchaseReceiptsPage(page, {
    purchaseOrder: 'PO-2026-0400 "Rush"',
    vendor: "Northwind Manufacturing",
    product: "Drive Belt",
    orderedQuantity: "120",
    receivedQuantity: "100",
    receiptDate: "2026-09-20",
    status: "Received",
  });

  await expect(purchaseOrderField).toHaveValue('PO-2026-0400 "Rush"');
  await expect(vendorField).toHaveValue("Northwind Manufacturing");
  await expect(productField).toHaveValue("Drive Belt");
  await expect(orderedQuantityField).toHaveValue("120");
  await expect(receivedQuantityField).toHaveValue("100");
  await expect(receiptDateField).toHaveValue("2026-09-20");
  await expect(statusField).toHaveValue("Received");
  await submitButton.click();

  await expect(result).toContainText('PO-2026-0400 "Rush"');
  await expect(result).toContainText("Northwind Manufacturing");
  await expect(result).toContainText("Received");
});
