 mconst { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupInventoryValuationPage(page, options = {}) {
  const safeOptions = {
    product: escapeHtml(options.product),
    warehouse: escapeHtml(options.warehouse),
    movementType: escapeHtml(options.movementType),
    quantity: escapeHtml(options.quantity),
    unitCost: escapeHtml(options.unitCost),
    movementDate: escapeHtml(options.movementDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Inventory Valuation | Odoo</title>
      </head>
      <body>
        <h1>Inventory Valuation</h1>
        <form id="valuationForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="movementType">Movement type *</label>
          <select id="movementType" name="movementType" required>
            <option value="">Select movement</option>
            <option value="Receipt" ${safeOptions.movementType === "Receipt" ? "selected" : ""}>Receipt</option>
            <option value="Delivery" ${safeOptions.movementType === "Delivery" ? "selected" : ""}>Delivery</option>
            <option value="Adjustment" ${safeOptions.movementType === "Adjustment" ? "selected" : ""}>Adjustment</option>
          </select>

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" step="0.01" value="${safeOptions.quantity || ""}" required />

          <label for="unitCost">Unit cost *</label>
          <input id="unitCost" name="unitCost" type="number" step="0.01" value="${safeOptions.unitCost || ""}" required />

          <label for="movementDate">Movement date *</label>
          <input id="movementDate" name="movementDate" type="date" value="${safeOptions.movementDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Posted" ${safeOptions.status === "Posted" ? "selected" : ""}>Posted</option>
            <option value="Cancelled" ${safeOptions.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>

          <button type="submit">Post valuation</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("valuationForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const product = document.getElementById("product").value;
            const warehouse = document.getElementById("warehouse").value;
            const movementType = document.getElementById("movementType").value;
            const quantity = Number(document.getElementById("quantity").value);
            const unitCost = Number(document.getElementById("unitCost").value);
            const movementDate = document.getElementById("movementDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (quantity <= 0) {
              result.textContent = "Quantity must be greater than 0";
              return;
            }

            if (unitCost < 0) {
              result.textContent = "Unit cost cannot be negative";
              return;
            }

            const totalValue = (quantity * unitCost).toFixed(2);
            result.textContent = "Valuation posted: " + [product, warehouse, movementType, quantity.toFixed(2), unitCost.toFixed(2), movementDate, status, totalValue].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    warehouseField: page.locator("#warehouse"),
    movementTypeField: page.locator("#movementType"),
    quantityField: page.locator("#quantity"),
    unitCostField: page.locator("#unitCost"),
    movementDateField: page.locator("#movementDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /post valuation/i }),
    result: page.locator("#result"),
  };
}

test("loads the inventory valuation form", async ({ page }) => {
  const {
    productField,
    warehouseField,
    movementTypeField,
    quantityField,
    unitCostField,
    movementDateField,
    statusField,
    submitButton,
  } = await setupInventoryValuationPage(page);

  await expect(page).toHaveTitle(/Inventory Valuation/i);
  await expect(productField).toBeVisible();
  await expect(warehouseField).toBeVisible();
  await expect(movementTypeField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(unitCostField).toBeVisible();
  await expect(movementDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("posts a valid inventory valuation", async ({ page }) => {
  const {
    productField,
    warehouseField,
    movementTypeField,
    quantityField,
    unitCostField,
    movementDateField,
    statusField,
    submitButton,
    result,
  } = await setupInventoryValuationPage(page);

  await productField.fill("Industrial Sensor");
  await warehouseField.fill("Central Warehouse");
  await movementTypeField.selectOption("Receipt");
  await quantityField.fill("24");
  await unitCostField.fill("125.50");
  await movementDateField.fill("2026-09-20");
  await statusField.selectOption("Posted");
  await submitButton.click();

  await expect(result).toHaveText(
    "Valuation posted: Industrial Sensor | Central Warehouse | Receipt | 24.00 | 125.50 | 2026-09-20 | Posted | 3012.00",
  );
});

test("requires valuation details before posting", async ({ page }) => {
  const {
    productField,
    warehouseField,
    movementTypeField,
    quantityField,
    unitCostField,
    movementDateField,
    statusField,
    submitButton,
  } = await setupInventoryValuationPage(page);

  await submitButton.click();

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
      movementTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      unitCostField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      movementDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero or negative quantity", async ({ page }) => {
  const {
    productField,
    warehouseField,
    movementTypeField,
    quantityField,
    unitCostField,
    movementDateField,
    statusField,
    submitButton,
    result,
  } = await setupInventoryValuationPage(page);

  await productField.fill("Packing Tape");
  await warehouseField.fill("Returns Warehouse");
  await movementTypeField.selectOption("Adjustment");
  await quantityField.fill("0");
  await unitCostField.fill("6.50");
  await movementDateField.fill("2026-09-22");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Quantity must be greater than 0");
});

test("keeps a pre-filled inventory valuation", async ({ page }) => {
  const {
    productField,
    warehouseField,
    movementTypeField,
    quantityField,
    unitCostField,
    movementDateField,
    statusField,
    submitButton,
    result,
  } = await setupInventoryValuationPage(page, {
    product: 'Control Module "X2"',
    warehouse: "North Hub",
    movementType: "Delivery",
    quantity: "10",
    unitCost: "88.40",
    movementDate: "2026-09-24",
    status: "Posted",
  });

  await expect(productField).toHaveValue('Control Module "X2"');
  await expect(warehouseField).toHaveValue("North Hub");
  await expect(movementTypeField).toHaveValue("Delivery");
  await expect(quantityField).toHaveValue("10");
  await expect(unitCostField).toHaveValue("88.40");
  await expect(movementDateField).toHaveValue("2026-09-24");
  await expect(statusField).toHaveValue("Posted");
  await submitButton.click();

  await expect(result).toContainText('Control Module "X2"');
  await expect(result).toContainText("North Hub");
  await expect(result).toContainText("884.00");
});
