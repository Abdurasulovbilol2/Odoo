const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupProductVariantsPage(page, options = {}) {
  const safeOptions = {
    productTemplate: escapeHtml(options.productTemplate),
    sku: escapeHtml(options.sku),
    color: escapeHtml(options.color),
    size: escapeHtml(options.size),
    additionalCost: escapeHtml(options.additionalCost),
    active: escapeHtml(options.active),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Product Variants | Odoo</title>
      </head>
      <body>
        <h1>Product Variants</h1>
        <form id="variantForm">
          <label for="productTemplate">Product template *</label>
          <input id="productTemplate" name="productTemplate" type="text" value="${safeOptions.productTemplate || ""}" required />

          <label for="sku">SKU *</label>
          <input id="sku" name="sku" type="text" value="${safeOptions.sku || ""}" required />

          <label for="color">Color *</label>
          <select id="color" name="color" required>
            <option value="">Select color</option>
            <option value="Black" ${safeOptions.color === "Black" ? "selected" : ""}>Black</option>
            <option value="White" ${safeOptions.color === "White" ? "selected" : ""}>White</option>
            <option value="Blue" ${safeOptions.color === "Blue" ? "selected" : ""}>Blue</option>
            <option value="Red" ${safeOptions.color === "Red" ? "selected" : ""}>Red</option>
          </select>

          <label for="size">Size *</label>
          <select id="size" name="size" required>
            <option value="">Select size</option>
            <option value="Small" ${safeOptions.size === "Small" ? "selected" : ""}>Small</option>
            <option value="Medium" ${safeOptions.size === "Medium" ? "selected" : ""}>Medium</option>
            <option value="Large" ${safeOptions.size === "Large" ? "selected" : ""}>Large</option>
          </select>

          <label for="additionalCost">Additional cost *</label>
          <input id="additionalCost" name="additionalCost" type="number" step="0.01" value="${safeOptions.additionalCost || ""}" required />

          <label for="active">Status *</label>
          <select id="active" name="active" required>
            <option value="">Select status</option>
            <option value="Active" ${safeOptions.active === "Active" ? "selected" : ""}>Active</option>
            <option value="Archived" ${safeOptions.active === "Archived" ? "selected" : ""}>Archived</option>
          </select>

          <button type="submit">Save variant</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("variantForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const productTemplate = document.getElementById("productTemplate").value;
            const sku = document.getElementById("sku").value;
            const color = document.getElementById("color").value;
            const size = document.getElementById("size").value;
            const additionalCost = Number(document.getElementById("additionalCost").value);
            const active = document.getElementById("active").value;
            const result = document.getElementById("result");

            if (additionalCost < 0) {
              result.textContent = "Additional cost cannot be negative";
              return;
            }

            if (active === "Active" && !sku.trim()) {
              result.textContent = "Active variants require a SKU";
              return;
            }

            result.textContent = "Variant saved: " + [productTemplate, sku, color, size, additionalCost.toFixed(2), active].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productTemplateField: page.locator("#productTemplate"),
    skuField: page.locator("#sku"),
    colorField: page.locator("#color"),
    sizeField: page.locator("#size"),
    additionalCostField: page.locator("#additionalCost"),
    activeField: page.locator("#active"),
    submitButton: page.getByRole("button", { name: /save variant/i }),
    result: page.locator("#result"),
  };
}

test("loads the product variants form", async ({ page }) => {
  const {
    productTemplateField,
    skuField,
    colorField,
    sizeField,
    additionalCostField,
    activeField,
    submitButton,
  } = await setupProductVariantsPage(page);

  await expect(page).toHaveTitle(/Product Variants/i);
  await expect(productTemplateField).toBeVisible();
  await expect(skuField).toBeVisible();
  await expect(colorField).toBeVisible();
  await expect(sizeField).toBeVisible();
  await expect(additionalCostField).toBeVisible();
  await expect(activeField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid product variant", async ({ page }) => {
  const {
    productTemplateField,
    skuField,
    colorField,
    sizeField,
    additionalCostField,
    activeField,
    submitButton,
    result,
  } = await setupProductVariantsPage(page);

  await productTemplateField.fill("Performance Hoodie");
  await skuField.fill("HOOD-BLU-M");
  await colorField.selectOption("Blue");
  await sizeField.selectOption("Medium");
  await additionalCostField.fill("4.5");
  await activeField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Variant saved: Performance Hoodie | HOOD-BLU-M | Blue | Medium | 4.50 | Active",
  );
});

test("requires all variant fields before saving", async ({ page }) => {
  const {
    productTemplateField,
    skuField,
    colorField,
    sizeField,
    additionalCostField,
    activeField,
    submitButton,
  } = await setupProductVariantsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productTemplateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      skuField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      colorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      sizeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      additionalCostField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      activeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects negative additional costs", async ({ page }) => {
  const {
    productTemplateField,
    skuField,
    colorField,
    sizeField,
    additionalCostField,
    activeField,
    submitButton,
    result,
  } = await setupProductVariantsPage(page);

  await productTemplateField.fill("Safety Boots");
  await skuField.fill("BOOT-BLK-L");
  await colorField.selectOption("Black");
  await sizeField.selectOption("Large");
  await additionalCostField.fill("-2");
  await activeField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText("Additional cost cannot be negative");
});

test("keeps a pre-filled product variant", async ({ page }) => {
  const {
    productTemplateField,
    skuField,
    colorField,
    sizeField,
    additionalCostField,
    activeField,
    submitButton,
    result,
  } = await setupProductVariantsPage(page, {
    productTemplate: 'Travel Mug "Insulated"',
    sku: "MUG-WHT-S",
    color: "White",
    size: "Small",
    additionalCost: "1.25",
    active: "Archived",
  });

  await expect(productTemplateField).toHaveValue('Travel Mug "Insulated"');
  await expect(skuField).toHaveValue("MUG-WHT-S");
  await expect(colorField).toHaveValue("White");
  await expect(sizeField).toHaveValue("Small");
  await expect(additionalCostField).toHaveValue("1.25");
  await expect(activeField).toHaveValue("Archived");
  await submitButton.click();

  await expect(result).toContainText('Travel Mug "Insulated"');
  await expect(result).toContainText("MUG-WHT-S");
  await expect(result).toContainText("1.25");
});
