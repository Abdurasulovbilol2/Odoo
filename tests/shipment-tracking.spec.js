const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupShipmentTrackingPage(page, options = {}) {
  const safeOptions = {
    shipmentReference: escapeHtml(options.shipmentReference),
    customer: escapeHtml(options.customer),
    carrier: escapeHtml(options.carrier),
    trackingNumber: escapeHtml(options.trackingNumber),
    shippedDate: escapeHtml(options.shippedDate),
    expectedDate: escapeHtml(options.expectedDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Shipment Tracking | Odoo</title>
      </head>
      <body>
        <h1>Shipment Tracking</h1>
        <form id="shipmentForm">
          <label for="shipmentReference">Shipment reference *</label>
          <input id="shipmentReference" name="shipmentReference" type="text" value="${safeOptions.shipmentReference || ""}" required />

          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${safeOptions.customer || ""}" required />

          <label for="carrier">Carrier *</label>
          <select id="carrier" name="carrier" required>
            <option value="">Select carrier</option>
            <option value="DHL" ${safeOptions.carrier === "DHL" ? "selected" : ""}>DHL</option>
            <option value="FedEx" ${safeOptions.carrier === "FedEx" ? "selected" : ""}>FedEx</option>
            <option value="UPS" ${safeOptions.carrier === "UPS" ? "selected" : ""}>UPS</option>
            <option value="Local courier" ${safeOptions.carrier === "Local courier" ? "selected" : ""}>Local courier</option>
          </select>

          <label for="trackingNumber">Tracking number *</label>
          <input id="trackingNumber" name="trackingNumber" type="text" value="${safeOptions.trackingNumber || ""}" required />

          <label for="shippedDate">Shipped date *</label>
          <input id="shippedDate" name="shippedDate" type="date" value="${safeOptions.shippedDate || ""}" required />

          <label for="expectedDate">Expected delivery date *</label>
          <input id="expectedDate" name="expectedDate" type="date" value="${safeOptions.expectedDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="In transit" ${safeOptions.status === "In transit" ? "selected" : ""}>In transit</option>
            <option value="Delivered" ${safeOptions.status === "Delivered" ? "selected" : ""}>Delivered</option>
            <option value="Delayed" ${safeOptions.status === "Delayed" ? "selected" : ""}>Delayed</option>
          </select>

          <button type="submit">Save shipment tracking</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("shipmentForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const shipmentReference = document.getElementById("shipmentReference").value;
            const customer = document.getElementById("customer").value;
            const carrier = document.getElementById("carrier").value;
            const trackingNumber = document.getElementById("trackingNumber").value;
            const shippedDate = document.getElementById("shippedDate").value;
            const expectedDate = document.getElementById("expectedDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (shippedDate && expectedDate && shippedDate > expectedDate) {
              result.textContent = "Expected delivery must be on or after shipped date";
              return;
            }

            result.textContent = "Shipment tracking saved: " + [shipmentReference, customer, carrier, trackingNumber, shippedDate, expectedDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    shipmentReferenceField: page.locator("#shipmentReference"),
    customerField: page.locator("#customer"),
    carrierField: page.locator("#carrier"),
    trackingNumberField: page.locator("#trackingNumber"),
    shippedDateField: page.locator("#shippedDate"),
    expectedDateField: page.locator("#expectedDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save shipment tracking/i }),
    result: page.locator("#result"),
  };
}

test("loads the shipment tracking form", async ({ page }) => {
  const {
    shipmentReferenceField,
    customerField,
    carrierField,
    trackingNumberField,
    shippedDateField,
    expectedDateField,
    statusField,
    submitButton,
  } = await setupShipmentTrackingPage(page);

  await expect(page).toHaveTitle(/Shipment Tracking/i);
  await expect(shipmentReferenceField).toBeVisible();
  await expect(customerField).toBeVisible();
  await expect(carrierField).toBeVisible();
  await expect(trackingNumberField).toBeVisible();
  await expect(shippedDateField).toBeVisible();
  await expect(expectedDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves valid shipment tracking", async ({ page }) => {
  const {
    shipmentReferenceField,
    customerField,
    carrierField,
    trackingNumberField,
    shippedDateField,
    expectedDateField,
    statusField,
    submitButton,
    result,
  } = await setupShipmentTrackingPage(page);

  await shipmentReferenceField.fill("OUT-2026-1184");
  await customerField.fill("Mira Textile Group");
  await carrierField.selectOption("FedEx");
  await trackingNumberField.fill("FX-884211");
  await shippedDateField.fill("2026-09-22");
  await expectedDateField.fill("2026-09-26");
  await statusField.selectOption("In transit");
  await submitButton.click();

  await expect(result).toHaveText(
    "Shipment tracking saved: OUT-2026-1184 | Mira Textile Group | FedEx | FX-884211 | 2026-09-22 | 2026-09-26 | In transit",
  );
});

test("requires shipment tracking details before saving", async ({ page }) => {
  const {
    shipmentReferenceField,
    customerField,
    carrierField,
    trackingNumberField,
    shippedDateField,
    expectedDateField,
    statusField,
    submitButton,
  } = await setupShipmentTrackingPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      shipmentReferenceField.evaluate(
        (element) => element.validity.valueMissing,
      ),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      carrierField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      trackingNumberField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      shippedDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      expectedDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects delivery before the shipped date", async ({ page }) => {
  const {
    shipmentReferenceField,
    customerField,
    carrierField,
    trackingNumberField,
    shippedDateField,
    expectedDateField,
    statusField,
    submitButton,
    result,
  } = await setupShipmentTrackingPage(page);

  await shipmentReferenceField.fill("OUT-2026-1190");
  await customerField.fill("Caspian Electronics");
  await carrierField.selectOption("UPS");
  await trackingNumberField.fill("UPS-909010");
  await shippedDateField.fill("2026-09-28");
  await expectedDateField.fill("2026-09-27");
  await statusField.selectOption("Delayed");
  await submitButton.click();

  await expect(result).toHaveText(
    "Expected delivery must be on or after shipped date",
  );
});

test("keeps a pre-filled shipment tracking record", async ({ page }) => {
  const {
    shipmentReferenceField,
    customerField,
    carrierField,
    trackingNumberField,
    shippedDateField,
    expectedDateField,
    statusField,
    submitButton,
    result,
  } = await setupShipmentTrackingPage(page, {
    shipmentReference: 'OUT-2026-1100 "Priority"',
    customer: "Atlas Office Supply",
    carrier: "DHL",
    trackingNumber: "DHL-771200",
    shippedDate: "2026-09-20",
    expectedDate: "2026-09-23",
    status: "Delivered",
  });

  await expect(shipmentReferenceField).toHaveValue('OUT-2026-1100 "Priority"');
  await expect(customerField).toHaveValue("Atlas Office Supply");
  await expect(carrierField).toHaveValue("DHL");
  await expect(trackingNumberField).toHaveValue("DHL-771200");
  await expect(shippedDateField).toHaveValue("2026-09-20");
  await expect(expectedDateField).toHaveValue("2026-09-23");
  await expect(statusField).toHaveValue("Delivered");
  await submitButton.click();

  await expect(result).toContainText('OUT-2026-1100 "Priority"');
  await expect(result).toContainText("DHL-771200");
  await expect(result).toContainText("Delivered");
});
