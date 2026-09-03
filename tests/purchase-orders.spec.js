const { test, expect } = require("@playwright/test");

async function setupPurchaseOrderPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Purchase Orders | Odoo</title></head>
      <body>
        <h1>Purchase Orders and Vendors</h1>
        <form id="purchaseOrderForm">
          <label for="vendor">Vendor *</label>
          <input id="vendor" name="vendor" type="text" value="${options.vendor || ""}" required />
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${options.product || ""}" required />
          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" value="${options.quantity || ""}" required />
          <label for="unitPrice">Unit price *</label>
          <input id="unitPrice" name="unitPrice" type="number" min="0.01" step="0.01" value="${options.unitPrice || ""}" required />
          <label for="status">Order status *</label>
          <select id="status" name="status" required>
            <option value="">Select a status</option>
            <option value="draft" ${options.status === "draft" ? "selected" : ""}>Draft</option>
            <option value="sent" ${options.status === "sent" ? "selected" : ""}>Sent</option>
            <option value="confirmed" ${options.status === "confirmed" ? "selected" : ""}>Confirmed</option>
          </select>
          <button type="submit">Save purchase order</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("purchaseOrderForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["vendor", "product", "quantity", "unitPrice", "status"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            document.getElementById("result").textContent = "Purchase order saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    vendorField: page.locator("#vendor"),
    productField: page.locator("#product"),
    quantityField: page.locator("#quantity"),
    unitPriceField: page.locator("#unitPrice"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save purchase order/i }),
    result: page.locator("#result"),
  };
}

test("loads the purchase order form", async ({ page }) => {
  const {
    vendorField,
    productField,
    quantityField,
    unitPriceField,
    statusField,
    submitButton,
  } = await setupPurchaseOrderPage(page);

  await expect(page).toHaveTitle(/Purchase Orders/i);
  await expect(vendorField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(unitPriceField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a purchase order for a vendor", async ({ page }) => {
  const {
    vendorField,
    productField,
    quantityField,
    unitPriceField,
    statusField,
    submitButton,
    result,
  } = await setupPurchaseOrderPage(page);

  await vendorField.fill("Global Office Supplies");
  await productField.fill("Desk lamp");
  await quantityField.fill("10");
  await unitPriceField.fill("35.50");
  await statusField.selectOption("confirmed");
  await submitButton.click();

  await expect(result).toHaveText(
    "Purchase order saved: Global Office Supplies | Desk lamp | 10 | 35.50 | confirmed",
  );
});

test("requires vendor, product, quantity, price, and status", async ({
  page,
}) => {
  const {
    vendorField,
    productField,
    quantityField,
    unitPriceField,
    statusField,
    submitButton,
  } = await setupPurchaseOrderPage(page);

  await submitButton.click();

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
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      unitPriceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero purchase quantity", async ({ page }) => {
  const {
    vendorField,
    productField,
    quantityField,
    unitPriceField,
    statusField,
    submitButton,
  } = await setupPurchaseOrderPage(page, {
    vendor: "Global Office Supplies",
    product: "Desk lamp",
    quantity: "0",
    unitPrice: "35.50",
    status: "draft",
  });

  await vendorField.fill("Global Office Supplies");
  await productField.fill("Desk lamp");
  await unitPriceField.fill("35.50");
  await statusField.selectOption("draft");
  await submitButton.click();

  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.rangeUnderflow),
    )
    .toBeTruthy();
});

test("confirms an existing purchase order", async ({ page }) => {
  const {
    vendorField,
    productField,
    quantityField,
    unitPriceField,
    statusField,
    submitButton,
    result,
  } = await setupPurchaseOrderPage(page, {
    vendor: "Global Office Supplies",
    product: "Desk lamp",
    quantity: "10",
    unitPrice: "35.50",
    status: "sent",
  });

  await expect(statusField).toHaveValue("sent");
  await statusField.selectOption("confirmed");
  await submitButton.click();

  await expect(result).toContainText("Global Office Supplies");
  await expect(result).toContainText("Desk lamp");
  await expect(result).toContainText("confirmed");
});
