const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupWarehouseOperationsPage(page, options = {}) {
  const safeOptions = {
    orderReference: escapeHtml(options.orderReference),
    warehouse: escapeHtml(options.warehouse),
    operationType: escapeHtml(options.operationType),
    itemCount: escapeHtml(options.itemCount),
    scheduledTime: escapeHtml(options.scheduledTime),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Warehouse Operations | Odoo</title>
      </head>
      <body>
        <h1>Warehouse Operations</h1>
        <form id="warehouseOperationForm">
          <label for="orderReference">Operation reference *</label>
          <input id="orderReference" name="orderReference" type="text" value="${safeOptions.orderReference || ""}" required />

          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="operationType">Operation type *</label>
          <select id="operationType" name="operationType" required>
            <option value="">Select type</option>
            <option value="Picking" ${safeOptions.operationType === "Picking" ? "selected" : ""}>Picking</option>
            <option value="Putaway" ${safeOptions.operationType === "Putaway" ? "selected" : ""}>Putaway</option>
            <option value="Packing" ${safeOptions.operationType === "Packing" ? "selected" : ""}>Packing</option>
            <option value="Replenishment" ${safeOptions.operationType === "Replenishment" ? "selected" : ""}>Replenishment</option>
          </select>

          <label for="itemCount">Item count *</label>
          <input id="itemCount" name="itemCount" type="number" step="1" value="${safeOptions.itemCount || ""}" required />

          <label for="scheduledTime">Scheduled time *</label>
          <input id="scheduledTime" name="scheduledTime" type="datetime-local" value="${safeOptions.scheduledTime || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Ready" ${safeOptions.status === "Ready" ? "selected" : ""}>Ready</option>
            <option value="In progress" ${safeOptions.status === "In progress" ? "selected" : ""}>In progress</option>
            <option value="Completed" ${safeOptions.status === "Completed" ? "selected" : ""}>Completed</option>
          </select>

          <button type="submit">Schedule operation</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("warehouseOperationForm").addEventListener("submit", (event) => {
            event.preventDefault();

            const orderReference = document.getElementById("orderReference").value.trim();
            const warehouse = document.getElementById("warehouse").value.trim();
            const operationType = document.getElementById("operationType").value;
            const itemCount = Number(document.getElementById("itemCount").value);
            const scheduledTime = document.getElementById("scheduledTime").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (itemCount <= 0) {
              result.textContent = "Item count must be greater than zero";
              return;
            }

            if (operationType === "Putaway" && itemCount > 500) {
              result.textContent = "Putaway operations cannot exceed 500 items";
              return;
            }

            result.textContent = "Operation scheduled: " + [orderReference, warehouse, operationType, itemCount, scheduledTime, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    orderReferenceField: page.locator("#orderReference"),
    warehouseField: page.locator("#warehouse"),
    operationTypeField: page.locator("#operationType"),
    itemCountField: page.locator("#itemCount"),
    scheduledTimeField: page.locator("#scheduledTime"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /schedule operation/i }),
    result: page.locator("#result"),
  };
}

test("loads the warehouse operations form", async ({ page }) => {
  const {
    orderReferenceField,
    warehouseField,
    operationTypeField,
    itemCountField,
    scheduledTimeField,
    statusField,
    submitButton,
  } = await setupWarehouseOperationsPage(page);

  await expect(page).toHaveTitle(/Warehouse Operations/i);
  await expect(orderReferenceField).toBeVisible();
  await expect(warehouseField).toBeVisible();
  await expect(operationTypeField).toBeVisible();
  await expect(itemCountField).toBeVisible();
  await expect(scheduledTimeField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("schedules a valid warehouse operation", async ({ page }) => {
  const {
    orderReferenceField,
    warehouseField,
    operationTypeField,
    itemCountField,
    scheduledTimeField,
    statusField,
    submitButton,
    result,
  } = await setupWarehouseOperationsPage(page);

  await orderReferenceField.fill("WH-1024");
  await warehouseField.fill("Central Hub");
  await operationTypeField.selectOption("Picking");
  await itemCountField.fill("36");
  await scheduledTimeField.fill("2026-09-25T09:30");
  await statusField.selectOption("Ready");
  await submitButton.click();

  await expect(result).toHaveText(
    "Operation scheduled: WH-1024 | Central Hub | Picking | 36 | 2026-09-25T09:30 | Ready",
  );
});

test("requires all warehouse details before scheduling", async ({ page }) => {
  const {
    orderReferenceField,
    warehouseField,
    operationTypeField,
    itemCountField,
    scheduledTimeField,
    statusField,
    submitButton,
  } = await setupWarehouseOperationsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      orderReferenceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      warehouseField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      operationTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      itemCountField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      scheduledTimeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative item counts", async ({ page }) => {
  const {
    orderReferenceField,
    warehouseField,
    operationTypeField,
    itemCountField,
    scheduledTimeField,
    statusField,
    submitButton,
    result,
  } = await setupWarehouseOperationsPage(page);

  await orderReferenceField.fill("WH-2200");
  await warehouseField.fill("Overflow Zone");
  await operationTypeField.selectOption("Replenishment");
  await itemCountField.fill("0");
  await scheduledTimeField.fill("2026-09-27T11:00");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Item count must be greater than zero");
});

test("blocks oversized putaway operations", async ({ page }) => {
  const {
    orderReferenceField,
    warehouseField,
    operationTypeField,
    itemCountField,
    scheduledTimeField,
    statusField,
    submitButton,
    result,
  } = await setupWarehouseOperationsPage(page);

  await orderReferenceField.fill("WH-4410");
  await warehouseField.fill("Cold Storage");
  await operationTypeField.selectOption("Putaway");
  await itemCountField.fill("780");
  await scheduledTimeField.fill("2026-09-30T15:15");
  await statusField.selectOption("In progress");
  await submitButton.click();

  await expect(result).toHaveText("Putaway operations cannot exceed 500 items");
});
