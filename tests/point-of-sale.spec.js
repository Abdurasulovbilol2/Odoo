const { test, expect } = require("@playwright/test");

async function setupPointOfSalePage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Point of Sale | Odoo</title></head>
      <body>
        <h1>Point of Sale</h1>
        <form id="posForm">
          <label for="session">Session *</label>
          <select id="session" name="session" required>
            <option value="">Select a session</option>
            <option value="morning" ${options.session === "morning" ? "selected" : ""}>Morning session</option>
            <option value="evening" ${options.session === "evening" ? "selected" : ""}>Evening session</option>
          </select>
          <label for="product">Product *</label>
          <select id="product" name="product" required>
            <option value="">Select a product</option>
            <option value="coffee" ${options.product === "coffee" ? "selected" : ""}>Coffee - 3.50</option>
            <option value="sandwich" ${options.product === "sandwich" ? "selected" : ""}>Sandwich - 8.00</option>
            <option value="cake" ${options.product === "cake" ? "selected" : ""}>Cake - 5.00</option>
          </select>
          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" value="${options.quantity || ""}" required />
          <label for="payment">Payment method *</label>
          <select id="payment" name="payment" required>
            <option value="">Select a method</option>
            <option value="cash" ${options.payment === "cash" ? "selected" : ""}>Cash</option>
            <option value="card" ${options.payment === "card" ? "selected" : ""}>Card</option>
          </select>
          <label for="status">Order status *</label>
          <select id="status" name="status" required>
            <option value="">Select a status</option>
            <option value="open" ${options.status === "open" ? "selected" : ""}>Open</option>
            <option value="paid" ${options.status === "paid" ? "selected" : ""}>Paid</option>
            <option value="closed" ${options.status === "closed" ? "selected" : ""}>Closed</option>
          </select>
          <button type="submit">Save POS order</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("posForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["session", "product", "quantity", "payment", "status"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            document.getElementById("result").textContent = "POS order saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    sessionField: page.locator("#session"),
    productField: page.locator("#product"),
    quantityField: page.locator("#quantity"),
    paymentField: page.locator("#payment"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save pos order/i }),
    result: page.locator("#result"),
  };
}

test("loads the point of sale order form", async ({ page }) => {
  const {
    sessionField,
    productField,
    quantityField,
    paymentField,
    statusField,
    submitButton,
  } = await setupPointOfSalePage(page);

  await expect(page).toHaveTitle(/Point of Sale/i);
  await expect(sessionField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(paymentField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a paid POS order", async ({ page }) => {
  const {
    sessionField,
    productField,
    quantityField,
    paymentField,
    statusField,
    submitButton,
    result,
  } = await setupPointOfSalePage(page);

  await sessionField.selectOption("morning");
  await productField.selectOption("coffee");
  await quantityField.fill("3");
  await paymentField.selectOption("card");
  await statusField.selectOption("paid");
  await submitButton.click();

  await expect(result).toHaveText(
    "POS order saved: morning | coffee | 3 | card | paid",
  );
});

test("requires session, product, quantity, payment, and status", async ({
  page,
}) => {
  const {
    sessionField,
    productField,
    quantityField,
    paymentField,
    statusField,
    submitButton,
  } = await setupPointOfSalePage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      sessionField.evaluate((element) => element.validity.valueMissing),
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
      paymentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero POS order quantity", async ({ page }) => {
  const {
    sessionField,
    productField,
    quantityField,
    paymentField,
    statusField,
    submitButton,
  } = await setupPointOfSalePage(page, {
    session: "evening",
    product: "sandwich",
    quantity: "0",
    payment: "cash",
    status: "open",
  });

  await sessionField.selectOption("evening");
  await productField.selectOption("sandwich");
  await paymentField.selectOption("cash");
  await statusField.selectOption("open");
  await submitButton.click();

  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.rangeUnderflow),
    )
    .toBeTruthy();
});

test("closes an existing paid POS order", async ({ page }) => {
  const {
    sessionField,
    productField,
    quantityField,
    paymentField,
    statusField,
    submitButton,
    result,
  } = await setupPointOfSalePage(page, {
    session: "evening",
    product: "cake",
    quantity: "2",
    payment: "cash",
    status: "paid",
  });

  await expect(statusField).toHaveValue("paid");
  await statusField.selectOption("closed");
  await submitButton.click();

  await expect(result).toContainText("evening");
  await expect(result).toContainText("cake");
  await expect(result).toContainText("closed");
});
