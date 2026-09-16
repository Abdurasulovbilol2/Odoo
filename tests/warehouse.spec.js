const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupWarehousePage(page, options = {}) {
  const safeOptions = {
    product: escapeHtml(options.product),
    sourceLocation: escapeHtml(options.sourceLocation),
    destinationLocation: escapeHtml(options.destinationLocation),
    quantity: escapeHtml(options.quantity),
    transferDate: escapeHtml(options.transferDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Warehouse | Odoo</title>
      </head>
      <body>
        <h1>Warehouse</h1>
        <form id="warehouseTransferForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="sourceLocation">Source location *</label>
          <input id="sourceLocation" name="sourceLocation" type="text" value="${safeOptions.sourceLocation || ""}" required />

          <label for="destinationLocation">Destination location *</label>
          <input id="destinationLocation" name="destinationLocation" type="text" value="${safeOptions.destinationLocation || ""}" required />

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" step="0.1" value="${safeOptions.quantity || ""}" required />

          <label for="transferDate">Transfer date *</label>
          <input id="transferDate" name="transferDate" type="date" value="${safeOptions.transferDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Ready" ${safeOptions.status === "Ready" ? "selected" : ""}>Ready</option>
            <option value="Transferred" ${safeOptions.status === "Transferred" ? "selected" : ""}>Transferred</option>
          </select>

          <button type="submit">Create transfer</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("warehouseTransferForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const product = document.getElementById("product").value;
            const source = document.getElementById("sourceLocation").value;
            const destination = document.getElementById("destinationLocation").value;
            const quantity = document.getElementById("quantity").value;
            const transferDate = document.getElementById("transferDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (Number(quantity) <= 0) {
              result.textContent = "Quantity must be greater than 0";
              return;
            }

            result.textContent = "Transfer created: " + [product, source, destination, quantity, transferDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    sourceLocationField: page.locator("#sourceLocation"),
    destinationLocationField: page.locator("#destinationLocation"),
    quantityField: page.locator("#quantity"),
    transferDateField: page.locator("#transferDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /create transfer/i }),
    result: page.locator("#result"),
  };
}

test("loads the warehouse transfer form", async ({ page }) => {
  const {
    productField,
    sourceLocationField,
    destinationLocationField,
    quantityField,
    transferDateField,
    statusField,
    submitButton,
  } = await setupWarehousePage(page);

  await expect(page).toHaveTitle(/Warehouse/i);
  await expect(productField).toBeVisible();
  await expect(sourceLocationField).toBeVisible();
  await expect(destinationLocationField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(transferDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a valid warehouse transfer", async ({ page }) => {
  const {
    productField,
    sourceLocationField,
    destinationLocationField,
    quantityField,
    transferDateField,
    statusField,
    submitButton,
    result,
  } = await setupWarehousePage(page);

  await productField.fill("Laptop Stand");
  await sourceLocationField.fill("Warehouse A");
  await destinationLocationField.fill("Showroom B");
  await quantityField.fill("8");
  await transferDateField.fill("2026-09-18");
  await statusField.selectOption("Ready");
  await submitButton.click();

  await expect(result).toHaveText(
    "Transfer created: Laptop Stand | Warehouse A | Showroom B | 8 | 2026-09-18 | Ready",
  );
});

test("requires warehouse transfer details before saving", async ({ page }) => {
  const {
    productField,
    sourceLocationField,
    destinationLocationField,
    quantityField,
    transferDateField,
    statusField,
    submitButton,
  } = await setupWarehousePage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      sourceLocationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      destinationLocationField.evaluate(
        (element) => element.validity.valueMissing,
      ),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      transferDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative transfer quantity", async ({ page }) => {
  const {
    productField,
    sourceLocationField,
    destinationLocationField,
    quantityField,
    transferDateField,
    statusField,
    submitButton,
    result,
  } = await setupWarehousePage(page);

  await productField.fill("Office Chair");
  await sourceLocationField.fill("Warehouse C");
  await destinationLocationField.fill("Branch D");
  await quantityField.fill("0");
  await transferDateField.fill("2026-09-20");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Quantity must be greater than 0");
});

test("keeps a pre-filled warehouse transfer", async ({ page }) => {
  const {
    productField,
    sourceLocationField,
    destinationLocationField,
    quantityField,
    transferDateField,
    statusField,
    submitButton,
    result,
  } = await setupWarehousePage(page, {
    product: 'Monitor 27"',
    sourceLocation: "Central Hub",
    destinationLocation: "Sales Floor",
    quantity: "12",
    transferDate: "2026-09-17",
    status: "Transferred",
  });

  await expect(productField).toHaveValue('Monitor 27"');
  await expect(sourceLocationField).toHaveValue("Central Hub");
  await expect(destinationLocationField).toHaveValue("Sales Floor");
  await expect(quantityField).toHaveValue("12");
  await expect(transferDateField).toHaveValue("2026-09-17");
  await expect(statusField).toHaveValue("Transferred");
  await submitButton.click();

  await expect(result).toContainText('Monitor 27"');
  await expect(result).toContainText("Central Hub");
  await expect(result).toContainText("Transferred");
});
