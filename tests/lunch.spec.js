const { test, expect } = require("@playwright/test");

async function setupLunchPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Lunch | Odoo</title>
      </head>
      <body>
        <h1>Lunch</h1>
        <form id="lunchForm">
          <label for="employee">Employee *</label>
          <input id="employee" name="employee" type="text" value="${options.employee || ""}" required />

          <label for="vendor">Vendor *</label>
          <input id="vendor" name="vendor" type="text" value="${options.vendor || ""}" required />

          <label for="meal">Meal *</label>
          <input id="meal" name="meal" type="text" value="${options.meal || ""}" required />

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" step="1" value="${options.quantity || ""}" required />

          <label for="orderDate">Order date *</label>
          <input id="orderDate" name="orderDate" type="date" value="${options.orderDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Ordered" ${options.status === "Ordered" ? "selected" : ""}>Ordered</option>
            <option value="Delivered" ${options.status === "Delivered" ? "selected" : ""}>Delivered</option>
            <option value="Cancelled" ${options.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>

          <button type="submit">Save lunch order</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("lunchForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("employee").value,
              document.getElementById("vendor").value,
              document.getElementById("meal").value,
              document.getElementById("quantity").value,
              document.getElementById("orderDate").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Lunch order saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    employeeField: page.locator("#employee"),
    vendorField: page.locator("#vendor"),
    mealField: page.locator("#meal"),
    quantityField: page.locator("#quantity"),
    orderDateField: page.locator("#orderDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save lunch order/i }),
    result: page.locator("#result"),
  };
}

test("loads the lunch form", async ({ page }) => {
  const {
    employeeField,
    vendorField,
    mealField,
    quantityField,
    orderDateField,
    statusField,
    submitButton,
  } = await setupLunchPage(page);

  await expect(page).toHaveTitle(/Lunch/i);
  await expect(employeeField).toBeVisible();
  await expect(vendorField).toBeVisible();
  await expect(mealField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(orderDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves an ordered lunch meal", async ({ page }) => {
  const {
    employeeField,
    vendorField,
    mealField,
    quantityField,
    orderDateField,
    statusField,
    submitButton,
    result,
  } = await setupLunchPage(page);

  await employeeField.fill("Bilol Abdurasulov");
  await vendorField.fill("Green Garden Cafe");
  await mealField.fill("Chicken rice bowl");
  await quantityField.fill("1");
  await orderDateField.fill("2026-09-14");
  await statusField.selectOption("Ordered");
  await submitButton.click();

  await expect(result).toHaveText(
    "Lunch order saved: Bilol Abdurasulov | Green Garden Cafe | Chicken rice bowl | 1 | 2026-09-14 | Ordered",
  );
});

test("requires lunch order details before saving", async ({ page }) => {
  const {
    employeeField,
    vendorField,
    mealField,
    quantityField,
    orderDateField,
    statusField,
    submitButton,
  } = await setupLunchPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      employeeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      vendorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      mealField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      orderDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero lunch quantity", async ({ page }) => {
  const { quantityField } = await setupLunchPage(page);

  await quantityField.fill("0");
  await expect(quantityField).toHaveJSProperty("validity.valid", false);
  await expect(quantityField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a delivered pre-filled lunch order", async ({ page }) => {
  const {
    employeeField,
    vendorField,
    mealField,
    quantityField,
    orderDateField,
    statusField,
    submitButton,
    result,
  } = await setupLunchPage(page, {
    employee: "Operations Team",
    vendor: "City Deli",
    meal: "Vegetable wrap",
    quantity: "3",
    orderDate: "2026-09-13",
    status: "Delivered",
  });

  await expect(employeeField).toHaveValue("Operations Team");
  await expect(vendorField).toHaveValue("City Deli");
  await expect(mealField).toHaveValue("Vegetable wrap");
  await expect(quantityField).toHaveValue("3");
  await expect(orderDateField).toHaveValue("2026-09-13");
  await expect(statusField).toHaveValue("Delivered");
  await submitButton.click();

  await expect(result).toContainText("City Deli");
  await expect(result).toContainText("Vegetable wrap");
  await expect(result).toContainText("Delivered");
});
