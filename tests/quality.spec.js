const { test, expect } = require("@playwright/test");

async function setupQualityPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Quality Control | Odoo</title>
      </head>
      <body>
        <h1>Quality Control</h1>
        <form id="qualityForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${options.product || ""}" required />

          <label for="inspectionType">Inspection type *</label>
          <select id="inspectionType" name="inspectionType" required>
            <option value="">Select type</option>
            <option value="Incoming inspection" ${options.inspectionType === "Incoming inspection" ? "selected" : ""}>Incoming inspection</option>
            <option value="In-process inspection" ${options.inspectionType === "In-process inspection" ? "selected" : ""}>In-process inspection</option>
            <option value="Final inspection" ${options.inspectionType === "Final inspection" ? "selected" : ""}>Final inspection</option>
          </select>

          <label for="quantity">Quantity inspected *</label>
          <input id="quantity" name="quantity" type="number" min="1" step="1" value="${options.quantity || ""}" required />

          <label for="inspector">Inspector *</label>
          <input id="inspector" name="inspector" type="text" value="${options.inspector || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Pending" ${options.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Passed" ${options.status === "Passed" ? "selected" : ""}>Passed</option>
            <option value="Failed" ${options.status === "Failed" ? "selected" : ""}>Failed</option>
          </select>

          <button type="submit">Save inspection</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("qualityForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("product").value,
              document.getElementById("inspectionType").value,
              document.getElementById("quantity").value,
              document.getElementById("inspector").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Inspection saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    inspectionTypeField: page.locator("#inspectionType"),
    quantityField: page.locator("#quantity"),
    inspectorField: page.locator("#inspector"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save inspection/i }),
    result: page.locator("#result"),
  };
}

test("loads the quality control form", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    quantityField,
    inspectorField,
    statusField,
    submitButton,
  } = await setupQualityPage(page);

  await expect(page).toHaveTitle(/Quality Control/i);
  await expect(productField).toBeVisible();
  await expect(inspectionTypeField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(inspectorField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a passed incoming inspection", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    quantityField,
    inspectorField,
    statusField,
    submitButton,
    result,
  } = await setupQualityPage(page);

  await productField.fill("Steel mounting bracket");
  await inspectionTypeField.selectOption("Incoming inspection");
  await quantityField.fill("240");
  await inspectorField.fill("Quality Team");
  await statusField.selectOption("Passed");
  await submitButton.click();

  await expect(result).toHaveText(
    "Inspection saved: Steel mounting bracket | Incoming inspection | 240 | Quality Team | Passed",
  );
});

test("requires inspection details before saving", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    quantityField,
    inspectorField,
    statusField,
    submitButton,
  } = await setupQualityPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      inspectionTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      inspectorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects an inspection quantity below one", async ({ page }) => {
  const { quantityField } = await setupQualityPage(page);

  await quantityField.fill("0");
  await expect(quantityField).toHaveJSProperty("validity.valid", false);
  await expect(quantityField).toHaveJSProperty("validity.rangeUnderflow", true);
});

test("keeps a failed final inspection", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    quantityField,
    inspectorField,
    statusField,
    submitButton,
    result,
  } = await setupQualityPage(page, {
    product: "Finished control panel",
    inspectionType: "Final inspection",
    quantity: "12",
    inspector: "Amina Karimova",
    status: "Failed",
  });

  await expect(productField).toHaveValue("Finished control panel");
  await expect(inspectionTypeField).toHaveValue("Final inspection");
  await expect(quantityField).toHaveValue("12");
  await expect(inspectorField).toHaveValue("Amina Karimova");
  await expect(statusField).toHaveValue("Failed");
  await submitButton.click();

  await expect(result).toContainText("Finished control panel");
  await expect(result).toContainText("12");
  await expect(result).toContainText("Failed");
});
