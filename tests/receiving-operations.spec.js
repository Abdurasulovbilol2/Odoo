const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupReceivingOperationsPage(page, options = {}) {
  const safeOptions = {
    receiptReference: escapeHtml(options.receiptReference),
    supplier: escapeHtml(options.supplier),
    warehouse: escapeHtml(options.warehouse),
    product: escapeHtml(options.product),
    quantity: escapeHtml(options.quantity),
    receivedDate: escapeHtml(options.receivedDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Receiving Operations | Odoo</title>
      </head>
      <body>
        <h1>Receiving Operations</h1>
        <form id="receivingForm">
          <label for="receiptReference">Receipt reference *</label>
          <input id="receiptReference" name="receiptReference" type="text" value="${safeOptions.receiptReference || ""}" required />

          <label for="supplier">Supplier *</label>
          <input id="supplier" name="supplier" type="text" value="${safeOptions.supplier || ""}" required />

          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="quantity">Quantity received *</label>
          <input id="quantity" name="quantity" type="number" step="0.01" value="${safeOptions.quantity || ""}" required />

          <label for="receivedDate">Received date *</label>
          <input id="receivedDate" name="receivedDate" type="date" value="${safeOptions.receivedDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Received" ${safeOptions.status === "Received" ? "selected" : ""}>Received</option>
            <option value="Inspected" ${safeOptions.status === "Inspected" ? "selected" : ""}>Inspected</option>
            <option value="Rejected" ${safeOptions.status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>

          <button type="submit">Confirm receipt</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("receivingForm").addEventListener("submit", (event) => {
            event.preventDefault();

            const receiptReference = document.getElementById("receiptReference").value.trim();
            const supplier = document.getElementById("supplier").value.trim();
            const warehouse = document.getElementById("warehouse").value.trim();
            const product = document.getElementById("product").value.trim();
            const quantity = Number(document.getElementById("quantity").value);
            const receivedDate = document.getElementById("receivedDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (quantity <= 0) {
              result.textContent = "Quantity must be greater than zero";
              return;
            }

            if (status === "Rejected" && quantity > 0) {
              result.textContent = "Rejected items need a quality problem note";
              return;
            }

            result.textContent = "Receipt confirmed: " + [receiptReference, supplier, warehouse, product, quantity.toFixed(2), receivedDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    receiptReferenceField: page.locator("#receiptReference"),
    supplierField: page.locator("#supplier"),
    warehouseField: page.locator("#warehouse"),
    productField: page.locator("#product"),
    quantityField: page.locator("#quantity"),
    receivedDateField: page.locator("#receivedDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /confirm receipt/i }),
    result: page.locator("#result"),
  };
}

test("loads the receiving operations form", async ({ page }) => {
  const {
    receiptReferenceField,
    supplierField,
    warehouseField,
    productField,
    quantityField,
    receivedDateField,
    statusField,
    submitButton,
  } = await setupReceivingOperationsPage(page);

  await expect(page).toHaveTitle(/Receiving Operations/i);
  await expect(receiptReferenceField).toBeVisible();
  await expect(supplierField).toBeVisible();
  await expect(warehouseField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(receivedDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("confirms a valid receipt", async ({ page }) => {
  const {
    receiptReferenceField,
    supplierField,
    warehouseField,
    productField,
    quantityField,
    receivedDateField,
    statusField,
    submitButton,
    result,
  } = await setupReceivingOperationsPage(page);

  await receiptReferenceField.fill("RCPT-901");
  await supplierField.fill("Northwind Supply");
  await warehouseField.fill("Main Warehouse");
  await productField.fill("Industrial Cable");
  await quantityField.fill("120");
  await receivedDateField.fill("2026-09-25");
  await statusField.selectOption("Received");
  await submitButton.click();

  await expect(result).toHaveText(
    "Receipt confirmed: RCPT-901 | Northwind Supply | Main Warehouse | Industrial Cable | 120.00 | 2026-09-25 | Received",
  );
});

test("requires all receipt details before confirmation", async ({ page }) => {
  const {
    receiptReferenceField,
    supplierField,
    warehouseField,
    productField,
    quantityField,
    receivedDateField,
    statusField,
    submitButton,
  } = await setupReceivingOperationsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      receiptReferenceField.evaluate(
        (element) => element.validity.valueMissing,
      ),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      supplierField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      warehouseField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      receivedDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative quantities", async ({ page }) => {
  const {
    receiptReferenceField,
    supplierField,
    warehouseField,
    productField,
    quantityField,
    receivedDateField,
    statusField,
    submitButton,
    result,
  } = await setupReceivingOperationsPage(page);

  await receiptReferenceField.fill("RCPT-912");
  await supplierField.fill("BluePeak Trading");
  await warehouseField.fill("Secondary Dock");
  await productField.fill("Safety Gloves");
  await quantityField.fill("0");
  await receivedDateField.fill("2026-09-26");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Quantity must be greater than zero");
});

test("requires a quality note for rejected receipts", async ({ page }) => {
  const {
    receiptReferenceField,
    supplierField,
    warehouseField,
    productField,
    quantityField,
    receivedDateField,
    statusField,
    submitButton,
    result,
  } = await setupReceivingOperationsPage(page);

  await receiptReferenceField.fill("RCPT-923");
  await supplierField.fill("Urban Goods Ltd");
  await warehouseField.fill("Inspection Bay");
  await productField.fill("Packing Foam");
  await quantityField.fill("15");
  await receivedDateField.fill("2026-09-27");
  await statusField.selectOption("Rejected");
  await submitButton.click();

  await expect(result).toHaveText("Rejected items need a quality problem note");
});
