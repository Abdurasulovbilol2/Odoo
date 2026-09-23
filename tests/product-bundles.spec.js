const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupProductBundlesPage(page, options = {}) {
  const safeOptions = {
    bundleName: escapeHtml(options.bundleName),
    componentOne: escapeHtml(options.componentOne),
    componentTwo: escapeHtml(options.componentTwo),
    componentCount: escapeHtml(options.componentCount),
    bundlePrice: escapeHtml(options.bundlePrice),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Product Bundles | Odoo</title>
      </head>
      <body>
        <h1>Product Bundles</h1>
        <form id="bundleForm">
          <label for="bundleName">Bundle name *</label>
          <input id="bundleName" name="bundleName" type="text" value="${safeOptions.bundleName || ""}" required />

          <label for="componentOne">Primary component *</label>
          <input id="componentOne" name="componentOne" type="text" value="${safeOptions.componentOne || ""}" required />

          <label for="componentTwo">Secondary component *</label>
          <input id="componentTwo" name="componentTwo" type="text" value="${safeOptions.componentTwo || ""}" required />

          <label for="componentCount">Component count *</label>
          <input id="componentCount" name="componentCount" type="number" step="1" value="${safeOptions.componentCount || ""}" required />

          <label for="bundlePrice">Bundle price *</label>
          <input id="bundlePrice" name="bundlePrice" type="number" step="0.01" value="${safeOptions.bundlePrice || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Active" ${safeOptions.status === "Active" ? "selected" : ""}>Active</option>
            <option value="Archived" ${safeOptions.status === "Archived" ? "selected" : ""}>Archived</option>
          </select>

          <button type="submit">Save bundle</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("bundleForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const bundleName = document.getElementById("bundleName").value;
            const componentOne = document.getElementById("componentOne").value;
            const componentTwo = document.getElementById("componentTwo").value;
            const componentCount = Number(document.getElementById("componentCount").value);
            const bundlePrice = Number(document.getElementById("bundlePrice").value);
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (componentCount < 2) {
              result.textContent = "A bundle must contain at least two components";
              return;
            }

            if (bundlePrice <= 0) {
              result.textContent = "Bundle price must be greater than zero";
              return;
            }

            if (componentOne.trim().toLowerCase() === componentTwo.trim().toLowerCase()) {
              result.textContent = "Bundle components must be different products";
              return;
            }

            result.textContent = "Bundle saved: " + [bundleName, componentOne, componentTwo, componentCount, bundlePrice.toFixed(2), status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    bundleNameField: page.locator("#bundleName"),
    componentOneField: page.locator("#componentOne"),
    componentTwoField: page.locator("#componentTwo"),
    componentCountField: page.locator("#componentCount"),
    bundlePriceField: page.locator("#bundlePrice"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save bundle/i }),
    result: page.locator("#result"),
  };
}

test("loads the product bundles form", async ({ page }) => {
  const {
    bundleNameField,
    componentOneField,
    componentTwoField,
    componentCountField,
    bundlePriceField,
    statusField,
    submitButton,
  } = await setupProductBundlesPage(page);

  await expect(page).toHaveTitle(/Product Bundles/i);
  await expect(bundleNameField).toBeVisible();
  await expect(componentOneField).toBeVisible();
  await expect(componentTwoField).toBeVisible();
  await expect(componentCountField).toBeVisible();
  await expect(bundlePriceField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid product bundle", async ({ page }) => {
  const {
    bundleNameField,
    componentOneField,
    componentTwoField,
    componentCountField,
    bundlePriceField,
    statusField,
    submitButton,
    result,
  } = await setupProductBundlesPage(page);

  await bundleNameField.fill("Remote Work Kit");
  await componentOneField.fill("Wireless Mouse");
  await componentTwoField.fill("Laptop Stand");
  await componentCountField.fill("2");
  await bundlePriceField.fill("79.99");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Bundle saved: Remote Work Kit | Wireless Mouse | Laptop Stand | 2 | 79.99 | Active",
  );
});

test("requires all bundle fields before saving", async ({ page }) => {
  const {
    bundleNameField,
    componentOneField,
    componentTwoField,
    componentCountField,
    bundlePriceField,
    statusField,
    submitButton,
  } = await setupProductBundlesPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      bundleNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      componentOneField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      componentTwoField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      componentCountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      bundlePriceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects bundles with fewer than two components", async ({ page }) => {
  const {
    bundleNameField,
    componentOneField,
    componentTwoField,
    componentCountField,
    bundlePriceField,
    statusField,
    submitButton,
    result,
  } = await setupProductBundlesPage(page);

  await bundleNameField.fill("Single Item Offer");
  await componentOneField.fill("Water Bottle");
  await componentTwoField.fill("Bottle Sleeve");
  await componentCountField.fill("1");
  await bundlePriceField.fill("20");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText(
    "A bundle must contain at least two components",
  );
});

test("keeps a pre-filled product bundle", async ({ page }) => {
  const {
    bundleNameField,
    componentOneField,
    componentTwoField,
    componentCountField,
    bundlePriceField,
    statusField,
    submitButton,
    result,
  } = await setupProductBundlesPage(page, {
    bundleName: 'Kitchen Set "Daily"',
    componentOne: "Chef Knife",
    componentTwo: "Cutting Board",
    componentCount: "2",
    bundlePrice: "54.5",
    status: "Archived",
  });

  await expect(bundleNameField).toHaveValue('Kitchen Set "Daily"');
  await expect(componentOneField).toHaveValue("Chef Knife");
  await expect(componentTwoField).toHaveValue("Cutting Board");
  await expect(componentCountField).toHaveValue("2");
  await expect(bundlePriceField).toHaveValue("54.5");
  await expect(statusField).toHaveValue("Archived");
  await submitButton.click();

  await expect(result).toContainText('Kitchen Set "Daily"');
  await expect(result).toContainText("Chef Knife");
  await expect(result).toContainText("54.50");
});
