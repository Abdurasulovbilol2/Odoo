const { test, expect } = require("@playwright/test");

async function setupAssetsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Assets | Odoo</title>
      </head>
      <body>
        <h1>Assets</h1>
        <form id="assetForm">
          <label for="assetName">Asset name *</label>
          <input id="assetName" name="assetName" type="text" value="${options.assetName || ""}" required />

          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="">Select category</option>
            <option value="Hardware" ${options.category === "Hardware" ? "selected" : ""}>Hardware</option>
            <option value="Office furniture" ${options.category === "Office furniture" ? "selected" : ""}>Office furniture</option>
            <option value="Vehicle" ${options.category === "Vehicle" ? "selected" : ""}>Vehicle</option>
          </select>

          <label for="purchaseDate">Purchase date *</label>
          <input id="purchaseDate" name="purchaseDate" type="date" value="${options.purchaseDate || ""}" required />

          <label for="value">Asset value *</label>
          <input id="value" name="value" type="number" min="0.01" step="0.01" value="${options.value || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Running" ${options.status === "Running" ? "selected" : ""}>Running</option>
            <option value="Disposed" ${options.status === "Disposed" ? "selected" : ""}>Disposed</option>
          </select>

          <button type="submit">Save asset</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("assetForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("assetName").value,
              document.getElementById("category").value,
              document.getElementById("purchaseDate").value,
              document.getElementById("value").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Asset saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    assetNameField: page.locator("#assetName"),
    categoryField: page.locator("#category"),
    purchaseDateField: page.locator("#purchaseDate"),
    valueField: page.locator("#value"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save asset/i }),
    result: page.locator("#result"),
  };
}

test("loads the assets form", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    valueField,
    statusField,
    submitButton,
  } = await setupAssetsPage(page);

  await expect(page).toHaveTitle(/Assets/i);
  await expect(assetNameField).toBeVisible();
  await expect(categoryField).toBeVisible();
  await expect(purchaseDateField).toBeVisible();
  await expect(valueField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a running hardware asset", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    valueField,
    statusField,
    submitButton,
    result,
  } = await setupAssetsPage(page);

  await assetNameField.fill("Dell workstation");
  await categoryField.selectOption("Hardware");
  await purchaseDateField.fill("2026-09-11");
  await valueField.fill("2400.00");
  await statusField.selectOption("Running");
  await submitButton.click();

  await expect(result).toHaveText(
    "Asset saved: Dell workstation | Hardware | 2026-09-11 | 2400.00 | Running",
  );
});

test("requires asset details before saving", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    valueField,
    statusField,
    submitButton,
  } = await setupAssetsPage(page);

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
      valueField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero asset value", async ({ page }) => {
  const { valueField } = await setupAssetsPage(page);

  await valueField.fill("0");
  await expect(valueField).toHaveJSProperty("validity.valid", false);
  await expect(valueField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a pre-filled disposed asset", async ({ page }) => {
  const {
    assetNameField,
    categoryField,
    purchaseDateField,
    valueField,
    statusField,
    submitButton,
    result,
  } = await setupAssetsPage(page, {
    assetName: "Old conference table",
    category: "Office furniture",
    purchaseDate: "2024-02-01",
    value: "1200.00",
    status: "Disposed",
  });

  await expect(assetNameField).toHaveValue("Old conference table");
  await expect(categoryField).toHaveValue("Office furniture");
  await expect(purchaseDateField).toHaveValue("2024-02-01");
  await expect(valueField).toHaveValue("1200.00");
  await expect(statusField).toHaveValue("Disposed");
  await submitButton.click();

  await expect(result).toContainText("Old conference table");
  await expect(result).toContainText("Office furniture");
  await expect(result).toContainText("Disposed");
});
