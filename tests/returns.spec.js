const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupReturnsPage(page, options = {}) {
  const safeOptions = {
    customer: escapeHtml(options.customer),
    product: escapeHtml(options.product),
    reason: escapeHtml(options.reason),
    quantity: escapeHtml(options.quantity),
    returnDate: escapeHtml(options.returnDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Returns | Odoo</title>
      </head>
      <body>
        <h1>Returns</h1>
        <form id="returnForm">
          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${safeOptions.customer || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="reason">Return reason *</label>
          <select id="reason" name="reason" required>
            <option value="">Select reason</option>
            <option value="Damaged" ${safeOptions.reason === "Damaged" ? "selected" : ""}>Damaged</option>
            <option value="Defective" ${safeOptions.reason === "Defective" ? "selected" : ""}>Defective</option>
            <option value="Late delivery" ${safeOptions.reason === "Late delivery" ? "selected" : ""}>Late delivery</option>
            <option value="Wrong item" ${safeOptions.reason === "Wrong item" ? "selected" : ""}>Wrong item</option>
          </select>

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" step="1" value="${safeOptions.quantity || ""}" required />

          <label for="returnDate">Return date *</label>
          <input id="returnDate" name="returnDate" type="date" value="${safeOptions.returnDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Requested" ${safeOptions.status === "Requested" ? "selected" : ""}>Requested</option>
            <option value="Approved" ${safeOptions.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Rejected" ${safeOptions.status === "Rejected" ? "selected" : ""}>Rejected</option>
            <option value="Refunded" ${safeOptions.status === "Refunded" ? "selected" : ""}>Refunded</option>
          </select>

          <button type="submit">Save return</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("returnForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const customer = document.getElementById("customer").value;
            const product = document.getElementById("product").value;
            const reason = document.getElementById("reason").value;
            const quantity = document.getElementById("quantity").value;
            const returnDate = document.getElementById("returnDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (Number(quantity) <= 0) {
              result.textContent = "Quantity must be greater than 0";
              return;
            }

            result.textContent = "Return saved: " + [customer, product, reason, quantity, returnDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customer"),
    productField: page.locator("#product"),
    reasonField: page.locator("#reason"),
    quantityField: page.locator("#quantity"),
    returnDateField: page.locator("#returnDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save return/i }),
    result: page.locator("#result"),
  };
}

test("loads the returns form", async ({ page }) => {
  const {
    customerField,
    productField,
    reasonField,
    quantityField,
    returnDateField,
    statusField,
    submitButton,
  } = await setupReturnsPage(page);

  await expect(page).toHaveTitle(/Returns/i);
  await expect(customerField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(reasonField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(returnDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid product return", async ({ page }) => {
  const {
    customerField,
    productField,
    reasonField,
    quantityField,
    returnDateField,
    statusField,
    submitButton,
    result,
  } = await setupReturnsPage(page);

  await customerField.fill("Rashid Murodov");
  await productField.fill("Wireless Mouse");
  await reasonField.selectOption("Defective");
  await quantityField.fill("2");
  await returnDateField.fill("2026-09-20");
  await statusField.selectOption("Requested");
  await submitButton.click();

  await expect(result).toHaveText(
    "Return saved: Rashid Murodov | Wireless Mouse | Defective | 2 | 2026-09-20 | Requested",
  );
});

test("requires return details before saving", async ({ page }) => {
  const {
    customerField,
    productField,
    reasonField,
    quantityField,
    returnDateField,
    statusField,
    submitButton,
  } = await setupReturnsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      reasonField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      returnDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative return quantity", async ({ page }) => {
  const {
    customerField,
    productField,
    reasonField,
    quantityField,
    returnDateField,
    statusField,
    submitButton,
    result,
  } = await setupReturnsPage(page);

  await customerField.fill("Gulnora Sattorova");
  await productField.fill("USB Cable");
  await reasonField.selectOption("Damaged");
  await quantityField.fill("0");
  await returnDateField.fill("2026-09-22");
  await statusField.selectOption("Rejected");
  await submitButton.click();

  await expect(result).toHaveText("Quantity must be greater than 0");
});

test("keeps a pre-filled return request", async ({ page }) => {
  const {
    customerField,
    productField,
    reasonField,
    quantityField,
    returnDateField,
    statusField,
    submitButton,
    result,
  } = await setupReturnsPage(page, {
    customer: "Nargiza Karimova",
    product: 'Monitor 27"',
    reason: "Late delivery",
    quantity: "1",
    returnDate: "2026-09-24",
    status: "Approved",
  });

  await expect(customerField).toHaveValue("Nargiza Karimova");
  await expect(productField).toHaveValue('Monitor 27"');
  await expect(reasonField).toHaveValue("Late delivery");
  await expect(quantityField).toHaveValue("1");
  await expect(returnDateField).toHaveValue("2026-09-24");
  await expect(statusField).toHaveValue("Approved");
  await submitButton.click();

  await expect(result).toContainText("Nargiza Karimova");
  await expect(result).toContainText('Monitor 27"');
  await expect(result).toContainText("Approved");
});
