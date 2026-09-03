const { test, expect } = require("@playwright/test");

async function setupEcommercePage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Website and eCommerce | Odoo</title></head>
      <body>
        <h1>Online Store Checkout</h1>
        <form id="checkoutForm">
          <label for="product">Product *</label>
          <select id="product" name="product" required>
            <option value="">Select a product</option>
            <option value="laptop" ${options.product === "laptop" ? "selected" : ""}>Laptop - 900</option>
            <option value="monitor" ${options.product === "monitor" ? "selected" : ""}>Monitor - 250</option>
            <option value="keyboard" ${options.product === "keyboard" ? "selected" : ""}>Keyboard - 75</option>
          </select>
          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" max="10" value="${options.quantity || ""}" required />
          <label for="customer">Customer name *</label>
          <input id="customer" name="customer" type="text" value="${options.customer || ""}" required />
          <label for="email">Email *</label>
          <input id="email" name="email" type="email" value="${options.email || ""}" required />
          <label for="address">Shipping address *</label>
          <input id="address" name="address" type="text" value="${options.address || ""}" required />
          <label for="status">Order status *</label>
          <select id="status" name="status" required>
            <option value="">Select a status</option>
            <option value="cart" ${options.status === "cart" ? "selected" : ""}>Cart</option>
            <option value="confirmed" ${options.status === "confirmed" ? "selected" : ""}>Confirmed</option>
          </select>
          <button type="submit">Place order</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("checkoutForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["product", "quantity", "customer", "email", "address", "status"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            document.getElementById("result").textContent = "Order placed: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    quantityField: page.locator("#quantity"),
    customerField: page.locator("#customer"),
    emailField: page.locator("#email"),
    addressField: page.locator("#address"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /place order/i }),
    result: page.locator("#result"),
  };
}

test("loads the online store checkout", async ({ page }) => {
  const {
    productField,
    quantityField,
    customerField,
    emailField,
    addressField,
    statusField,
    submitButton,
  } = await setupEcommercePage(page);

  await expect(page).toHaveTitle(/Website and eCommerce/i);
  await expect(productField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(customerField).toBeVisible();
  await expect(emailField).toBeVisible();
  await expect(addressField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("places an eCommerce order", async ({ page }) => {
  const {
    productField,
    quantityField,
    customerField,
    emailField,
    addressField,
    statusField,
    submitButton,
    result,
  } = await setupEcommercePage(page);

  await productField.selectOption("laptop");
  await quantityField.fill("2");
  await customerField.fill("Jane Smith");
  await emailField.fill("jane.smith@example.com");
  await addressField.fill("10 Main Street");
  await statusField.selectOption("confirmed");
  await submitButton.click();

  await expect(result).toHaveText(
    "Order placed: laptop | 2 | Jane Smith | jane.smith@example.com | 10 Main Street | confirmed",
  );
});

test("requires product, quantity, customer, email, address, and status", async ({
  page,
}) => {
  const {
    productField,
    quantityField,
    customerField,
    emailField,
    addressField,
    statusField,
    submitButton,
  } = await setupEcommercePage(page);

  await submitButton.click();

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
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      emailField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      addressField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a cart quantity above the available limit", async ({ page }) => {
  const {
    productField,
    quantityField,
    customerField,
    emailField,
    addressField,
    statusField,
    submitButton,
  } = await setupEcommercePage(page, {
    product: "monitor",
    quantity: "11",
    customer: "Jane Smith",
    email: "jane.smith@example.com",
    address: "10 Main Street",
    status: "cart",
  });

  await productField.selectOption("monitor");
  await customerField.fill("Jane Smith");
  await emailField.fill("jane.smith@example.com");
  await addressField.fill("10 Main Street");
  await statusField.selectOption("cart");
  await submitButton.click();

  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.rangeOverflow),
    )
    .toBeTruthy();
});

test("confirms an existing cart order", async ({ page }) => {
  const {
    productField,
    quantityField,
    customerField,
    emailField,
    addressField,
    statusField,
    submitButton,
    result,
  } = await setupEcommercePage(page, {
    product: "keyboard",
    quantity: "1",
    customer: "Jane Smith",
    email: "jane.smith@example.com",
    address: "10 Main Street",
    status: "cart",
  });

  await expect(statusField).toHaveValue("cart");
  await statusField.selectOption("confirmed");
  await submitButton.click();

  await expect(result).toContainText("keyboard");
  await expect(result).toContainText("Jane Smith");
  await expect(result).toContainText("confirmed");
});
