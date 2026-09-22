const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupLotTraceabilityPage(page, options = {}) {
  const safeOptions = {
    lotNumber: escapeHtml(options.lotNumber),
    product: escapeHtml(options.product),
    warehouse: escapeHtml(options.warehouse),
    quantity: escapeHtml(options.quantity),
    expiryDate: escapeHtml(options.expiryDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Lot Traceability | Odoo</title>
      </head>
      <body>
        <h1>Lot Traceability</h1>
        <form id="traceabilityForm">
          <label for="lotNumber">Lot number *</label>
          <input id="lotNumber" name="lotNumber" type="text" value="${safeOptions.lotNumber || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" step="0.01" value="${safeOptions.quantity || ""}" required />

          <label for="expiryDate">Expiry date *</label>
          <input id="expiryDate" name="expiryDate" type="date" value="${safeOptions.expiryDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Available" ${safeOptions.status === "Available" ? "selected" : ""}>Available</option>
            <option value="Reserved" ${safeOptions.status === "Reserved" ? "selected" : ""}>Reserved</option>
            <option value="Quarantined" ${safeOptions.status === "Quarantined" ? "selected" : ""}>Quarantined</option>
            <option value="Expired" ${safeOptions.status === "Expired" ? "selected" : ""}>Expired</option>
          </select>

          <button type="submit">Save lot</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("traceabilityForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const lotNumber = document.getElementById("lotNumber").value;
            const product = document.getElementById("product").value;
            const warehouse = document.getElementById("warehouse").value;
            const quantity = Number(document.getElementById("quantity").value);
            const expiryDate = document.getElementById("expiryDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (quantity <= 0) {
              result.textContent = "Quantity must be greater than zero";
              return;
            }

            if (status === "Expired" && expiryDate) {
              const today = new Date();
              const expiry = new Date(expiryDate + "T00:00:00");
              if (expiry < today) {
                result.textContent = "Lot is expired and cannot be available in stock";
                return;
              }
            }

            result.textContent = "Lot saved: " + [lotNumber, product, warehouse, quantity.toFixed(2), expiryDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    lotNumberField: page.locator("#lotNumber"),
    productField: page.locator("#product"),
    warehouseField: page.locator("#warehouse"),
    quantityField: page.locator("#quantity"),
    expiryDateField: page.locator("#expiryDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save lot/i }),
    result: page.locator("#result"),
  };
}

test("loads the lot traceability form", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
  } = await setupLotTraceabilityPage(page);

  await expect(page).toHaveTitle(/Lot Traceability/i);
  await expect(lotNumberField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(warehouseField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(expiryDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("records a valid lot traceability entry", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
    result,
  } = await setupLotTraceabilityPage(page);

  await lotNumberField.fill("LOT-2026-1001");
  await productField.fill("Organic Almonds");
  await warehouseField.fill("Cold Store A");
  await quantityField.fill("120");
  await expiryDateField.fill("2027-02-15");
  await statusField.selectOption("Available");
  await submitButton.click();

  await expect(result).toHaveText(
    "Lot saved: LOT-2026-1001 | Organic Almonds | Cold Store A | 120.00 | 2027-02-15 | Available",
  );
});

test("requires all lot details before saving", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
  } = await setupLotTraceabilityPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      lotNumberField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      warehouseField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      expiryDateField.evaluate((element) => element.validity.valueMissing),
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
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
    result,
  } = await setupLotTraceabilityPage(page);

  await lotNumberField.fill("LOT-2026-1010");
  await productField.fill("Dried Fruit");
  await warehouseField.fill("Dry Store");
  await quantityField.fill("0");
  await expiryDateField.fill("2027-01-25");
  await statusField.selectOption("Reserved");
  await submitButton.click();

  await expect(result).toHaveText("Quantity must be greater than zero");
});

test("keeps a pre-filled lot traceability record", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
    result,
  } = await setupLotTraceabilityPage(page, {
    lotNumber: 'LOT-2026-2000 "Bulk"',
    product: "Cocoa Beans",
    warehouse: "Warehouse 7",
    quantity: "55",
    expiryDate: "2026-11-30",
    status: "Quarantined",
  });

  await expect(lotNumberField).toHaveValue('LOT-2026-2000 "Bulk"');
  await expect(productField).toHaveValue("Cocoa Beans");
  await expect(warehouseField).toHaveValue("Warehouse 7");
  await expect(quantityField).toHaveValue("55");
  await expect(expiryDateField).toHaveValue("2026-11-30");
  await expect(statusField).toHaveValue("Quarantined");
  await submitButton.click();

  await expect(result).toContainText('LOT-2026-2000 "Bulk"');
  await expect(result).toContainText("Cocoa Beans");
  await expect(result).toContainText("55.00");
});
