const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupShippingOperationsPage(page, options = {}) {
  const safeOptions = {
    orderId: escapeHtml(options.orderId),
    carrier: escapeHtml(options.carrier),
    destination: escapeHtml(options.destination),
    weight: escapeHtml(options.weight),
    eta: escapeHtml(options.eta),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Shipping Operations | Odoo</title>
      </head>
      <body>
        <h1>Shipping Operations</h1>
        <form id="shippingForm">
          <label for="orderId">Order ID *</label>
          <input id="orderId" name="orderId" type="text" value="${safeOptions.orderId || ""}" required />

          <label for="carrier">Carrier *</label>
          <select id="carrier" name="carrier" required>
            <option value="">Select carrier</option>
            <option value="DHL" ${safeOptions.carrier === "DHL" ? "selected" : ""}>DHL</option>
            <option value="FedEx" ${safeOptions.carrier === "FedEx" ? "selected" : ""}>FedEx</option>
            <option value="UPS" ${safeOptions.carrier === "UPS" ? "selected" : ""}>UPS</option>
          </select>

          <label for="destination">Destination *</label>
          <input id="destination" name="destination" type="text" value="${safeOptions.destination || ""}" required />

          <label for="weight">Weight (kg) *</label>
          <input id="weight" name="weight" type="number" step="0.01" value="${safeOptions.weight || ""}" required />

          <label for="eta">ETA *</label>
          <input id="eta" name="eta" type="date" value="${safeOptions.eta || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Ready" ${safeOptions.status === "Ready" ? "selected" : ""}>Ready</option>
            <option value="In Transit" ${safeOptions.status === "In Transit" ? "selected" : ""}>In Transit</option>
            <option value="Delivered" ${safeOptions.status === "Delivered" ? "selected" : ""}>Delivered</option>
          </select>

          <button type="submit">Create shipment</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("shippingForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const orderId = document.getElementById("orderId").value.trim();
            const carrier = document.getElementById("carrier").value;
            const destination = document.getElementById("destination").value.trim();
            const weight = Number(document.getElementById("weight").value);
            const eta = document.getElementById("eta").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (weight <= 0) {
              result.textContent = "Weight must be greater than zero";
              return;
            }

            if (status === "Delivered" && !eta) {
              result.textContent = "Delivered shipments must include an ETA";
              return;
            }

            result.textContent = "Shipment created: " + [orderId, carrier, destination, weight.toFixed(2), eta, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    orderIdField: page.locator("#orderId"),
    carrierField: page.locator("#carrier"),
    destinationField: page.locator("#destination"),
    weightField: page.locator("#weight"),
    etaField: page.locator("#eta"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /create shipment/i }),
    result: page.locator("#result"),
  };
}

test("loads the shipping operations form", async ({ page }) => {
  const {
    orderIdField,
    carrierField,
    destinationField,
    weightField,
    etaField,
    statusField,
    submitButton,
  } = await setupShippingOperationsPage(page);

  await expect(page).toHaveTitle(/Shipping Operations/i);
  await expect(orderIdField).toBeVisible();
  await expect(carrierField).toBeVisible();
  await expect(destinationField).toBeVisible();
  await expect(weightField).toBeVisible();
  await expect(etaField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a valid shipment", async ({ page }) => {
  const {
    orderIdField,
    carrierField,
    destinationField,
    weightField,
    etaField,
    statusField,
    submitButton,
    result,
  } = await setupShippingOperationsPage(page);

  await orderIdField.fill("SO-2451");
  await carrierField.selectOption("DHL");
  await destinationField.fill("Lisbon, Portugal");
  await weightField.fill("36");
  await etaField.fill("2026-09-30");
  await statusField.selectOption("Ready");
  await submitButton.click();

  await expect(result).toHaveText(
    "Shipment created: SO-2451 | DHL | Lisbon, Portugal | 36.00 | 2026-09-30 | Ready",
  );
});

test("requires all shipment details before saving", async ({ page }) => {
  const {
    orderIdField,
    carrierField,
    destinationField,
    weightField,
    etaField,
    statusField,
    submitButton,
  } = await setupShippingOperationsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      orderIdField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      carrierField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      destinationField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      weightField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      etaField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative shipping weight", async ({ page }) => {
  const {
    orderIdField,
    carrierField,
    destinationField,
    weightField,
    etaField,
    statusField,
    submitButton,
    result,
  } = await setupShippingOperationsPage(page);

  await orderIdField.fill("SO-3452");
  await carrierField.selectOption("UPS");
  await destinationField.fill("Berlin, Germany");
  await weightField.fill("0");
  await etaField.fill("2026-10-01");
  await statusField.selectOption("In Transit");
  await submitButton.click();

  await expect(result).toHaveText("Weight must be greater than zero");
});

test("keeps a pre-filled shipment", async ({ page }) => {
  const {
    orderIdField,
    carrierField,
    destinationField,
    weightField,
    etaField,
    statusField,
    submitButton,
    result,
  } = await setupShippingOperationsPage(page, {
    orderId: 'SO-9900 "VIP"',
    carrier: "FedEx",
    destination: "Tokyo, Japan",
    weight: "14.75",
    eta: "2026-10-05",
    status: "In Transit",
  });

  await expect(orderIdField).toHaveValue('SO-9900 "VIP"');
  await expect(carrierField).toHaveValue("FedEx");
  await expect(destinationField).toHaveValue("Tokyo, Japan");
  await expect(weightField).toHaveValue("14.75");
  await expect(etaField).toHaveValue("2026-10-05");
  await expect(statusField).toHaveValue("In Transit");

  await submitButton.click();

  await expect(result).toContainText('SO-9900 "VIP"');
  await expect(result).toContainText("Tokyo, Japan");
  await expect(result).toContainText("14.75");
});
