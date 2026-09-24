const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupInventoryReconciliationPage(page, options = {}) {
  const safeOptions = {
    product: escapeHtml(options.product),
    warehouse: escapeHtml(options.warehouse),
    systemQty: escapeHtml(options.systemQty),
    physicalQty: escapeHtml(options.physicalQty),
    variance: escapeHtml(options.variance),
    adjustedBy: escapeHtml(options.adjustedBy),
    date: escapeHtml(options.date),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Inventory Reconciliation | Odoo</title>
      </head>
      <body>
        <h1>Inventory Reconciliation</h1>
        <form id="reconciliationForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="systemQty">System quantity *</label>
          <input id="systemQty" name="systemQty" type="number" step="0.01" value="${safeOptions.systemQty || ""}" required />

          <label for="physicalQty">Physical quantity *</label>
          <input id="physicalQty" name="physicalQty" type="number" step="0.01" value="${safeOptions.physicalQty || ""}" required />

          <label for="variance">Variance *</label>
          <input id="variance" name="variance" type="number" step="0.01" value="${safeOptions.variance || ""}" required />

          <label for="adjustedBy">Adjusted by *</label>
          <input id="adjustedBy" name="adjustedBy" type="text" value="${safeOptions.adjustedBy || ""}" required />

          <label for="date">Adjustment date *</label>
          <input id="date" name="date" type="date" value="${safeOptions.date || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Approved" ${safeOptions.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Flagged" ${safeOptions.status === "Flagged" ? "selected" : ""}>Flagged</option>
          </select>

          <button type="submit">Submit reconciliation</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("reconciliationForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const product = document.getElementById("product").value.trim();
            const warehouse = document.getElementById("warehouse").value.trim();
            const systemQty = Number(document.getElementById("systemQty").value);
            const physicalQty = Number(document.getElementById("physicalQty").value);
            const variance = Number(document.getElementById("variance").value);
            const adjustedBy = document.getElementById("adjustedBy").value.trim();
            const date = document.getElementById("date").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (systemQty < 0 || physicalQty < 0) {
              result.textContent = "Quantity values cannot be negative";
              return;
            }

            if (Math.abs(variance) < 0.01) {
              result.textContent = "Variance must reflect the difference between system and physical counts";
              return;
            }

            if (status === "Flagged" && Math.abs(variance) < 5) {
              result.textContent = "Flagged reconciliations require at least a 5-unit variance";
              return;
            }

            result.textContent = "Reconciliation submitted: " + [product, warehouse, systemQty.toFixed(2), physicalQty.toFixed(2), variance.toFixed(2), adjustedBy, date, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    warehouseField: page.locator("#warehouse"),
    systemQtyField: page.locator("#systemQty"),
    physicalQtyField: page.locator("#physicalQty"),
    varianceField: page.locator("#variance"),
    adjustedByField: page.locator("#adjustedBy"),
    dateField: page.locator("#date"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /submit reconciliation/i }),
    result: page.locator("#result"),
  };
}

test("loads the inventory reconciliation form", async ({ page }) => {
  const {
    productField,
    warehouseField,
    systemQtyField,
    physicalQtyField,
    varianceField,
    adjustedByField,
    dateField,
    statusField,
    submitButton,
  } = await setupInventoryReconciliationPage(page);

  await expect(page).toHaveTitle(/Inventory Reconciliation/i);
  await expect(productField).toBeVisible();
  await expect(warehouseField).toBeVisible();
  await expect(systemQtyField).toBeVisible();
  await expect(physicalQtyField).toBeVisible();
  await expect(varianceField).toBeVisible();
  await expect(adjustedByField).toBeVisible();
  await expect(dateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("submits a valid reconciliation", async ({ page }) => {
  const {
    productField,
    warehouseField,
    systemQtyField,
    physicalQtyField,
    varianceField,
    adjustedByField,
    dateField,
    statusField,
    submitButton,
    result,
  } = await setupInventoryReconciliationPage(page);

  await productField.fill("USB Hub");
  await warehouseField.fill("Main Warehouse");
  await systemQtyField.fill("40");
  await physicalQtyField.fill("37");
  await varianceField.fill("-3");
  await adjustedByField.fill("R. Shah");
  await dateField.fill("2026-09-28");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Reconciliation submitted: USB Hub | Main Warehouse | 40.00 | 37.00 | -3.00 | R. Shah | 2026-09-28 | Approved",
  );
});

test("requires all reconciliation fields before submission", async ({
  page,
}) => {
  const {
    productField,
    warehouseField,
    systemQtyField,
    physicalQtyField,
    varianceField,
    adjustedByField,
    dateField,
    statusField,
    submitButton,
  } = await setupInventoryReconciliationPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      warehouseField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      systemQtyField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      physicalQtyField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      varianceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      adjustedByField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      dateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects negative quantity values", async ({ page }) => {
  const {
    productField,
    warehouseField,
    systemQtyField,
    physicalQtyField,
    varianceField,
    adjustedByField,
    dateField,
    statusField,
    submitButton,
    result,
  } = await setupInventoryReconciliationPage(page);

  await productField.fill("Keyboard");
  await warehouseField.fill("North Bay");
  await systemQtyField.fill("-1");
  await physicalQtyField.fill("5");
  await varianceField.fill("6");
  await adjustedByField.fill("H. White");
  await dateField.fill("2026-09-29");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Quantity values cannot be negative");
});

test("keeps a pre-filled reconciliation", async ({ page }) => {
  const {
    productField,
    warehouseField,
    systemQtyField,
    physicalQtyField,
    varianceField,
    adjustedByField,
    dateField,
    statusField,
    submitButton,
    result,
  } = await setupInventoryReconciliationPage(page, {
    product: 'Monitor "4K"',
    warehouse: "Distribution Center",
    systemQty: "80",
    physicalQty: "88",
    variance: "8",
    adjustedBy: "T. Brooks",
    date: "2026-09-30",
    status: "Approved",
  });

  await expect(productField).toHaveValue('Monitor "4K"');
  await expect(warehouseField).toHaveValue("Distribution Center");
  await expect(systemQtyField).toHaveValue("80");
  await expect(physicalQtyField).toHaveValue("88");
  await expect(varianceField).toHaveValue("8");
  await expect(adjustedByField).toHaveValue("T. Brooks");
  await expect(dateField).toHaveValue("2026-09-30");
  await expect(statusField).toHaveValue("Approved");

  await submitButton.click();

  await expect(result).toContainText('Monitor "4K"');
  await expect(result).toContainText("88.00");
});
