const { test, expect } = require("@playwright/test");

async function setupInventoryPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Inventory | Odoo</title></head>
      <body>
        <h1>Inventory Transfers</h1>
        <form id="transferForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${options.product || ""}" required />
          <label for="operation">Operation *</label>
          <select id="operation" name="operation" required>
            <option value="">Select an operation</option>
            <option value="receipt" ${options.operation === "receipt" ? "selected" : ""}>Receipt</option>
            <option value="delivery" ${options.operation === "delivery" ? "selected" : ""}>Delivery</option>
            <option value="internal" ${options.operation === "internal" ? "selected" : ""}>Internal transfer</option>
          </select>
          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" value="${options.quantity || ""}" required />
          <label for="location">Destination location *</label>
          <input id="location" name="location" type="text" value="${options.location || ""}" required />
          <button type="submit">Validate transfer</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("transferForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["product", "operation", "quantity", "location"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            document.getElementById("result").textContent = "Transfer validated: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    operationField: page.locator("#operation"),
    quantityField: page.locator("#quantity"),
    locationField: page.locator("#location"),
    submitButton: page.getByRole("button", { name: /validate transfer/i }),
    result: page.locator("#result"),
  };
}

test("loads the inventory transfer form", async ({ page }) => {
  const {
    productField,
    operationField,
    quantityField,
    locationField,
    submitButton,
  } = await setupInventoryPage(page);

  await expect(page).toHaveTitle(/Inventory/i);
  await expect(productField).toBeVisible();
  await expect(operationField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(locationField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("validates an inventory receipt", async ({ page }) => {
  const {
    productField,
    operationField,
    quantityField,
    locationField,
    submitButton,
    result,
  } = await setupInventoryPage(page);

  await productField.fill("Office chair");
  await operationField.selectOption("receipt");
  await quantityField.fill("25");
  await locationField.fill("WH/Stock");
  await submitButton.click();

  await expect(result).toHaveText(
    "Transfer validated: Office chair | receipt | 25 | WH/Stock",
  );
});

test("requires product, operation, quantity, and location", async ({
  page,
}) => {
  const {
    productField,
    operationField,
    quantityField,
    locationField,
    submitButton,
  } = await setupInventoryPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      operationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      locationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero inventory quantity", async ({ page }) => {
  const {
    productField,
    operationField,
    quantityField,
    locationField,
    submitButton,
  } = await setupInventoryPage(page, {
    product: "Office chair",
    operation: "delivery",
    quantity: "0",
    location: "WH/Output",
  });

  await productField.fill("Office chair");
  await operationField.selectOption("delivery");
  await locationField.fill("WH/Output");
  await submitButton.click();

  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.rangeUnderflow),
    )
    .toBeTruthy();
});

test("validates an internal stock transfer", async ({ page }) => {
  const {
    productField,
    operationField,
    quantityField,
    locationField,
    submitButton,
    result,
  } = await setupInventoryPage(page, {
    product: "Laptop",
    operation: "internal",
    quantity: "3",
    location: "WH/Stock/Shelf 2",
  });

  await expect(operationField).toHaveValue("internal");
  await submitButton.click();

  await expect(result).toContainText("Laptop");
  await expect(result).toContainText("internal");
  await expect(result).toContainText("WH/Stock/Shelf 2");
});
