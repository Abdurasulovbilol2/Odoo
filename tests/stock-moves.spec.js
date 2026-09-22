const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupStockMovesPage(page, options = {}) {
  const safeOptions = {
    product: escapeHtml(options.product),
    fromLocation: escapeHtml(options.fromLocation),
    toLocation: escapeHtml(options.toLocation),
    quantity: escapeHtml(options.quantity),
    movementDate: escapeHtml(options.movementDate),
    movementType: escapeHtml(options.movementType),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Stock Moves | Odoo</title>
      </head>
      <body>
        <h1>Stock Moves</h1>
        <form id="moveForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="fromLocation">From location *</label>
          <input id="fromLocation" name="fromLocation" type="text" value="${safeOptions.fromLocation || ""}" required />

          <label for="toLocation">To location *</label>
          <input id="toLocation" name="toLocation" type="text" value="${safeOptions.toLocation || ""}" required />

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" step="0.01" value="${safeOptions.quantity || ""}" required />

          <label for="movementDate">Movement date *</label>
          <input id="movementDate" name="movementDate" type="date" value="${safeOptions.movementDate || ""}" required />

          <label for="movementType">Movement type *</label>
          <select id="movementType" name="movementType" required>
            <option value="">Select type</option>
            <option value="Internal transfer" ${safeOptions.movementType === "Internal transfer" ? "selected" : ""}>Internal transfer</option>
            <option value="Receipt" ${safeOptions.movementType === "Receipt" ? "selected" : ""}>Receipt</option>
            <option value="Delivery" ${safeOptions.movementType === "Delivery" ? "selected" : ""}>Delivery</option>
            <option value="Adjustment" ${safeOptions.movementType === "Adjustment" ? "selected" : ""}>Adjustment</option>
          </select>

          <button type="submit">Register move</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("moveForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const product = document.getElementById("product").value;
            const fromLocation = document.getElementById("fromLocation").value;
            const toLocation = document.getElementById("toLocation").value;
            const quantity = Number(document.getElementById("quantity").value);
            const movementDate = document.getElementById("movementDate").value;
            const movementType = document.getElementById("movementType").value;
            const result = document.getElementById("result");

            if (quantity <= 0) {
              result.textContent = "Quantity must be greater than zero";
              return;
            }

            if (fromLocation === toLocation) {
              result.textContent = "Source and destination locations must be different";
              return;
            }

            result.textContent = "Move registered: " + [product, fromLocation, toLocation, quantity.toFixed(2), movementType, movementDate].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    fromLocationField: page.locator("#fromLocation"),
    toLocationField: page.locator("#toLocation"),
    quantityField: page.locator("#quantity"),
    movementDateField: page.locator("#movementDate"),
    movementTypeField: page.locator("#movementType"),
    submitButton: page.getByRole("button", { name: /register move/i }),
    result: page.locator("#result"),
  };
}

test("loads the stock moves form", async ({ page }) => {
  const {
    productField,
    fromLocationField,
    toLocationField,
    quantityField,
    movementDateField,
    movementTypeField,
    submitButton,
  } = await setupStockMovesPage(page);

  await expect(page).toHaveTitle(/Stock Moves/i);
  await expect(productField).toBeVisible();
  await expect(fromLocationField).toBeVisible();
  await expect(toLocationField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(movementDateField).toBeVisible();
  await expect(movementTypeField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("registers a valid stock move", async ({ page }) => {
  const {
    productField,
    fromLocationField,
    toLocationField,
    quantityField,
    movementDateField,
    movementTypeField,
    submitButton,
    result,
  } = await setupStockMovesPage(page);

  await productField.fill("Industrial Sensor");
  await fromLocationField.fill("Rack A-01");
  await toLocationField.fill("Rack B-03");
  await quantityField.fill("12");
  await movementDateField.fill("2026-09-22");
  await movementTypeField.selectOption("Internal transfer");
  await submitButton.click();

  await expect(result).toHaveText(
    "Move registered: Industrial Sensor | Rack A-01 | Rack B-03 | 12.00 | Internal transfer | 2026-09-22",
  );
});

test("requires all move details before registration", async ({ page }) => {
  const {
    productField,
    fromLocationField,
    toLocationField,
    quantityField,
    movementDateField,
    movementTypeField,
    submitButton,
  } = await setupStockMovesPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      fromLocationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      toLocationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      movementDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      movementTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative quantities", async ({ page }) => {
  const {
    productField,
    fromLocationField,
    toLocationField,
    quantityField,
    movementDateField,
    movementTypeField,
    submitButton,
    result,
  } = await setupStockMovesPage(page);

  await productField.fill("Safety Goggles");
  await fromLocationField.fill("Bin 17");
  await toLocationField.fill("Bin 18");
  await quantityField.fill("0");
  await movementDateField.fill("2026-09-23");
  await movementTypeField.selectOption("Adjustment");
  await submitButton.click();

  await expect(result).toHaveText("Quantity must be greater than zero");
});

test("keeps a pre-filled stock move", async ({ page }) => {
  const {
    productField,
    fromLocationField,
    toLocationField,
    quantityField,
    movementDateField,
    movementTypeField,
    submitButton,
    result,
  } = await setupStockMovesPage(page, {
    product: 'Assembly Kit "Pro"',
    fromLocation: "Warehouse 1",
    toLocation: "Warehouse 2",
    quantity: "30",
    movementDate: "2026-09-20",
    movementType: "Receipt",
  });

  await expect(productField).toHaveValue('Assembly Kit "Pro"');
  await expect(fromLocationField).toHaveValue("Warehouse 1");
  await expect(toLocationField).toHaveValue("Warehouse 2");
  await expect(quantityField).toHaveValue("30");
  await expect(movementDateField).toHaveValue("2026-09-20");
  await expect(movementTypeField).toHaveValue("Receipt");
  await submitButton.click();

  await expect(result).toContainText('Assembly Kit "Pro"');
  await expect(result).toContainText("Warehouse 1");
  await expect(result).toContainText("30.00");
});
