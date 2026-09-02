const { test, expect } = require("@playwright/test");

async function setupCrmPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>CRM | Odoo</title></head>
      <body>
        <h1>CRM Leads and Opportunities</h1>
        <form id="opportunityForm">
          <label for="leadName">Opportunity name *</label>
          <input id="leadName" name="leadName" type="text" value="${options.leadName || ""}" required />
          <label for="contact">Contact</label>
          <input id="contact" name="contact" type="text" value="${options.contact || ""}" />
          <label for="stage">Stage *</label>
          <select id="stage" name="stage" required>
            <option value="">Select a stage</option>
            <option value="new" ${options.stage === "new" ? "selected" : ""}>New</option>
            <option value="qualified" ${options.stage === "qualified" ? "selected" : ""}>Qualified</option>
            <option value="won" ${options.stage === "won" ? "selected" : ""}>Won</option>
          </select>
          <label for="revenue">Expected revenue</label>
          <input id="revenue" name="revenue" type="number" min="0" value="${options.revenue || ""}" />
          <button type="submit">Save opportunity</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("opportunityForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["leadName", "contact", "stage", "revenue"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            document.getElementById("result").textContent = "Opportunity saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    leadNameField: page.locator("#leadName"),
    contactField: page.locator("#contact"),
    stageField: page.locator("#stage"),
    revenueField: page.locator("#revenue"),
    submitButton: page.getByRole("button", { name: /save opportunity/i }),
    result: page.locator("#result"),
  };
}

test("loads the CRM opportunity form", async ({ page }) => {
  const {
    leadNameField,
    contactField,
    stageField,
    revenueField,
    submitButton,
  } = await setupCrmPage(page);

  await expect(page).toHaveTitle(/CRM/i);
  await expect(leadNameField).toBeVisible();
  await expect(contactField).toBeVisible();
  await expect(stageField).toBeVisible();
  await expect(revenueField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a CRM opportunity", async ({ page }) => {
  const {
    leadNameField,
    contactField,
    stageField,
    revenueField,
    submitButton,
    result,
  } = await setupCrmPage(page);

  await leadNameField.fill("Acme renewal");
  await contactField.fill("Jane Smith");
  await stageField.selectOption("qualified");
  await revenueField.fill("12500");
  await submitButton.click();

  await expect(result).toHaveText(
    "Opportunity saved: Acme renewal | Jane Smith | qualified | 12500",
  );
});

test("requires an opportunity name and stage", async ({ page }) => {
  const { leadNameField, stageField, submitButton } = await setupCrmPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      leadNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      stageField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects negative expected revenue", async ({ page }) => {
  const { leadNameField, stageField, revenueField, submitButton } =
    await setupCrmPage(page, {
      leadName: "Acme renewal",
      stage: "new",
      revenue: "-1",
    });

  await leadNameField.fill("Acme renewal");
  await stageField.selectOption("new");
  await submitButton.click();

  await expect
    .poll(async () =>
      revenueField.evaluate((element) => element.validity.rangeUnderflow),
    )
    .toBeTruthy();
});

test("moves an opportunity to a new pipeline stage", async ({ page }) => {
  const { leadNameField, stageField, revenueField, submitButton, result } =
    await setupCrmPage(page, {
      leadName: "Acme renewal",
      contact: "Jane Smith",
      stage: "qualified",
      revenue: "12500",
    });

  await expect(stageField).toHaveValue("qualified");
  await stageField.selectOption("won");
  await submitButton.click();

  await expect(result).toContainText("Acme renewal");
  await expect(result).toContainText("won");
});
