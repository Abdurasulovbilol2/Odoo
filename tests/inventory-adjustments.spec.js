const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupInventoryAdjustmentsPage(page, options = {}) {
  const safeOptions = {
    warehouse: escapeHtml(options.warehouse),
    product: escapeHtml(options.product),
    expectedQty: escapeHtml(options.expectedQty),
    countedQty: escapeHtml(options.countedQty),
    reason: escapeHtml(options.reason),
    adjustedDate: escapeHtml(options.adjustedDate),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Inventory Adjustments | Odoo</title>
      </head>
      <body>
        <h1>Inventory Adjustments</h1>
        <form id="adjustmentForm">
          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="expectedQty">Expected quantity *</label>
          <input id="expectedQty" name="expectedQty" type="number" step="0.01" value="${safeOptions.expectedQty || ""}" required />

          <label for="countedQty">Counted quantity *</label>
          <input id="countedQty" name="countedQty" type="number" step="0.01" value="${safeOptions.countedQty || ""}" required />

          <label for="reason">Adjustment reason *</label>
          <select id="reason" name="reason" required>
            <option value="">Select reason</option>
            <option value="Cycle count" ${safeOptions.reason === "Cycle count" ? "selected" : ""}>Cycle count</option>
            <option value="Damage" ${safeOptions.reason === "Damage" ? "selected" : ""}>Damage</option>
            <option value="Shrinkage" ${safeOptions.reason === "Shrinkage" ? "selected" : ""}>Shrinkage</option>
            <option value="Inventory transfer" ${safeOptions.reason === "Inventory transfer" ? "selected" : ""}>Inventory transfer</option>
            <option value="Customer return" ${safeOptions.reason === "Customer return" ? "selected" : ""}>Customer return</option>
          </select>

          <label for="adjustedDate">Adjusted date *</label>
          <input id="adjustedDate" name="adjustedDate" type="date" value="${safeOptions.adjustedDate || ""}" required />

          <button type="submit">Record adjustment</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("adjustmentForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const warehouse = document.getElementById("warehouse").value;
            const product = document.getElementById("product").value;
            const expectedQty = Number(document.getElementById("expectedQty").value);
            const countedQty = Number(document.getElementById("countedQty").value);
            const reason = document.getElementById("reason").value;
            const adjustedDate = document.getElementById("adjustedDate").value;
            const result = document.getElementById("result");

            if (countedQty < 0) {
              result.textContent = "Counted quantity cannot be negative";
              return;
            }

            const difference = countedQty - expectedQty;
            if (difference === 0) {
              result.textContent = "No adjustment needed for " + product + " in " + warehouse;
              return;
            }

            const sign = difference > 0 ? "+" : "";
            result.textContent = "Adjustment recorded: " + [warehouse, product, expectedQty.toFixed(2), countedQty.toFixed(2), sign + difference.toFixed(2), reason, adjustedDate].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    warehouseField: page.locator("#warehouse"),
    productField: page.locator("#product"),
    expectedQtyField: page.locator("#expectedQty"),
    countedQtyField: page.locator("#countedQty"),
    reasonField: page.locator("#reason"),
    adjustedDateField: page.locator("#adjustedDate"),
    submitButton: page.getByRole("button", { name: /record adjustment/i }),
    result: page.locator("#result"),
  };
}

test("loads the inventory adjustments form", async ({ page }) => {
  const {
    warehouseField,
    productField,
    expectedQtyField,
    countedQtyField,
    reasonField,
    adjustedDateField,
    submitButton,
  } = await setupInventoryAdjustmentsPage(page);

  await expect(page).toHaveTitle(/Inventory Adjustments/i);
  await expect(warehouseField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(expectedQtyField).toBeVisible();
  await expect(countedQtyField).toBeVisible();
  await expect(reasonField).toBeVisible();
  await expect(adjustedDateField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("records a valid inventory adjustment", async ({ page }) => {
  const {
    warehouseField,
    productField,
    expectedQtyField,
    countedQtyField,
    reasonField,
    adjustedDateField,
    submitButton,
    result,
  } = await setupInventoryAdjustmentsPage(page);

  await warehouseField.fill("Main Warehouse");
  await productField.fill("Anti-static gloves");
  await expectedQtyField.fill("40");
  await countedQtyField.fill("48");
  await reasonField.selectOption("Cycle count");
  await adjustedDateField.fill("2026-09-22");
  await submitButton.click();

  await expect(result).toHaveText(
    "Adjustment recorded: Main Warehouse | Anti-static gloves | 40.00 | 48.00 | +8.00 | Cycle count | 2026-09-22",
  );
});

test("requires all adjustment fields before recording", async ({ page }) => {
  const {
    warehouseField,
    productField,
    expectedQtyField,
    countedQtyField,
    reasonField,
    adjustedDateField,
    submitButton,
  } = await setupInventoryAdjustmentsPage(page);

  await submitButton.click();

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
      expectedQtyField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      countedQtyField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      reasonField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      adjustedDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a negative counted quantity", async ({ page }) => {
  const {
    warehouseField,
    productField,
    expectedQtyField,
    countedQtyField,
    reasonField,
    adjustedDateField,
    submitButton,
    result,
  } = await setupInventoryAdjustmentsPage(page);

  await warehouseField.fill("Cold Storage");
  await productField.fill("Frozen peas");
  await expectedQtyField.fill("15");
  await countedQtyField.fill("-2");
  await reasonField.selectOption("Damage");
  await adjustedDateField.fill("2026-09-23");
  await submitButton.click();

  await expect(result).toHaveText("Counted quantity cannot be negative");
});

test("keeps a pre-filled inventory adjustment", async ({ page }) => {
  const {
    warehouseField,
    productField,
    expectedQtyField,
    countedQtyField,
    reasonField,
    adjustedDateField,
    submitButton,
    result,
  } = await setupInventoryAdjustmentsPage(page, {
    warehouse: "West Hub",
    product: 'Packaging Tape "Heavy"',
    expectedQty: "60",
    countedQty: "58",
    reason: "Shrinkage",
    adjustedDate: "2026-09-20",
  });

  await expect(warehouseField).toHaveValue("West Hub");
  await expect(productField).toHaveValue('Packaging Tape "Heavy"');
  await expect(expectedQtyField).toHaveValue("60");
  await expect(countedQtyField).toHaveValue("58");
  await expect(reasonField).toHaveValue("Shrinkage");
  await expect(adjustedDateField).toHaveValue("2026-09-20");
  await submitButton.click();

  await expect(result).toContainText('Packaging Tape "Heavy"');
  await expect(result).toContainText("West Hub");
  await expect(result).toContainText("-2.00");
});
