const { test, expect } = require("@playwright/test");

async function setupBarcodePage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Barcode Operations | Odoo</title>
      </head>
      <body>
        <h1>Barcode Operations</h1>
        <form id="barcodeForm">
          <label for="barcode">Product barcode *</label>
          <input id="barcode" name="barcode" type="text" pattern="[0-9]{8,14}" value="${options.barcode || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${options.product || ""}" required />

          <label for="operation">Operation *</label>
          <select id="operation" name="operation" required>
            <option value="">Select operation</option>
            <option value="Receipt" ${options.operation === "Receipt" ? "selected" : ""}>Receipt</option>
            <option value="Delivery" ${options.operation === "Delivery" ? "selected" : ""}>Delivery</option>
            <option value="Internal transfer" ${options.operation === "Internal transfer" ? "selected" : ""}>Internal transfer</option>
          </select>

          <label for="location">Destination location *</label>
          <input id="location" name="location" type="text" value="${options.location || ""}" required />

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" step="1" value="${options.quantity || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Ready" ${options.status === "Ready" ? "selected" : ""}>Ready</option>
            <option value="Scanned" ${options.status === "Scanned" ? "selected" : ""}>Scanned</option>
            <option value="Done" ${options.status === "Done" ? "selected" : ""}>Done</option>
          </select>

          <button type="submit">Process scan</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("barcodeForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("barcode").value,
              document.getElementById("product").value,
              document.getElementById("operation").value,
              document.getElementById("location").value,
              document.getElementById("quantity").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Scan processed: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    barcodeField: page.locator("#barcode"),
    productField: page.locator("#product"),
    operationField: page.locator("#operation"),
    locationField: page.locator("#location"),
    quantityField: page.locator("#quantity"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /process scan/i }),
    result: page.locator("#result"),
  };
}

test("loads the barcode operations form", async ({ page }) => {
  const {
    barcodeField,
    productField,
    operationField,
    locationField,
    quantityField,
    statusField,
    submitButton,
  } = await setupBarcodePage(page);

  await expect(page).toHaveTitle(/Barcode Operations/i);
  await expect(barcodeField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(operationField).toBeVisible();
  await expect(locationField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("processes a scanned receipt", async ({ page }) => {
  const {
    barcodeField,
    productField,
    operationField,
    locationField,
    quantityField,
    statusField,
    submitButton,
    result,
  } = await setupBarcodePage(page);

  await barcodeField.fill("123456789012");
  await productField.fill("Wireless keyboard");
  await operationField.selectOption("Receipt");
  await locationField.fill("WH/Stock");
  await quantityField.fill("24");
  await statusField.selectOption("Done");
  await submitButton.click();

  await expect(result).toHaveText(
    "Scan processed: 123456789012 | Wireless keyboard | Receipt | WH/Stock | 24 | Done",
  );
});

test("requires barcode operation details before processing", async ({
  page,
}) => {
  const {
    barcodeField,
    productField,
    operationField,
    locationField,
    quantityField,
    statusField,
    submitButton,
  } = await setupBarcodePage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      barcodeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
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
      locationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects an invalid product barcode", async ({ page }) => {
  const { barcodeField } = await setupBarcodePage(page);

  await barcodeField.fill("ABC-123");
  await expect(barcodeField).toHaveJSProperty("validity.valid", false);
  await expect(barcodeField).toHaveJSProperty("validity.patternMismatch", true);
});

test("rejects a zero barcode quantity", async ({ page }) => {
  const { quantityField } = await setupBarcodePage(page);

  await quantityField.fill("0");
  await expect(quantityField).toHaveJSProperty("validity.valid", false);
  await expect(quantityField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a completed internal transfer", async ({ page }) => {
  const {
    barcodeField,
    productField,
    operationField,
    locationField,
    quantityField,
    statusField,
    submitButton,
    result,
  } = await setupBarcodePage(page, {
    barcode: "987654321098",
    product: "Safety gloves",
    operation: "Internal transfer",
    location: "WH/Quality",
    quantity: "60",
    status: "Done",
  });

  await expect(barcodeField).toHaveValue("987654321098");
  await expect(productField).toHaveValue("Safety gloves");
  await expect(operationField).toHaveValue("Internal transfer");
  await expect(locationField).toHaveValue("WH/Quality");
  await expect(quantityField).toHaveValue("60");
  await expect(statusField).toHaveValue("Done");
  await submitButton.click();

  await expect(result).toContainText("Safety gloves");
  await expect(result).toContainText("WH/Quality");
  await expect(result).toContainText("Done");
});
