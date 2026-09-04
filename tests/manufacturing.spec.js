const { test, expect } = require("@playwright/test");

async function setupManufacturingPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Manufacturing | Odoo</title></head>
      <body>
        <h1>Manufacturing Orders</h1>
        <form id="manufacturingForm">
          <label for="product">Product *</label>
          <select id="product" name="product" required>
            <option value="">Select a product</option>
            <option value="desk" ${options.product === "desk" ? "selected" : ""}>Office desk</option>
            <option value="chair" ${options.product === "chair" ? "selected" : ""}>Office chair</option>
          </select>
          <label for="bom">Bill of Materials *</label>
          <select id="bom" name="bom" required>
            <option value="">Select a BOM</option>
            <option value="desk-bom" ${options.bom === "desk-bom" ? "selected" : ""}>Office desk BOM</option>
            <option value="chair-bom" ${options.bom === "chair-bom" ? "selected" : ""}>Office chair BOM</option>
          </select>
          <label for="quantity">Production quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" value="${options.quantity || ""}" required />
          <label for="components">Components available *</label>
          <select id="components" name="components" required>
            <option value="">Select availability</option>
            <option value="available" ${options.components === "available" ? "selected" : ""}>Available</option>
            <option value="shortage" ${options.components === "shortage" ? "selected" : ""}>Shortage</option>
          </select>
          <label for="status">Production status *</label>
          <select id="status" name="status" required>
            <option value="">Select a status</option>
            <option value="planned" ${options.status === "planned" ? "selected" : ""}>Planned</option>
            <option value="in-progress" ${options.status === "in-progress" ? "selected" : ""}>In progress</option>
            <option value="done" ${options.status === "done" ? "selected" : ""}>Done</option>
          </select>
          <button type="submit">Save manufacturing order</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("manufacturingForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["product", "bom", "quantity", "components", "status"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            const result = document.getElementById("result");
            if (document.getElementById("components").value === "shortage") {
              result.textContent = "Components are unavailable";
              return;
            }
            result.textContent = "Manufacturing order saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    bomField: page.locator("#bom"),
    quantityField: page.locator("#quantity"),
    componentsField: page.locator("#components"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", {
      name: /save manufacturing order/i,
    }),
    result: page.locator("#result"),
  };
}

test("loads the manufacturing order form", async ({ page }) => {
  const {
    productField,
    bomField,
    quantityField,
    componentsField,
    statusField,
    submitButton,
  } = await setupManufacturingPage(page);

  await expect(page).toHaveTitle(/Manufacturing/i);
  await expect(productField).toBeVisible();
  await expect(bomField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(componentsField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a manufacturing order with available components", async ({
  page,
}) => {
  const {
    productField,
    bomField,
    quantityField,
    componentsField,
    statusField,
    submitButton,
    result,
  } = await setupManufacturingPage(page);

  await productField.selectOption("desk");
  await bomField.selectOption("desk-bom");
  await quantityField.fill("5");
  await componentsField.selectOption("available");
  await statusField.selectOption("planned");
  await submitButton.click();

  await expect(result).toHaveText(
    "Manufacturing order saved: desk | desk-bom | 5 | available | planned",
  );
});

test("requires product, BOM, quantity, components, and status", async ({
  page,
}) => {
  const {
    productField,
    bomField,
    quantityField,
    componentsField,
    statusField,
    submitButton,
  } = await setupManufacturingPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      bomField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      componentsField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero production quantity", async ({ page }) => {
  const {
    productField,
    bomField,
    quantityField,
    componentsField,
    statusField,
    submitButton,
  } = await setupManufacturingPage(page, {
    product: "chair",
    bom: "chair-bom",
    quantity: "0",
    components: "available",
    status: "planned",
  });

  await productField.selectOption("chair");
  await bomField.selectOption("chair-bom");
  await componentsField.selectOption("available");
  await statusField.selectOption("planned");
  await submitButton.click();

  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.rangeUnderflow),
    )
    .toBeTruthy();
});

test("blocks production when components are unavailable", async ({ page }) => {
  const {
    productField,
    bomField,
    quantityField,
    componentsField,
    statusField,
    submitButton,
    result,
  } = await setupManufacturingPage(page, {
    product: "desk",
    bom: "desk-bom",
    quantity: "2",
    components: "shortage",
    status: "planned",
  });

  await expect(componentsField).toHaveValue("shortage");
  await submitButton.click();

  await expect(result).toHaveText("Components are unavailable");
});

test("marks an in-progress manufacturing order as done", async ({ page }) => {
  const {
    productField,
    bomField,
    quantityField,
    componentsField,
    statusField,
    submitButton,
    result,
  } = await setupManufacturingPage(page, {
    product: "chair",
    bom: "chair-bom",
    quantity: "4",
    components: "available",
    status: "in-progress",
  });

  await expect(statusField).toHaveValue("in-progress");
  await statusField.selectOption("done");
  await submitButton.click();

  await expect(result).toContainText("chair");
  await expect(result).toContainText("chair-bom");
  await expect(result).toContainText("done");
});
