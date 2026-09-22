const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupShippingLabelsPage(page, options = {}) {
  const safeOptions = {
    orderReference: escapeHtml(options.orderReference),
    customer: escapeHtml(options.customer),
    shippingAddress: escapeHtml(options.shippingAddress),
    packageWeight: escapeHtml(options.packageWeight),
    carrier: escapeHtml(options.carrier),
    labelStatus: escapeHtml(options.labelStatus),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Shipping Labels | Odoo</title>
      </head>
      <body>
        <h1>Shipping Labels</h1>
        <form id="shippingForm">
          <label for="orderReference">Order reference *</label>
          <input id="orderReference" name="orderReference" type="text" value="${safeOptions.orderReference || ""}" required />

          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${safeOptions.customer || ""}" required />

          <label for="shippingAddress">Shipping address *</label>
          <textarea id="shippingAddress" name="shippingAddress" required>${safeOptions.shippingAddress || ""}</textarea>

          <label for="packageWeight">Package weight (kg) *</label>
          <input id="packageWeight" name="packageWeight" type="number" step="0.01" value="${safeOptions.packageWeight || ""}" required />

          <label for="carrier">Carrier *</label>
          <select id="carrier" name="carrier" required>
            <option value="">Select carrier</option>
            <option value="DHL" ${safeOptions.carrier === "DHL" ? "selected" : ""}>DHL</option>
            <option value="FedEx" ${safeOptions.carrier === "FedEx" ? "selected" : ""}>FedEx</option>
            <option value="UPS" ${safeOptions.carrier === "UPS" ? "selected" : ""}>UPS</option>
            <option value="Local Courier" ${safeOptions.carrier === "Local Courier" ? "selected" : ""}>Local Courier</option>
          </select>

          <label for="labelStatus">Label status *</label>
          <select id="labelStatus" name="labelStatus" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.labelStatus === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Printed" ${safeOptions.labelStatus === "Printed" ? "selected" : ""}>Printed</option>
            <option value="In Transit" ${safeOptions.labelStatus === "In Transit" ? "selected" : ""}>In Transit</option>
            <option value="Delivered" ${safeOptions.labelStatus === "Delivered" ? "selected" : ""}>Delivered</option>
          </select>

          <button type="submit">Generate label</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("shippingForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const orderReference = document.getElementById("orderReference").value;
            const customer = document.getElementById("customer").value;
            const shippingAddress = document.getElementById("shippingAddress").value.trim();
            const packageWeight = Number(document.getElementById("packageWeight").value);
            const carrier = document.getElementById("carrier").value;
            const labelStatus = document.getElementById("labelStatus").value;
            const result = document.getElementById("result");

            if (packageWeight <= 0) {
              result.textContent = "Package weight must be greater than zero";
              return;
            }

            if (!shippingAddress || shippingAddress.length < 10) {
              result.textContent = "Shipping address must be detailed enough for delivery";
              return;
            }

            result.textContent = "Label generated: " + [orderReference, customer, carrier, packageWeight.toFixed(2), labelStatus, shippingAddress].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    orderReferenceField: page.locator("#orderReference"),
    customerField: page.locator("#customer"),
    shippingAddressField: page.locator("#shippingAddress"),
    packageWeightField: page.locator("#packageWeight"),
    carrierField: page.locator("#carrier"),
    labelStatusField: page.locator("#labelStatus"),
    submitButton: page.getByRole("button", { name: /generate label/i }),
    result: page.locator("#result"),
  };
}

test("loads the shipping labels form", async ({ page }) => {
  const {
    orderReferenceField,
    customerField,
    shippingAddressField,
    packageWeightField,
    carrierField,
    labelStatusField,
    submitButton,
  } = await setupShippingLabelsPage(page);

  await expect(page).toHaveTitle(/Shipping Labels/i);
  await expect(orderReferenceField).toBeVisible();
  await expect(customerField).toBeVisible();
  await expect(shippingAddressField).toBeVisible();
  await expect(packageWeightField).toBeVisible();
  await expect(carrierField).toBeVisible();
  await expect(labelStatusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("generates a valid shipping label", async ({ page }) => {
  const {
    orderReferenceField,
    customerField,
    shippingAddressField,
    packageWeightField,
    carrierField,
    labelStatusField,
    submitButton,
    result,
  } = await setupShippingLabelsPage(page);

  await orderReferenceField.fill("SO-2026-1042");
  await customerField.fill("Northwind Retail");
  await shippingAddressField.fill("125 Harbor Drive, Apt 12, Miami, FL 33101");
  await packageWeightField.fill("8.4");
  await carrierField.selectOption("DHL");
  await labelStatusField.selectOption("Printed");
  await submitButton.click();

  await expect(result).toHaveText(
    "Label generated: SO-2026-1042 | Northwind Retail | DHL | 8.40 | Printed | 125 Harbor Drive, Apt 12, Miami, FL 33101",
  );
});

test("requires all shipping fields before generation", async ({ page }) => {
  const {
    orderReferenceField,
    customerField,
    shippingAddressField,
    packageWeightField,
    carrierField,
    labelStatusField,
    submitButton,
  } = await setupShippingLabelsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      orderReferenceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      shippingAddressField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      packageWeightField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      carrierField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      labelStatusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative package weights", async ({ page }) => {
  const {
    orderReferenceField,
    customerField,
    shippingAddressField,
    packageWeightField,
    carrierField,
    labelStatusField,
    submitButton,
    result,
  } = await setupShippingLabelsPage(page);

  await orderReferenceField.fill("SO-2026-1201");
  await customerField.fill("Blue Ocean Stores");
  await shippingAddressField.fill("77 Sun Street, Seattle, WA 98101");
  await packageWeightField.fill("0");
  await carrierField.selectOption("UPS");
  await labelStatusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Package weight must be greater than zero");
});

test("keeps a pre-filled shipping label record", async ({ page }) => {
  const {
    orderReferenceField,
    customerField,
    shippingAddressField,
    packageWeightField,
    carrierField,
    labelStatusField,
    submitButton,
    result,
  } = await setupShippingLabelsPage(page, {
    orderReference: 'SO-2026-1120 "Rush"',
    customer: "Summit Goods",
    shippingAddress: "9 Prairie Ave, Denver, CO 80201",
    packageWeight: "6.2",
    carrier: "FedEx",
    labelStatus: "In Transit",
  });

  await expect(orderReferenceField).toHaveValue('SO-2026-1120 "Rush"');
  await expect(customerField).toHaveValue("Summit Goods");
  await expect(shippingAddressField).toHaveValue(
    "9 Prairie Ave, Denver, CO 80201",
  );
  await expect(packageWeightField).toHaveValue("6.2");
  await expect(carrierField).toHaveValue("FedEx");
  await expect(labelStatusField).toHaveValue("In Transit");
  await submitButton.click();

  await expect(result).toContainText('SO-2026-1120 "Rush"');
  await expect(result).toContainText("Summit Goods");
  await expect(result).toContainText("6.20");
});
