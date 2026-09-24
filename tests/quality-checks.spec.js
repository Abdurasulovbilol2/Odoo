const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupQualityChecksPage(page, options = {}) {
  const safeOptions = {
    product: escapeHtml(options.product),
    inspectionType: escapeHtml(options.inspectionType),
    inspector: escapeHtml(options.inspector),
    result: escapeHtml(options.result),
    score: escapeHtml(options.score),
    checkedOn: escapeHtml(options.checkedOn),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Quality Checks | Odoo</title>
      </head>
      <body>
        <h1>Quality Checks</h1>
        <form id="qualityForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="inspectionType">Inspection type *</label>
          <select id="inspectionType" name="inspectionType" required>
            <option value="">Select inspection</option>
            <option value="Incoming" ${safeOptions.inspectionType === "Incoming" ? "selected" : ""}>Incoming</option>
            <option value="Outgoing" ${safeOptions.inspectionType === "Outgoing" ? "selected" : ""}>Outgoing</option>
            <option value="In-Process" ${safeOptions.inspectionType === "In-Process" ? "selected" : ""}>In-Process</option>
          </select>

          <label for="inspector">Inspector *</label>
          <input id="inspector" name="inspector" type="text" value="${safeOptions.inspector || ""}" required />

          <label for="inspectionResult">Inspection result *</label>
          <textarea id="inspectionResult" name="inspectionResult" required>${safeOptions.result || ""}</textarea>

          <label for="score">Score *</label>
          <input id="score" name="score" type="number" step="1" value="${safeOptions.score || ""}" required />

          <label for="checkedOn">Checked on *</label>
          <input id="checkedOn" name="checkedOn" type="date" value="${safeOptions.checkedOn || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Pass" ${safeOptions.status === "Pass" ? "selected" : ""}>Pass</option>
            <option value="Review" ${safeOptions.status === "Review" ? "selected" : ""}>Review</option>
            <option value="Fail" ${safeOptions.status === "Fail" ? "selected" : ""}>Fail</option>
          </select>

          <button type="submit">Save check</button>
        </form>
        <div id="statusResult" role="status"></div>

        <script>
          document.getElementById("qualityForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const product = document.getElementById("product").value.trim();
            const inspectionType = document.getElementById("inspectionType").value;
            const inspector = document.getElementById("inspector").value.trim();
            const result = document.getElementById("inspectionResult").value.trim();
            const score = Number(document.getElementById("score").value);
            const checkedOn = document.getElementById("checkedOn").value;
            const status = document.getElementById("status").value;
            const display = document.getElementById("statusResult");

            if (score < 0 || score > 100) {
              display.textContent = "Score must be between 0 and 100";
              return;
            }

            if (status === "Fail" && score >= 80) {
              display.textContent = "Failed inspections cannot receive a score of 80 or higher";
              return;
            }

            display.textContent = "Check saved: " + [product, inspectionType, inspector, result, score, checkedOn, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    inspectionTypeField: page.locator("#inspectionType"),
    inspectorField: page.locator("#inspector"),
    resultField: page.locator("#inspectionResult"),
    scoreField: page.locator("#score"),
    checkedOnField: page.locator("#checkedOn"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save check/i }),
    result: page.locator("#statusResult"),
  };
}

test("loads the quality checks form", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    inspectorField,
    resultField,
    scoreField,
    checkedOnField,
    statusField,
    submitButton,
  } = await setupQualityChecksPage(page);

  await expect(page).toHaveTitle(/Quality Checks/i);
  await expect(productField).toBeVisible();
  await expect(inspectionTypeField).toBeVisible();
  await expect(inspectorField).toBeVisible();
  await expect(resultField).toBeVisible();
  await expect(scoreField).toBeVisible();
  await expect(checkedOnField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid quality check", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    inspectorField,
    resultField,
    scoreField,
    checkedOnField,
    statusField,
    submitButton,
    result,
  } = await setupQualityChecksPage(page);

  await productField.fill("Copper Pipe");
  await inspectionTypeField.selectOption("Incoming");
  await inspectorField.fill("A. Khan");
  await resultField.fill(
    "Surface finish passed inspection and no defects found.",
  );
  await scoreField.fill("94");
  await checkedOnField.fill("2026-09-24");
  await statusField.selectOption("Pass");
  await submitButton.click();

  await expect(result).toHaveText(
    "Check saved: Copper Pipe | Incoming | A. Khan | Surface finish passed inspection and no defects found. | 94 | 2026-09-24 | Pass",
  );
});

test("requires all quality fields before saving", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    inspectorField,
    resultField,
    scoreField,
    checkedOnField,
    statusField,
    submitButton,
  } = await setupQualityChecksPage(page);

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
      inspectorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      resultField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      scoreField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      checkedOnField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects invalid score ranges", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    inspectorField,
    resultField,
    scoreField,
    checkedOnField,
    statusField,
    submitButton,
    result,
  } = await setupQualityChecksPage(page);

  await productField.fill("Steel Rod");
  await inspectionTypeField.selectOption("Outgoing");
  await inspectorField.fill("L. Scott");
  await resultField.fill(
    "Visible crack on the surface was found during review.",
  );
  await scoreField.fill("150");
  await checkedOnField.fill("2026-09-25");
  await statusField.selectOption("Fail");
  await submitButton.click();

  await expect(result).toHaveText("Score must be between 0 and 100");
});

test("keeps a pre-filled quality check", async ({ page }) => {
  const {
    productField,
    inspectionTypeField,
    inspectorField,
    resultField,
    scoreField,
    checkedOnField,
    statusField,
    submitButton,
    result,
  } = await setupQualityChecksPage(page, {
    product: 'Sealing Tape "Heavy"',
    inspectionType: "In-Process",
    inspector: "N. Diaz",
    result: "Packaging seal strength is within tolerance.",
    score: "88",
    checkedOn: "2026-09-26",
    status: "Review",
  });

  await expect(productField).toHaveValue('Sealing Tape "Heavy"');
  await expect(inspectionTypeField).toHaveValue("In-Process");
  await expect(inspectorField).toHaveValue("N. Diaz");
  await expect(resultField).toHaveValue(
    "Packaging seal strength is within tolerance.",
  );
  await expect(scoreField).toHaveValue("88");
  await expect(checkedOnField).toHaveValue("2026-09-26");
  await expect(statusField).toHaveValue("Review");

  await submitButton.click();

  await expect(result).toContainText('Sealing Tape "Heavy"');
  await expect(result).toContainText("88");
});
