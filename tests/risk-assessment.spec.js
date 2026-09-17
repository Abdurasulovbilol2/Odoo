const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupRiskAssessmentPage(page, options = {}) {
  const safeOptions = {
    riskName: escapeHtml(options.riskName),
    owner: escapeHtml(options.owner),
    category: escapeHtml(options.category),
    score: escapeHtml(options.score),
    assessmentDate: escapeHtml(options.assessmentDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Risk Assessment | Odoo</title>
      </head>
      <body>
        <h1>Risk Assessment</h1>
        <form id="riskAssessmentForm">
          <label for="riskName">Risk name *</label>
          <input id="riskName" name="riskName" type="text" value="${safeOptions.riskName || ""}" required />

          <label for="owner">Risk owner *</label>
          <input id="owner" name="owner" type="text" value="${safeOptions.owner || ""}" required />

          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="">Select category</option>
            <option value="Financial" ${safeOptions.category === "Financial" ? "selected" : ""}>Financial</option>
            <option value="Operational" ${safeOptions.category === "Operational" ? "selected" : ""}>Operational</option>
            <option value="Compliance" ${safeOptions.category === "Compliance" ? "selected" : ""}>Compliance</option>
            <option value="Security" ${safeOptions.category === "Security" ? "selected" : ""}>Security</option>
          </select>

          <label for="score">Risk score *</label>
          <input id="score" name="score" type="number" step="1" value="${safeOptions.score || ""}" required />

          <label for="assessmentDate">Assessment date *</label>
          <input id="assessmentDate" name="assessmentDate" type="date" value="${safeOptions.assessmentDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Open" ${safeOptions.status === "Open" ? "selected" : ""}>Open</option>
            <option value="Monitoring" ${safeOptions.status === "Monitoring" ? "selected" : ""}>Monitoring</option>
            <option value="Mitigated" ${safeOptions.status === "Mitigated" ? "selected" : ""}>Mitigated</option>
            <option value="Closed" ${safeOptions.status === "Closed" ? "selected" : ""}>Closed</option>
          </select>

          <button type="submit">Save assessment</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("riskAssessmentForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const riskName = document.getElementById("riskName").value;
            const owner = document.getElementById("owner").value;
            const category = document.getElementById("category").value;
            const score = document.getElementById("score").value;
            const assessmentDate = document.getElementById("assessmentDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (Number(score) < 1 || Number(score) > 100) {
              result.textContent = "Risk score must be between 1 and 100";
              return;
            }

            result.textContent = "Assessment saved: " + [riskName, owner, category, score, assessmentDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    riskNameField: page.locator("#riskName"),
    ownerField: page.locator("#owner"),
    categoryField: page.locator("#category"),
    scoreField: page.locator("#score"),
    assessmentDateField: page.locator("#assessmentDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save assessment/i }),
    result: page.locator("#result"),
  };
}

test("loads the risk assessment form", async ({ page }) => {
  const {
    riskNameField,
    ownerField,
    categoryField,
    scoreField,
    assessmentDateField,
    statusField,
    submitButton,
  } = await setupRiskAssessmentPage(page);

  await expect(page).toHaveTitle(/Risk Assessment/i);
  await expect(riskNameField).toBeVisible();
  await expect(ownerField).toBeVisible();
  await expect(categoryField).toBeVisible();
  await expect(scoreField).toBeVisible();
  await expect(assessmentDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid risk assessment", async ({ page }) => {
  const {
    riskNameField,
    ownerField,
    categoryField,
    scoreField,
    assessmentDateField,
    statusField,
    submitButton,
    result,
  } = await setupRiskAssessmentPage(page);

  await riskNameField.fill("Supplier disruption");
  await ownerField.fill("Amina Sharipova");
  await categoryField.selectOption("Operational");
  await scoreField.fill("72");
  await assessmentDateField.fill("2026-09-18");
  await statusField.selectOption("Monitoring");
  await submitButton.click();

  await expect(result).toHaveText(
    "Assessment saved: Supplier disruption | Amina Sharipova | Operational | 72 | 2026-09-18 | Monitoring",
  );
});

test("requires assessment details before saving", async ({ page }) => {
  const {
    riskNameField,
    ownerField,
    categoryField,
    scoreField,
    assessmentDateField,
    statusField,
    submitButton,
  } = await setupRiskAssessmentPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      riskNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      ownerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      categoryField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      scoreField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      assessmentDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects risk scores outside the valid range", async ({ page }) => {
  const {
    riskNameField,
    ownerField,
    categoryField,
    scoreField,
    assessmentDateField,
    statusField,
    submitButton,
    result,
  } = await setupRiskAssessmentPage(page);

  await riskNameField.fill("Data exposure");
  await ownerField.fill("Farrukh Ismailov");
  await categoryField.selectOption("Security");
  await scoreField.fill("0");
  await assessmentDateField.fill("2026-09-20");
  await statusField.selectOption("Open");
  await submitButton.click();

  await expect(result).toHaveText("Risk score must be between 1 and 100");
});

test("keeps a pre-filled risk assessment", async ({ page }) => {
  const {
    riskNameField,
    ownerField,
    categoryField,
    scoreField,
    assessmentDateField,
    statusField,
    submitButton,
    result,
  } = await setupRiskAssessmentPage(page, {
    riskName: "Regulatory change",
    owner: "Yulduz Turaeva",
    category: "Compliance",
    score: "91",
    assessmentDate: "2026-09-21",
    status: "Mitigated",
  });

  await expect(riskNameField).toHaveValue("Regulatory change");
  await expect(ownerField).toHaveValue("Yulduz Turaeva");
  await expect(categoryField).toHaveValue("Compliance");
  await expect(scoreField).toHaveValue("91");
  await expect(assessmentDateField).toHaveValue("2026-09-21");
  await expect(statusField).toHaveValue("Mitigated");
  await submitButton.click();

  await expect(result).toContainText("Regulatory change");
  await expect(result).toContainText("Yulduz Turaeva");
  await expect(result).toContainText("Mitigated");
});
