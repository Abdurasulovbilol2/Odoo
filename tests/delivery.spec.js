const { test, expect } = require("@playwright/test");

async function setupDeliveryPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Delivery | Odoo</title>
      </head>
      <body>
        <h1>Delivery</h1>
        <form id="deliveryForm">
          <label for="customerName">Customer *</label>
          <input id="customerName" name="customerName" type="text" value="${options.customerName || ""}" required />

          <label for="shippingAddress">Shipping address *</label>
          <textarea id="shippingAddress" name="shippingAddress" required>${options.shippingAddress || ""}</textarea>

          <label for="carrier">Carrier *</label>
          <select id="carrier" name="carrier" required>
            <option value="">Select carrier</option>
            <option value="UPS" ${options.carrier === "UPS" ? "selected" : ""}>UPS</option>
            <option value="DHL" ${options.carrier === "DHL" ? "selected" : ""}>DHL</option>
            <option value="FedEx" ${options.carrier === "FedEx" ? "selected" : ""}>FedEx</option>
            <option value="Ground" ${options.carrier === "Ground" ? "selected" : ""}>Ground</option>
          </select>

          <label for="trackingNumber">Tracking number *</label>
          <input id="trackingNumber" name="trackingNumber" type="text" value="${options.trackingNumber || ""}" required />

          <label for="scheduledDate">Scheduled date *</label>
          <input id="scheduledDate" name="scheduledDate" type="date" value="${options.scheduledDate || ""}" required />

          <label for="parcelWeight">Parcel weight (kg) *</label>
          <input id="parcelWeight" name="parcelWeight" type="number" step="0.1" value="${options.parcelWeight || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Ready" ${options.status === "Ready" ? "selected" : ""}>Ready</option>
            <option value="In Transit" ${options.status === "In Transit" ? "selected" : ""}>In Transit</option>
            <option value="Delivered" ${options.status === "Delivered" ? "selected" : ""}>Delivered</option>
          </select>

          <button type="submit">Create shipment</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("deliveryForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const customerName = document.getElementById("customerName").value;
            const shippingAddress = document.getElementById("shippingAddress").value;
            const carrier = document.getElementById("carrier").value;
            const trackingNumber = document.getElementById("trackingNumber").value;
            const scheduledDate = document.getElementById("scheduledDate").value;
            const parcelWeight = document.getElementById("parcelWeight").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (Number(parcelWeight) <= 0) {
              result.textContent = "Parcel weight must be greater than 0 kg";
              return;
            }

            result.textContent = "Shipment created: " + [customerName, shippingAddress, carrier, trackingNumber, scheduledDate, parcelWeight, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customerName"),
    addressField: page.locator("#shippingAddress"),
    carrierField: page.locator("#carrier"),
    trackingField: page.locator("#trackingNumber"),
    scheduledDateField: page.locator("#scheduledDate"),
    weightField: page.locator("#parcelWeight"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /create shipment/i }),
    result: page.locator("#result"),
  };
}

test("loads the delivery form", async ({ page }) => {
  const {
    customerField,
    addressField,
    carrierField,
    trackingField,
    scheduledDateField,
    weightField,
    statusField,
    submitButton,
  } = await setupDeliveryPage(page);

  await expect(page).toHaveTitle(/Delivery/i);
  await expect(customerField).toBeVisible();
  await expect(addressField).toBeVisible();
  await expect(carrierField).toBeVisible();
  await expect(trackingField).toBeVisible();
  await expect(scheduledDateField).toBeVisible();
  await expect(weightField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a valid shipment for a customer", async ({ page }) => {
  const {
    customerField,
    addressField,
    carrierField,
    trackingField,
    scheduledDateField,
    weightField,
    statusField,
    submitButton,
    result,
  } = await setupDeliveryPage(page);

  await customerField.fill("Lina Bektemirova");
  await addressField.fill("15 Market Street, Tashkent");
  await carrierField.selectOption("DHL");
  await trackingField.fill("DHL-2026-1042");
  await scheduledDateField.fill("2026-09-18");
  await weightField.fill("12.5");
  await statusField.selectOption("In Transit");
  await submitButton.click();

  await expect(result).toHaveText(
    "Shipment created: Lina Bektemirova | 15 Market Street, Tashkent | DHL | DHL-2026-1042 | 2026-09-18 | 12.5 | In Transit",
  );
});

test("requires shipping details before creating a shipment", async ({
  page,
}) => {
  const {
    customerField,
    addressField,
    carrierField,
    trackingField,
    scheduledDateField,
    weightField,
    statusField,
    submitButton,
  } = await setupDeliveryPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      addressField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      carrierField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      trackingField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      scheduledDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      weightField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative parcel weight", async ({ page }) => {
  const {
    customerField,
    addressField,
    carrierField,
    trackingField,
    scheduledDateField,
    weightField,
    statusField,
    submitButton,
    result,
  } = await setupDeliveryPage(page);

  await customerField.fill("Aziz Ismailov");
  await addressField.fill("8 River Lane, Samarkand");
  await carrierField.selectOption("FedEx");
  await trackingField.fill("FX-001");
  await scheduledDateField.fill("2026-09-19");
  await weightField.fill("0");
  await statusField.selectOption("Ready");
  await submitButton.click();

  await expect(result).toHaveText("Parcel weight must be greater than 0 kg");
});

test("keeps a pre-filled delivery order", async ({ page }) => {
  const {
    customerField,
    addressField,
    carrierField,
    trackingField,
    scheduledDateField,
    weightField,
    statusField,
    submitButton,
    result,
  } = await setupDeliveryPage(page, {
    customerName: "Nargiza Asadova",
    shippingAddress: "42 Golden Avenue, Bukhara",
    carrier: "UPS",
    trackingNumber: "UPS-9921",
    scheduledDate: "2026-09-22",
    parcelWeight: "7.8",
    status: "Delivered",
  });

  await expect(customerField).toHaveValue("Nargiza Asadova");
  await expect(addressField).toHaveValue("42 Golden Avenue, Bukhara");
  await expect(carrierField).toHaveValue("UPS");
  await expect(trackingField).toHaveValue("UPS-9921");
  await expect(scheduledDateField).toHaveValue("2026-09-22");
  await expect(weightField).toHaveValue("7.8");
  await expect(statusField).toHaveValue("Delivered");
  await submitButton.click();

  await expect(result).toContainText("Nargiza Asadova");
  await expect(result).toContainText("UPS");
  await expect(result).toContainText("UPS-9921");
  await expect(result).toContainText("Delivered");
});
