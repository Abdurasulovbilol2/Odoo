const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupProductPricelistsPage(page, options = {}) {
  const safeOptions = {
    pricelist: escapeHtml(options.pricelist),
    product: escapeHtml(options.product),
    customerGroup: escapeHtml(options.customerGroup),
    price: escapeHtml(options.price),
    currency: escapeHtml(options.currency),
    validFrom: escapeHtml(options.validFrom),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Product Pricelists | Odoo</title>
      </head>
      <body>
        <h1>Product Pricelists</h1>
        <form id="pricelistForm">
          <label for="pricelist">Pricelist *</label>
          <input id="pricelist" name="pricelist" type="text" value="${safeOptions.pricelist || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="customerGroup">Customer group *</label>
          <select id="customerGroup" name="customerGroup" required>
            <option value="">Select group</option>
            <option value="Retail" ${safeOptions.customerGroup === "Retail" ? "selected" : ""}>Retail</option>
            <option value="Wholesale" ${safeOptions.customerGroup === "Wholesale" ? "selected" : ""}>Wholesale</option>
            <option value="Distributor" ${safeOptions.customerGroup === "Distributor" ? "selected" : ""}>Distributor</option>
          </select>

          <label for="price">Price *</label>
          <input id="price" name="price" type="number" step="0.01" value="${safeOptions.price || ""}" required />

          <label for="currency">Currency *</label>
          <select id="currency" name="currency" required>
            <option value="">Select currency</option>
            <option value="USD" ${safeOptions.currency === "USD" ? "selected" : ""}>USD</option>
            <option value="EUR" ${safeOptions.currency === "EUR" ? "selected" : ""}>EUR</option>
            <option value="GBP" ${safeOptions.currency === "GBP" ? "selected" : ""}>GBP</option>
          </select>

          <label for="validFrom">Valid from *</label>
          <input id="validFrom" name="validFrom" type="date" value="${safeOptions.validFrom || ""}" required />

          <button type="submit">Save price rule</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("pricelistForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const pricelist = document.getElementById("pricelist").value;
            const product = document.getElementById("product").value;
            const customerGroup = document.getElementById("customerGroup").value;
            const price = Number(document.getElementById("price").value);
            const currency = document.getElementById("currency").value;
            const validFrom = document.getElementById("validFrom").value;
            const result = document.getElementById("result");

            if (price <= 0) {
              result.textContent = "Price must be greater than zero";
              return;
            }

            if (customerGroup === "Wholesale" && price < 10) {
              result.textContent = "Wholesale price must be at least 10";
              return;
            }

            result.textContent = "Price rule saved: " + [pricelist, product, customerGroup, price.toFixed(2), currency, validFrom].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    pricelistField: page.locator("#pricelist"),
    productField: page.locator("#product"),
    customerGroupField: page.locator("#customerGroup"),
    priceField: page.locator("#price"),
    currencyField: page.locator("#currency"),
    validFromField: page.locator("#validFrom"),
    submitButton: page.getByRole("button", { name: /save price rule/i }),
    result: page.locator("#result"),
  };
}

test("loads the product pricelists form", async ({ page }) => {
  const {
    pricelistField,
    productField,
    customerGroupField,
    priceField,
    currencyField,
    validFromField,
    submitButton,
  } = await setupProductPricelistsPage(page);

  await expect(page).toHaveTitle(/Product Pricelists/i);
  await expect(pricelistField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(customerGroupField).toBeVisible();
  await expect(priceField).toBeVisible();
  await expect(currencyField).toBeVisible();
  await expect(validFromField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid product price rule", async ({ page }) => {
  const {
    pricelistField,
    productField,
    customerGroupField,
    priceField,
    currencyField,
    validFromField,
    submitButton,
    result,
  } = await setupProductPricelistsPage(page);

  await pricelistField.fill("Standard Retail");
  await productField.fill("Wireless Keyboard");
  await customerGroupField.selectOption("Retail");
  await priceField.fill("49.95");
  await currencyField.selectOption("USD");
  await validFromField.fill("2026-09-23");
  await submitButton.click();

  await expect(result).toHaveText(
    "Price rule saved: Standard Retail | Wireless Keyboard | Retail | 49.95 | USD | 2026-09-23",
  );
});

test("requires all pricelist fields before saving", async ({ page }) => {
  const {
    pricelistField,
    productField,
    customerGroupField,
    priceField,
    currencyField,
    validFromField,
    submitButton,
  } = await setupProductPricelistsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      pricelistField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      customerGroupField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      priceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      currencyField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      validFromField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects non-positive prices", async ({ page }) => {
  const {
    pricelistField,
    productField,
    customerGroupField,
    priceField,
    currencyField,
    validFromField,
    submitButton,
    result,
  } = await setupProductPricelistsPage(page);

  await pricelistField.fill("Campaign Prices");
  await productField.fill("USB Hub");
  await customerGroupField.selectOption("Retail");
  await priceField.fill("0");
  await currencyField.selectOption("EUR");
  await validFromField.fill("2026-09-24");
  await submitButton.click();

  await expect(result).toHaveText("Price must be greater than zero");
});

test("keeps a pre-filled product price rule", async ({ page }) => {
  const {
    pricelistField,
    productField,
    customerGroupField,
    priceField,
    currencyField,
    validFromField,
    submitButton,
    result,
  } = await setupProductPricelistsPage(page, {
    pricelist: 'Partner Prices "Autumn"',
    product: "Industrial Cable",
    customerGroup: "Wholesale",
    price: "18.5",
    currency: "GBP",
    validFrom: "2026-09-01",
  });

  await expect(pricelistField).toHaveValue('Partner Prices "Autumn"');
  await expect(productField).toHaveValue("Industrial Cable");
  await expect(customerGroupField).toHaveValue("Wholesale");
  await expect(priceField).toHaveValue("18.5");
  await expect(currencyField).toHaveValue("GBP");
  await expect(validFromField).toHaveValue("2026-09-01");
  await submitButton.click();

  await expect(result).toContainText('Partner Prices "Autumn"');
  await expect(result).toContainText("Industrial Cable");
  await expect(result).toContainText("18.50");
});
