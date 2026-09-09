const { test, expect } = require("@playwright/test");

async function setupRentalPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Rental | Odoo</title>
      </head>
      <body>
        <h1>Rental</h1>
        <form id="rentalForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${options.product || ""}" required />

          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${options.customer || ""}" required />

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" step="1" value="${options.quantity || ""}" required />

          <label for="startDate">Rental start date *</label>
          <input id="startDate" name="startDate" type="date" value="${options.startDate || ""}" required />

          <label for="endDate">Rental end date *</label>
          <input id="endDate" name="endDate" type="date" value="${options.endDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Quotation" ${options.status === "Quotation" ? "selected" : ""}>Quotation</option>
            <option value="Reserved" ${options.status === "Reserved" ? "selected" : ""}>Reserved</option>
            <option value="Picked up" ${options.status === "Picked up" ? "selected" : ""}>Picked up</option>
            <option value="Returned" ${options.status === "Returned" ? "selected" : ""}>Returned</option>
          </select>

          <button type="submit">Save rental</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          const startDate = document.getElementById("startDate");
          const endDate = document.getElementById("endDate");
          const validateDates = () => {
            endDate.setCustomValidity(
              startDate.value && endDate.value && endDate.value < startDate.value
                ? "Rental end date must be on or after the start date"
                : "",
            );
          };
          startDate.addEventListener("input", validateDates);
          endDate.addEventListener("input", validateDates);
          validateDates();
          document.getElementById("rentalForm").addEventListener("submit", (event) => {
            validateDates();
            if (!event.target.checkValidity()) return;
            event.preventDefault();
            const values = [
              document.getElementById("product").value,
              document.getElementById("customer").value,
              document.getElementById("quantity").value,
              startDate.value,
              endDate.value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Rental saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    customerField: page.locator("#customer"),
    quantityField: page.locator("#quantity"),
    startDateField: page.locator("#startDate"),
    endDateField: page.locator("#endDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save rental/i }),
    result: page.locator("#result"),
  };
}

test("loads the rental form", async ({ page }) => {
  const {
    productField,
    customerField,
    quantityField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
  } = await setupRentalPage(page);

  await expect(page).toHaveTitle(/Rental/i);
  await expect(productField).toBeVisible();
  await expect(customerField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(startDateField).toBeVisible();
  await expect(endDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a reserved equipment rental", async ({ page }) => {
  const {
    productField,
    customerField,
    quantityField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
    result,
  } = await setupRentalPage(page);

  await productField.fill("Projector kit");
  await customerField.fill("Acme Corporation");
  await quantityField.fill("2");
  await startDateField.fill("2026-09-12");
  await endDateField.fill("2026-09-15");
  await statusField.selectOption("Reserved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Rental saved: Projector kit | Acme Corporation | 2 | 2026-09-12 | 2026-09-15 | Reserved",
  );
});

test("requires rental details before saving", async ({ page }) => {
  const {
    productField,
    customerField,
    quantityField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
  } = await setupRentalPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      startDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      endDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a rental period ending before it starts", async ({ page }) => {
  const { startDateField, endDateField, submitButton } = await setupRentalPage(
    page,
    {
      product: "Camera kit",
      customer: "Studio North",
      quantity: "1",
      startDate: "2026-09-20",
      endDate: "2026-09-18",
      status: "Quotation",
    },
  );

  await expect(endDateField).toHaveJSProperty("validity.valid", false);
  await expect(endDateField).toHaveJSProperty("validity.customError", true);
  await expect(startDateField).toHaveValue("2026-09-20");
  await submitButton.click();
  await expect(endDateField).toHaveJSProperty("validity.customError", true);
});

test("rejects a zero rental quantity", async ({ page }) => {
  const { quantityField } = await setupRentalPage(page);

  await quantityField.fill("0");
  await expect(quantityField).toHaveJSProperty("validity.valid", false);
  await expect(quantityField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a returned pre-filled rental", async ({ page }) => {
  const {
    productField,
    customerField,
    quantityField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
    result,
  } = await setupRentalPage(page, {
    product: "Cargo van",
    customer: "Logistics Partner",
    quantity: "1",
    startDate: "2026-09-01",
    endDate: "2026-09-04",
    status: "Returned",
  });

  await expect(productField).toHaveValue("Cargo van");
  await expect(customerField).toHaveValue("Logistics Partner");
  await expect(quantityField).toHaveValue("1");
  await expect(startDateField).toHaveValue("2026-09-01");
  await expect(endDateField).toHaveValue("2026-09-04");
  await expect(statusField).toHaveValue("Returned");
  await submitButton.click();

  await expect(result).toContainText("Cargo van");
  await expect(result).toContainText("Logistics Partner");
  await expect(result).toContainText("Returned");
});
