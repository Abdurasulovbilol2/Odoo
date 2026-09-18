const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupAssetDepreciationPage(page, options = {}) {
  const safeOptions = {
    assetName: escapeHtml(options.assetName),
    category: escapeHtml(options.category),
    purchaseDate: escapeHtml(options.purchaseDate),
    cost: escapeHtml(options.cost),
    salvageValue: escapeHtml(options.salvageValue),
    usefulLife: escapeHtml(options.usefulLife),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Asset Depreciation | Odoo</title>
      </head>
      <body>
        <h1>Asset Depreciation</h1>
        <form id="assetForm">
          <label for="assetName">Asset name *</label>
          <input id="assetName" name="assetName" type="text" value="${safeOptions.assetName || ""}" required />

          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="">Select category</option>
            <option value="Equipment" ${safeOptions.category === "Equipment" ? "selected" : ""}>Equipment</option>
            <option value="Vehicle" ${safeOptions.category === "Vehicle" ? "selected" : ""}>Vehicle</option>
            <option value="Furniture" ${safeOptions.category === "Furniture" ? "selected" : ""}>Furniture</option>
            <option value="Software" ${safeOptions.category === "Software" ? "selected" : ""}>Software</option>
          </select>

          <label for="purchaseDate">Purchase date *</label>
          <input id="purchaseDate" name="purchaseDate" type="date" value="${safeOptions.purchaseDate || ""}" required />

          <label for="cost">Cost *</label>
          <input id="cost" name="cost" type="number" step="0.01" value="${safeOptions.cost || ""}" required />

          <label for="salvageValue">Salvage value *</label>
          <input id="salvageValue" name="salvageValue" type="number" step="0.01" value="${safeOptions.salvageValue || ""}" required />

          <label for="usefulLife">Useful life (years) *</label>
          <input id="usefulLife" name="usefulLife" type="number" step="1" value="${safeOptions.usefulLife || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${safeOptions.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Running" ${safeOptions.status === "Running" ? "selected" : ""}>Running</option>
            <option value="Closed" ${safeOptions.status === "Closed" ? "selected" : ""}>Closed</option>
          </select>

          <button type="submit">Create depreciation plan</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("assetForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const assetName = document.getElementById("assetName").value;
            const category = document.getElementById("category").value;
            const purchaseDate = document.getElementById("purchaseDate").value;
            const cost = Number(document.getElementById("cost").value);
            const salvageValue = Number(document.getElementById("salvageValue").value);
            const usefulLife = Number(document.getElementById("usefulLife").value);
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (salvageValue >= cost) {
              result.textContent = "Salvage value must be less than asset cost";
              return;
            }

            if (usefulLife <= 0) {
              result.textContent = "Useful life must be greater than 0 years";
              return;
            }

            const annualDepreciation = ((cost - salvageValue) / usefulLife).toFixed(2);
            result.textContent = "Depreciation plan created: " + [assetName, category, purchaseDate, cost.toFixed(2), salvageValue.toFixed(2), usefulLife, status, annualDepreciation].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    assetNameField: page.locator("#assetName"),
    categoryField: page.locator("#category"),
    purchaseDateField: page.locator("#purchaseDate"),
    costField: page.locator("#cost"),
    salvageValueField: page.locator("#salvageValue"),
    usefulLifeField: page.locator("#usefulLife"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", {
      name: /create depreciation plan/i,
    }),
    result: page.locator("#result"),
  };
}

test("loads the asset depreciation form", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    costField,
    salvageValueField,
    usefulLifeField,
    statusField,
    submitButton,
  } = await setupAssetDepreciationPage(page);

  await expect(page).toHaveTitle(/Asset Depreciation/i);
  await expect(assetNameField).toBeVisible();
  await expect(categoryField).toBeVisible();
  await expect(purchaseDateField).toBeVisible();
  await expect(costField).toBeVisible();
  await expect(salvageValueField).toBeVisible();
  await expect(usefulLifeField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a valid depreciation plan", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    costField,
    salvageValueField,
    usefulLifeField,
    statusField,
    submitButton,
    result,
  } = await setupAssetDepreciationPage(page);

  await assetNameField.fill("Production Press");
  await categoryField.selectOption("Equipment");
  await purchaseDateField.fill("2026-09-18");
  await costField.fill("12000");
  await salvageValueField.fill("2000");
  await usefulLifeField.fill("5");
  await statusField.selectOption("Running");
  await submitButton.click();

  await expect(result).toHaveText(
    "Depreciation plan created: Production Press | Equipment | 2026-09-18 | 12000.00 | 2000.00 | 5 | Running | 2000.00",
  );
});

test("requires depreciation plan details before saving", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    costField,
    salvageValueField,
    usefulLifeField,
    statusField,
    submitButton,
  } = await setupAssetDepreciationPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      assetNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      categoryField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      purchaseDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      costField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      salvageValueField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      usefulLifeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects salvage value equal to or above cost", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    costField,
    salvageValueField,
    usefulLifeField,
    statusField,
    submitButton,
    result,
  } = await setupAssetDepreciationPage(page);

  await assetNameField.fill("Delivery Van");
  await categoryField.selectOption("Vehicle");
  await purchaseDateField.fill("2026-09-20");
  await costField.fill("30000");
  await salvageValueField.fill("30000");
  await usefulLifeField.fill("8");
  await statusField.selectOption("Draft");
  await submitButton.click();

  await expect(result).toHaveText("Salvage value must be less than asset cost");
});

test("keeps a pre-filled depreciation plan", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    costField,
    salvageValueField,
    usefulLifeField,
    statusField,
    submitButton,
    result,
  } = await setupAssetDepreciationPage(page, {
    assetName: 'Design Suite "Enterprise"',
    category: "Software",
    purchaseDate: "2026-09-21",
    cost: "15000",
    salvageValue: "1500",
    usefulLife: "3",
    status: "Running",
  });

  await expect(assetNameField).toHaveValue('Design Suite "Enterprise"');
  await expect(categoryField).toHaveValue("Software");
  await expect(purchaseDateField).toHaveValue("2026-09-21");
  await expect(costField).toHaveValue("15000");
  await expect(salvageValueField).toHaveValue("1500");
  await expect(usefulLifeField).toHaveValue("3");
  await expect(statusField).toHaveValue("Running");
  await submitButton.click();

  await expect(result).toContainText('Design Suite "Enterprise"');
  await expect(result).toContainText("Software");
  await expect(result).toContainText("4500.00");
});
