const { test, expect } = require("@playwright/test");

async function setupSurveysPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Surveys | Odoo</title>
      </head>
      <body>
        <h1>Surveys</h1>
        <form id="surveyForm">
          <label for="surveyTitle">Survey title *</label>
          <input id="surveyTitle" name="surveyTitle" type="text" value="${options.surveyTitle || ""}" required />

          <label for="audience">Audience *</label>
          <select id="audience" name="audience" required>
            <option value="">Select audience</option>
            <option value="Customers" ${options.audience === "Customers" ? "selected" : ""}>Customers</option>
            <option value="Employees" ${options.audience === "Employees" ? "selected" : ""}>Employees</option>
            <option value="Partners" ${options.audience === "Partners" ? "selected" : ""}>Partners</option>
          </select>

          <label for="question">Question *</label>
          <input id="question" name="question" type="text" value="${options.question || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Live" ${options.status === "Live" ? "selected" : ""}>Live</option>
            <option value="Closed" ${options.status === "Closed" ? "selected" : ""}>Closed</option>
          </select>

          <button type="submit">Publish survey</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("surveyForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("surveyTitle").value,
              document.getElementById("audience").value,
              document.getElementById("question").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Survey published: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    surveyTitleField: page.locator("#surveyTitle"),
    audienceField: page.locator("#audience"),
    questionField: page.locator("#question"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /publish survey/i }),
    result: page.locator("#result"),
  };
}

test("loads the surveys form", async ({ page }) => {
  const {
    surveyTitleField,
    audienceField,
    questionField,
    statusField,
    submitButton,
  } = await setupSurveysPage(page);

  await expect(page).toHaveTitle(/Surveys/i);
  await expect(surveyTitleField).toBeVisible();
  await expect(audienceField).toBeVisible();
  await expect(questionField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("publishes a live customer survey", async ({ page }) => {
  const {
    surveyTitleField,
    audienceField,
    questionField,
    statusField,
    submitButton,
    result,
  } = await setupSurveysPage(page);

  await surveyTitleField.fill("Customer satisfaction survey");
  await audienceField.selectOption("Customers");
  await questionField.fill(
    "How satisfied are you with our support experience?",
  );
  await statusField.selectOption("Live");
  await submitButton.click();

  await expect(result).toHaveText(
    "Survey published: Customer satisfaction survey | Customers | How satisfied are you with our support experience? | Live",
  );
});

test("requires survey title, audience, question, and status", async ({
  page,
}) => {
  const {
    surveyTitleField,
    audienceField,
    questionField,
    statusField,
    submitButton,
  } = await setupSurveysPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      surveyTitleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      audienceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      questionField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("keeps a pre-filled survey draft", async ({ page }) => {
  const {
    surveyTitleField,
    audienceField,
    questionField,
    statusField,
    submitButton,
    result,
  } = await setupSurveysPage(page, {
    surveyTitle: "Employee pulse check",
    audience: "Employees",
    question: "What is your biggest productivity blocker this month?",
    status: "Draft",
  });

  await expect(surveyTitleField).toHaveValue("Employee pulse check");
  await expect(audienceField).toHaveValue("Employees");
  await expect(questionField).toHaveValue(
    "What is your biggest productivity blocker this month?",
  );
  await expect(statusField).toHaveValue("Draft");
  await submitButton.click();

  await expect(result).toContainText("Employee pulse check");
  await expect(result).toContainText("Employees");
  await expect(result).toContainText("Draft");
});

test("publishes a closed partner survey", async ({ page }) => {
  const {
    surveyTitleField,
    audienceField,
    questionField,
    statusField,
    submitButton,
    result,
  } = await setupSurveysPage(page, {
    surveyTitle: "Partner satisfaction check",
    audience: "Partners",
    question: "How likely are you to renew your partnership?",
    status: "Closed",
  });

  await expect(statusField).toHaveValue("Closed");
  await submitButton.click();

  await expect(result).toContainText("Partner satisfaction check");
  await expect(result).toContainText("Partners");
  await expect(result).toContainText("Closed");
});
