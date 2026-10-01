const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupSalesPage(page, options = {}) {
  const safeOptions = {
    customer: escapeHtml(options.customer),
    product: escapeHtml(options.product),
    quantity: escapeHtml(options.quantity),
    unitPrice: escapeHtml(options.unitPrice),
    orderDate: escapeHtml(options.orderDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Sales | Odoo</title>
      </head>
      <body>
        <h1>Sales</h1>
        <form id="salesOrderForm">
          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${safeOptions.customer || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" step="0.01" value="${safeOptions.quantity || ""}" required />

          <label for="unitPrice">Unit price *</label>
          <input id="unitPrice" name="unitPrice" type="number" step="0.01" value="${safeOptions.unitPrice || ""}" required />

          <label for="orderDate">Order date *</label>
          <input id="orderDate" name="orderDate" type="date" value="${safeOptions.orderDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Quotation" ${safeOptions.status === "Quotation" ? "selected" : ""}>Quotation</option>
            <option value="Confirmed" ${safeOptions.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="Delivered" ${safeOptions.status === "Delivered" ? "selected" : ""}>Delivered</option>
          </select>

          <button type="submit">Create order</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("salesOrderForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const customer = document.getElementById("customer").value.trim();
            const product = document.getElementById("product").value.trim();
            const quantity = Number(document.getElementById("quantity").value);
            const unitPrice = Number(document.getElementById("unitPrice").value);
            const orderDate = document.getElementById("orderDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (quantity <= 0) {
              result.textContent = "Quantity must be greater than zero";
              return;
            }

            if (unitPrice < 0) {
              result.textContent = "Unit price cannot be negative";
              return;
            }

            const total = (quantity * unitPrice).toFixed(2);
            result.textContent = "Order created: " + [customer, product, quantity.toFixed(2), unitPrice.toFixed(2), total, orderDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customer"),
    productField: page.locator("#product"),
    quantityField: page.locator("#quantity"),
    unitPriceField: page.locator("#unitPrice"),
    orderDateField: page.locator("#orderDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /create order/i }),
    result: page.locator("#result"),
  };
}

test("loads the sales form", async ({ page }) => {
  const {
    customerField,
    productField,
    quantityField,
    unitPriceField,
    orderDateField,
    statusField,
    submitButton,
  } = await setupSalesPage(page);

  await expect(page).toHaveTitle(/Sales/i);
  await expect(customerField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(unitPriceField).toBeVisible();
  await expect(orderDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a valid sales order", async ({ page }) => {
  const {
    customerField,
    productField,
    quantityField,
    unitPriceField,
    orderDateField,
    statusField,
    submitButton,
    result,
  } = await setupSalesPage(page);

  await customerField.fill("Northwind Traders");
  await productField.fill("Laptop Pro 14");
  await quantityField.fill("3");
  await unitPriceField.fill("1299.99");
  await orderDateField.fill("2026-09-18");
  await statusField.selectOption("Confirmed");
  await submitButton.click();

  await expect(result).toHaveText(
    "Order created: Northwind Traders | Laptop Pro 14 | 3.00 | 1299.99 | 3899.97 | 2026-09-18 | Confirmed",
  );
});

test("requires all sales order details before saving", async ({ page }) => {
  const {
    customerField,
    productField,
    quantityField,
    unitPriceField,
    orderDateField,
    statusField,
    submitButton,
  } = await setupSalesPage(page);

  await submitButton.click();

  await expect
    .poll(async () => customerField.evaluate((el) => el.validity.valueMissing))
    .toBeTruthy();
  await expect
    .poll(async () => productField.evaluate((el) => el.validity.valueMissing))
    .toBeTruthy();
  await expect
    .poll(async () => quantityField.evaluate((el) => el.validity.valueMissing))
    .toBeTruthy();
  await expect
    .poll(async () => unitPriceField.evaluate((el) => el.validity.valueMissing))
    .toBeTruthy();
  await expect
    .poll(async () => orderDateField.evaluate((el) => el.validity.valueMissing))
    .toBeTruthy();
  await expect
    .poll(async () => statusField.evaluate((el) => el.validity.valueMissing))
    .toBeTruthy();
});

test("rejects zero or negative quantities", async ({ page }) => {
  const {
    customerField,
    productField,
    quantityField,
    unitPriceField,
    orderDateField,
    statusField,
    submitButton,
    result,
  } = await setupSalesPage(page);

  await customerField.fill("Aster Labs");
  await productField.fill('Monitor 27"');
  await quantityField.fill("0");
  await unitPriceField.fill("320.00");
  await orderDateField.fill("2026-09-20");
  await statusField.selectOption("Quotation");
  await submitButton.click();

  await expect(result).toHaveText("Quantity must be greater than zero");
});

test("keeps a pre-filled sales order", async ({ page }) => {
  const {
    customerField,
    productField,
    quantityField,
    unitPriceField,
    orderDateField,
    statusField,
    submitButton,
    result,
  } = await setupSalesPage(page, {
    customer: "BluePeak Retail",
    product: "Office Chair",
    quantity: "12",
    unitPrice: "89.50",
    orderDate: "2026-09-21",
    status: "Delivered",
  });

  await expect(customerField).toHaveValue("BluePeak Retail");
  await expect(productField).toHaveValue("Office Chair");
  await expect(quantityField).toHaveValue("12");
  await expect(unitPriceField).toHaveValue("89.50");
  await expect(orderDateField).toHaveValue("2026-09-21");
  await expect(statusField).toHaveValue("Delivered");

  await submitButton.click();

  await expect(result).toContainText("BluePeak Retail");
  await expect(result).toContainText("Office Chair");
  await expect(result).toContainText("Delivered");
});
