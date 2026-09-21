const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupReplenishmentPage(page, options = {}) {
  const safeOptions = {
    product: escapeHtml(options.product),
    warehouse: escapeHtml(options.warehouse),
    supplier: escapeHtml(options.supplier),
    currentStock: escapeHtml(options.currentStock),
    minimumStock: escapeHtml(options.minimumStock),
    reorderQuantity: escapeHtml(options.reorderQuantity),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Replenishment | Odoo</title>
      </head>
      <body>
        <h1>Replenishment</h1>
        <form id="replenishmentForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="supplier">Supplier *</label>
          <input id="supplier" name="supplier" type="text" value="${safeOptions.supplier || ""}" required />

          <label for="currentStock">Current stock *</label>
          <input id="currentStock" name="currentStock" type="number" step="1" value="${safeOptions.currentStock || ""}" required />

          <label for="minimumStock">Minimum stock *</label>
          <input id="minimumStock" name="minimumStock" type="number" step="1" value="${safeOptions.minimumStock || ""}" required />

          <label for="reorderQuantity">Reorder quantity *</label>
          <input id="reorderQuantity" name="reorderQuantity" type="number" step="1" value="${safeOptions.reorderQuantity || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Requested" ${safeOptions.status === "Requested" ? "selected" : ""}>Requested</option>
            <option value="Ordered" ${safeOptions.status === "Ordered" ? "selected" : ""}>Ordered</option>
          </select>

          <button type="submit">Create replenishment</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("replenishmentForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const product = document.getElementById("product").value;
            const warehouse = document.getElementById("warehouse").value;
            const supplier = document.getElementById("supplier").value;
            const currentStock = Number(document.getElementById("currentStock").value);
            const minimumStock = Number(document.getElementById("minimumStock").value);
            const reorderQuantity = Number(document.getElementById("reorderQuantity").value);
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (currentStock < 0 || minimumStock < 0 || reorderQuantity <= 0) {
              result.textContent = "Stock values must be valid positive quantities";
              return;
            }

            if (currentStock >= minimumStock && status === "Requested") {
              result.textContent = "Replenishment is only required below minimum stock";
              return;
            }

            result.textContent = "Replenishment created: " + [product, warehouse, supplier, currentStock, minimumStock, reorderQuantity, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    warehouseField: page.locator("#warehouse"),
    supplierField: page.locator("#supplier"),
    currentStockField: page.locator("#currentStock"),
    minimumStockField: page.locator("#minimumStock"),
    reorderQuantityField: page.locator("#reorderQuantity"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /create replenishment/i }),
    result: page.locator("#result"),
  };
}

test("loads the replenishment form", async ({ page }) => {
  const {
    productField,
    warehouseField,
    supplierField,
    currentStockField,
    minimumStockField,
    reorderQuantityField,
    statusField,
    submitButton,
  } = await setupReplenishmentPage(page);

  await expect(page).toHaveTitle(/Replenishment/i);
  await expect(productField).toBeVisible();
  await expect(warehouseField).toBeVisible();
  await expect(supplierField).toBeVisible();
  await expect(currentStockField).toBeVisible();
  await expect(minimumStockField).toBeVisible();
  await expect(reorderQuantityField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a valid replenishment request", async ({ page }) => {
  const {
    productField,
    warehouseField,
    supplierField,
    currentStockField,
    minimumStockField,
    reorderQuantityField,
    statusField,
    submitButton,
    result,
  } = await setupReplenishmentPage(page);

  await productField.fill("Thermal Labels");
  await warehouseField.fill("Central Warehouse");
  await supplierField.fill("Supply House Ltd");
  await currentStockField.fill("120");
  await minimumStockField.fill("500");
  await reorderQuantityField.fill("1000");
  await statusField.selectOption("Requested");
  await submitButton.click();

  await expect(result).toHaveText(
    "Replenishment created: Thermal Labels | Central Warehouse | Supply House Ltd | 120 | 500 | 1000 | Requested",
  );
});

test("requires replenishment details before saving", async ({ page }) => {
  const {
    productField,
    warehouseField,
    supplierField,
    currentStockField,
    minimumStockField,
    reorderQuantityField,
    statusField,
    submitButton,
  } = await setupReplenishmentPage(page);

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
      supplierField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      currentStockField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      minimumStockField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      reorderQuantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects replenishment when stock is already sufficient", async ({
  page,
}) => {
  const {
    productField,
    warehouseField,
    supplierField,
    currentStockField,
    minimumStockField,
    reorderQuantityField,
    statusField,
    submitButton,
    result,
  } = await setupReplenishmentPage(page);

  await productField.fill("Printer Toner");
  await warehouseField.fill("North Hub");
  await supplierField.fill("Office Supply Co");
  await currentStockField.fill("700");
  await minimumStockField.fill("500");
  await reorderQuantityField.fill("200");
  await statusField.selectOption("Requested");
  await submitButton.click();

  await expect(result).toHaveText(
    "Replenishment is only required below minimum stock",
  );
});

test("keeps a pre-filled replenishment request", async ({ page }) => {
  const {
    productField,
    warehouseField,
    supplierField,
    currentStockField,
    minimumStockField,
    reorderQuantityField,
    statusField,
    submitButton,
    result,
  } = await setupReplenishmentPage(page, {
    product: 'Safety Gloves "XL"',
    warehouse: "South Depot",
    supplier: "SafeWork Supplies",
    currentStock: "40",
    minimumStock: "250",
    reorderQuantity: "600",
    status: "Ordered",
  });

  await expect(productField).toHaveValue('Safety Gloves "XL"');
  await expect(warehouseField).toHaveValue("South Depot");
  await expect(supplierField).toHaveValue("SafeWork Supplies");
  await expect(currentStockField).toHaveValue("40");
  await expect(minimumStockField).toHaveValue("250");
  await expect(reorderQuantityField).toHaveValue("600");
  await expect(statusField).toHaveValue("Ordered");
  await submitButton.click();

  await expect(result).toContainText('Safety Gloves "XL"');
  await expect(result).toContainText("SafeWork Supplies");
  await expect(result).toContainText("Ordered");
});
