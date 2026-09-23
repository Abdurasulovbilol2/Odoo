const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupProductPackagingPage(page, options = {}) {
  const safeOptions = {
    product: escapeHtml(options.product),
    packageType: escapeHtml(options.packageType),
    unitsPerPackage: escapeHtml(options.unitsPerPackage),
    length: escapeHtml(options.length),
    width: escapeHtml(options.width),
    barcode: escapeHtml(options.barcode),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Product Packaging | Odoo</title>
      </head>
      <body>
        <h1>Product Packaging</h1>
        <form id="packagingForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="packageType">Package type *</label>
          <select id="packageType" name="packageType" required>
            <option value="">Select type</option>
            <option value="Box" ${safeOptions.packageType === "Box" ? "selected" : ""}>Box</option>
            <option value="Pallet" ${safeOptions.packageType === "Pallet" ? "selected" : ""}>Pallet</option>
            <option value="Crate" ${safeOptions.packageType === "Crate" ? "selected" : ""}>Crate</option>
            <option value="Bag" ${safeOptions.packageType === "Bag" ? "selected" : ""}>Bag</option>
          </select>

          <label for="unitsPerPackage">Units per package *</label>
          <input id="unitsPerPackage" name="unitsPerPackage" type="number" step="1" value="${safeOptions.unitsPerPackage || ""}" required />

          <label for="length">Length (cm) *</label>
          <input id="length" name="length" type="number" step="0.01" value="${safeOptions.length || ""}" required />

          <label for="width">Width (cm) *</label>
          <input id="width" name="width" type="number" step="0.01" value="${safeOptions.width || ""}" required />

          <label for="barcode">Package barcode *</label>
          <input id="barcode" name="barcode" type="text" value="${safeOptions.barcode || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Active" ${safeOptions.status === "Active" ? "selected" : ""}>Active</option>
            <option value="Archived" ${safeOptions.status === "Archived" ? "selected" : ""}>Archived</option>
          </select>

          <button type="submit">Save packaging</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("packagingForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const product = document.getElementById("product").value;
            const packageType = document.getElementById("packageType").value;
            const unitsPerPackage = Number(document.getElementById("unitsPerPackage").value);
            const length = Number(document.getElementById("length").value);
            const width = Number(document.getElementById("width").value);
            const barcode = document.getElementById("barcode").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (unitsPerPackage <= 0) {
              result.textContent = "Units per package must be greater than zero";
              return;
            }

            if (length <= 0 || width <= 0) {
              result.textContent = "Package dimensions must be greater than zero";
              return;
            }

            if (status === "Active" && barcode.trim().length < 8) {
              result.textContent = "Active packaging requires a valid barcode";
              return;
            }

            result.textContent = "Packaging saved: " + [product, packageType, unitsPerPackage, length.toFixed(2), width.toFixed(2), barcode, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    packageTypeField: page.locator("#packageType"),
    unitsPerPackageField: page.locator("#unitsPerPackage"),
    lengthField: page.locator("#length"),
    widthField: page.locator("#width"),
    barcodeField: page.locator("#barcode"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save packaging/i }),
    result: page.locator("#result"),
  };
}

test("loads the product packaging form", async ({ page }) => {
  const {
    productField,
    packageTypeField,
    unitsPerPackageField,
    lengthField,
    widthField,
    barcodeField,
    statusField,
    submitButton,
  } = await setupProductPackagingPage(page);

  await expect(page).toHaveTitle(/Product Packaging/i);
  await expect(productField).toBeVisible();
  await expect(packageTypeField).toBeVisible();
  await expect(unitsPerPackageField).toBeVisible();
  await expect(lengthField).toBeVisible();
  await expect(widthField).toBeVisible();
  await expect(barcodeField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid product packaging rule", async ({ page }) => {
  const {
    productField,
    packageTypeField,
    unitsPerPackageField,
    lengthField,
    widthField,
    barcodeField,
    statusField,
    submitButton,
    result,
  } = await setupProductPackagingPage(page);

  await productField.fill("Ceramic Tile");
  await packageTypeField.selectOption("Box");
  await unitsPerPackageField.fill("24");
  await lengthField.fill("40");
  await widthField.fill("30");
  await barcodeField.fill("PKG123456");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Packaging saved: Ceramic Tile | Box | 24 | 40.00 | 30.00 | PKG123456 | Active",
  );
});

test("requires all packaging fields before saving", async ({ page }) => {
  const {
    productField,
    packageTypeField,
    unitsPerPackageField,
    lengthField,
    widthField,
    barcodeField,
    statusField,
    submitButton,
  } = await setupProductPackagingPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      packageTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      unitsPerPackageField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      lengthField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      widthField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      barcodeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects non-positive package dimensions", async ({ page }) => {
  const {
    productField,
    packageTypeField,
    unitsPerPackageField,
    lengthField,
    widthField,
    barcodeField,
    statusField,
    submitButton,
    result,
  } = await setupProductPackagingPage(page);

  await productField.fill("Steel Fasteners");
  await packageTypeField.selectOption("Crate");
  await unitsPerPackageField.fill("50");
  await lengthField.fill("0");
  await widthField.fill("20");
  await barcodeField.fill("CRATE9988");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Package dimensions must be greater than zero",
  );
});

test("keeps a pre-filled product packaging rule", async ({ page }) => {
  const {
    productField,
    packageTypeField,
    unitsPerPackageField,
    lengthField,
    widthField,
    barcodeField,
    statusField,
    submitButton,
    result,
  } = await setupProductPackagingPage(page, {
    product: 'Coffee Beans "Premium"',
    packageType: "Bag",
    unitsPerPackage: "10",
    length: "25.5",
    width: "18",
    barcode: "BAG445566",
    status: "Archived",
  });

  await expect(productField).toHaveValue('Coffee Beans "Premium"');
  await expect(packageTypeField).toHaveValue("Bag");
  await expect(unitsPerPackageField).toHaveValue("10");
  await expect(lengthField).toHaveValue("25.5");
  await expect(widthField).toHaveValue("18");
  await expect(barcodeField).toHaveValue("BAG445566");
  await expect(statusField).toHaveValue("Archived");
  await submitButton.click();

  await expect(result).toContainText('Coffee Beans "Premium"');
  await expect(result).toContainText("BAG445566");
  await expect(result).toContainText("25.50");
});
