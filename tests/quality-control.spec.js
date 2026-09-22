const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupQualityControlPage(page, options = {}) {
  const safeOptions = {
    inspectionName: escapeHtml(options.inspectionName),
    product: escapeHtml(options.product),
    lotNumber: escapeHtml(options.lotNumber),
    qualityScore: escapeHtml(options.qualityScore),
    result: escapeHtml(options.result),
    inspectedDate: escapeHtml(options.inspectedDate),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Quality Control | Odoo</title>
      </head>
      <body>
        <h1>Quality Control</h1>
        <form id="qualityForm">
          <label for="inspectionName">Inspection name *</label>
          <input id="inspectionName" name="inspectionName" type="text" value="${safeOptions.inspectionName || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="lotNumber">Lot number *</label>
          <input id="lotNumber" name="lotNumber" type="text" value="${safeOptions.lotNumber || ""}" required />

          <label for="qualityScore">Quality score *</label>
          <input id="qualityScore" name="qualityScore" type="number" step="1" value="${safeOptions.qualityScore || ""}" required />

          <label for="result">Result *</label>
          <select id="result" name="result" required>
            <option value="">Select result</option>
            <option value="Pass" ${safeOptions.result === "Pass" ? "selected" : ""}>Pass</option>
            <option value="Hold" ${safeOptions.result === "Hold" ? "selected" : ""}>Hold</option>
            <option value="Reject" ${safeOptions.result === "Reject" ? "selected" : ""}>Reject</option>
          </select>

          <label for="inspectedDate">Inspected date *</label>
          <input id="inspectedDate" name="inspectedDate" type="date" value="${safeOptions.inspectedDate || ""}" required />

          <button type="submit">Submit inspection</button>
        </form>
        <div id="resultText" role="status"></div>
        <script>
          document.getElementById("qualityForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const inspectionName = document.getElementById("inspectionName").value;
            const product = document.getElementById("product").value;
            const lotNumber = document.getElementById("lotNumber").value;
            const qualityScore = Number(document.getElementById("qualityScore").value);
            const result = document.getElementById("result").value;
            const inspectedDate = document.getElementById("inspectedDate").value;
            const resultText = document.getElementById("resultText");

            if (qualityScore < 0 || qualityScore > 100) {
              resultText.textContent = "Quality score must be between 0 and 100";
              return;
            }

            if ((result === "Pass" && qualityScore < 70) || (result === "Reject" && qualityScore >= 70)) {
              resultText.textContent = "Quality result does not match score range";
              return;
            }

            resultText.textContent = "Inspection submitted: " + [inspectionName, product, lotNumber, qualityScore, result, inspectedDate].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    inspectionNameField: page.locator("#inspectionName"),
    productField: page.locator("#product"),
    lotNumberField: page.locator("#lotNumber"),
    qualityScoreField: page.locator("#qualityScore"),
    resultField: page.locator("#result"),
    inspectedDateField: page.locator("#inspectedDate"),
    submitButton: page.getByRole("button", { name: /submit inspection/i }),
    result: page.locator("#resultText"),
  };
}

test("loads the quality control form", async ({ page }) => {
  const {
    inspectionNameField,
    productField,
    lotNumberField,
    qualityScoreField,
    resultField,
    inspectedDateField,
    submitButton,
  } = await setupQualityControlPage(page);

  await expect(page).toHaveTitle(/Quality Control/i);
  await expect(inspectionNameField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(lotNumberField).toBeVisible();
  await expect(qualityScoreField).toBeVisible();
  await expect(resultField).toBeVisible();
  await expect(inspectedDateField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("submits a valid quality inspection", async ({ page }) => {
  const {
    inspectionNameField,
    productField,
    lotNumberField,
    qualityScoreField,
    resultField,
    inspectedDateField,
    submitButton,
    result,
  } = await setupQualityControlPage(page);

  await inspectionNameField.fill("QC-2026-317");
  await productField.fill("Glass Bottle");
  await lotNumberField.fill("LOT-QC-4002");
  await qualityScoreField.fill("87");
  await resultField.selectOption("Pass");
  await inspectedDateField.fill("2026-09-22");
  await submitButton.click();

  await expect(result).toHaveText(
    "Inspection submitted: QC-2026-317 | Glass Bottle | LOT-QC-4002 | 87 | Pass | 2026-09-22",
  );
});

test("requires all quality control inputs before submission", async ({
  page,
}) => {
  const {
    inspectionNameField,
    productField,
    lotNumberField,
    qualityScoreField,
    resultField,
    inspectedDateField,
    submitButton,
  } = await setupQualityControlPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      inspectionNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      lotNumberField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      qualityScoreField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      resultField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      inspectedDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects quality scores outside the 0 to 100 range", async ({ page }) => {
  const {
    inspectionNameField,
    productField,
    lotNumberField,
    qualityScoreField,
    resultField,
    inspectedDateField,
    submitButton,
    result,
  } = await setupQualityControlPage(page);

  await inspectionNameField.fill("QC-2026-410");
  await productField.fill("Medical Syringe");
  await lotNumberField.fill("LOT-QC-4033");
  await qualityScoreField.fill("150");
  await resultField.selectOption("Pass");
  await inspectedDateField.fill("2026-09-24");
  await submitButton.click();

  await expect(result).toHaveText("Quality score must be between 0 and 100");
});

test("keeps a pre-filled inspection record", async ({ page }) => {
  const {
    inspectionNameField,
    productField,
    lotNumberField,
    qualityScoreField,
    resultField,
    inspectedDateField,
    submitButton,
    result,
  } = await setupQualityControlPage(page, {
    inspectionName: 'QC-2026-440 "Priority"',
    product: "Metal Bracket",
    lotNumber: "LOT-QC-4450",
    qualityScore: "72",
    result: "Hold",
    inspectedDate: "2026-09-18",
  });

  await expect(inspectionNameField).toHaveValue('QC-2026-440 "Priority"');
  await expect(productField).toHaveValue("Metal Bracket");
  await expect(lotNumberField).toHaveValue("LOT-QC-4450");
  await expect(qualityScoreField).toHaveValue("72");
  await expect(resultField).toHaveValue("Hold");
  await expect(inspectedDateField).toHaveValue("2026-09-18");
  await submitButton.click();

  await expect(result).toContainText('QC-2026-440 "Priority"');
  await expect(result).toContainText("Metal Bracket");
  await expect(result).toContainText("72");
});
