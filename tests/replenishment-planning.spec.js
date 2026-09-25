const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupReplenishmentPlanningPage(page, options = {}) {
  const safeOptions = {
    planName: escapeHtml(options.planName),
    warehouse: escapeHtml(options.warehouse),
    product: escapeHtml(options.product),
    targetStock: escapeHtml(options.targetStock),
    reorderPoint: escapeHtml(options.reorderPoint),
    leadTimeDays: escapeHtml(options.leadTimeDays),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Replenishment Planning | Odoo</title>
      </head>
      <body>
        <h1>Replenishment Planning</h1>
        <form id="replenishmentForm">
          <label for="planName">Plan name *</label>
          <input id="planName" name="planName" type="text" value="${safeOptions.planName || ""}" required />

          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="targetStock">Target stock *</label>
          <input id="targetStock" name="targetStock" type="number" step="1" value="${safeOptions.targetStock || ""}" required />

          <label for="reorderPoint">Reorder point *</label>
          <input id="reorderPoint" name="reorderPoint" type="number" step="1" value="${safeOptions.reorderPoint || ""}" required />

          <label for="leadTimeDays">Lead time (days) *</label>
          <input id="leadTimeDays" name="leadTimeDays" type="number" step="1" value="${safeOptions.leadTimeDays || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Active" ${safeOptions.status === "Active" ? "selected" : ""}>Active</option>
            <option value="On hold" ${safeOptions.status === "On hold" ? "selected" : ""}>On hold</option>
            <option value="Completed" ${safeOptions.status === "Completed" ? "selected" : ""}>Completed</option>
          </select>

          <button type="submit">Save replenishment plan</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("replenishmentForm").addEventListener("submit", (event) => {
            event.preventDefault();

            const planName = document.getElementById("planName").value.trim();
            const warehouse = document.getElementById("warehouse").value.trim();
            const product = document.getElementById("product").value.trim();
            const targetStock = Number(document.getElementById("targetStock").value);
            const reorderPoint = Number(document.getElementById("reorderPoint").value);
            const leadTimeDays = Number(document.getElementById("leadTimeDays").value);
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (targetStock < 0 || reorderPoint < 0 || leadTimeDays <= 0) {
              result.textContent = "Target stock, reorder point, and lead time must be valid";
              return;
            }

            if (reorderPoint > targetStock) {
              result.textContent = "Reorder point cannot exceed target stock";
              return;
            }

            result.textContent = "Replenishment plan saved: " + [planName, warehouse, product, targetStock, reorderPoint, leadTimeDays, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    planNameField: page.locator("#planName"),
    warehouseField: page.locator("#warehouse"),
    productField: page.locator("#product"),
    targetStockField: page.locator("#targetStock"),
    reorderPointField: page.locator("#reorderPoint"),
    leadTimeDaysField: page.locator("#leadTimeDays"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", {
      name: /save replenishment plan/i,
    }),
    result: page.locator("#result"),
  };
}

test("loads the replenishment planning form", async ({ page }) => {
  const {
    planNameField,
    warehouseField,
    productField,
    targetStockField,
    reorderPointField,
    leadTimeDaysField,
    statusField,
    submitButton,
  } = await setupReplenishmentPlanningPage(page);

  await expect(page).toHaveTitle(/Replenishment Planning/i);
  await expect(planNameField).toBeVisible();
  await expect(warehouseField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(targetStockField).toBeVisible();
  await expect(reorderPointField).toBeVisible();
  await expect(leadTimeDaysField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid replenishment plan", async ({ page }) => {
  const {
    planNameField,
    warehouseField,
    productField,
    targetStockField,
    reorderPointField,
    leadTimeDaysField,
    statusField,
    submitButton,
    result,
  } = await setupReplenishmentPlanningPage(page);

  await planNameField.fill("Staples Backup");
  await warehouseField.fill("North Hub");
  await productField.fill("Packaging Tape");
  await targetStockField.fill("240");
  await reorderPointField.fill("80");
  await leadTimeDaysField.fill("7");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Replenishment plan saved: Staples Backup | North Hub | Packaging Tape | 240 | 80 | 7 | Active",
  );
});

test("requires all replenishment plan fields before saving", async ({
  page,
}) => {
  const {
    planNameField,
    warehouseField,
    productField,
    targetStockField,
    reorderPointField,
    leadTimeDaysField,
    statusField,
    submitButton,
  } = await setupReplenishmentPlanningPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      planNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      warehouseField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      targetStockField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      reorderPointField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      leadTimeDaysField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects invalid stock values and lead time", async ({ page }) => {
  const {
    planNameField,
    warehouseField,
    productField,
    targetStockField,
    reorderPointField,
    leadTimeDaysField,
    statusField,
    submitButton,
    result,
  } = await setupReplenishmentPlanningPage(page);

  await planNameField.fill("Critical Panel");
  await warehouseField.fill("South Hub");
  await productField.fill("Battery Pack");
  await targetStockField.fill("30");
  await reorderPointField.fill("80");
  await leadTimeDaysField.fill("0");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText(
    "Target stock, reorder point, and lead time must be valid",
  );
});

test("prevents reorder point from exceeding target stock", async ({ page }) => {
  const {
    planNameField,
    warehouseField,
    productField,
    targetStockField,
    reorderPointField,
    leadTimeDaysField,
    statusField,
    submitButton,
    result,
  } = await setupReplenishmentPlanningPage(page);

  await planNameField.fill("Fast Moving");
  await warehouseField.fill("West Hub");
  await productField.fill("Office Chair");
  await targetStockField.fill("100");
  await reorderPointField.fill("140");
  await leadTimeDaysField.fill("4");
  await statusField.selectOption("On hold");
  await submitButton.click();

  await expect(result).toHaveText("Reorder point cannot exceed target stock");
});
