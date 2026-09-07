const { test, expect } = require("@playwright/test");

async function setupProjectTemplatesPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Project Templates | Odoo</title>
      </head>
      <body>
        <h1>Project Templates</h1>
        <form id="templateForm">
          <label for="templateName">Template name *</label>
          <input id="templateName" name="templateName" type="text" value="${options.templateName || ""}" required />

          <label for="projectType">Project type *</label>
          <select id="projectType" name="projectType" required>
            <option value="">Select type</option>
            <option value="Implementation" ${options.projectType === "Implementation" ? "selected" : ""}>Implementation</option>
            <option value="Internal" ${options.projectType === "Internal" ? "selected" : ""}>Internal</option>
            <option value="Consulting" ${options.projectType === "Consulting" ? "selected" : ""}>Consulting</option>
          </select>

          <label for="phase">Phase *</label>
          <input id="phase" name="phase" type="text" value="${options.phase || ""}" required />

          <label for="owner">Owner *</label>
          <input id="owner" name="owner" type="text" value="${options.owner || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Active" ${options.status === "Active" ? "selected" : ""}>Active</option>
            <option value="Archived" ${options.status === "Archived" ? "selected" : ""}>Archived</option>
          </select>

          <button type="submit">Save template</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("templateForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("templateName").value,
              document.getElementById("projectType").value,
              document.getElementById("phase").value,
              document.getElementById("owner").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Template saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    templateNameField: page.locator("#templateName"),
    projectTypeField: page.locator("#projectType"),
    phaseField: page.locator("#phase"),
    ownerField: page.locator("#owner"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save template/i }),
    result: page.locator("#result"),
  };
}

test("loads the project templates form", async ({ page }) => {
  const {
    templateNameField,
    projectTypeField,
    phaseField,
    ownerField,
    statusField,
    submitButton,
  } = await setupProjectTemplatesPage(page);

  await expect(page).toHaveTitle(/Project Templates/i);
  await expect(templateNameField).toBeVisible();
  await expect(projectTypeField).toBeVisible();
  await expect(phaseField).toBeVisible();
  await expect(ownerField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves an implementation project template", async ({ page }) => {
  const {
    templateNameField,
    projectTypeField,
    phaseField,
    ownerField,
    statusField,
    submitButton,
    result,
  } = await setupProjectTemplatesPage(page);

  await templateNameField.fill("Client onboarding template");
  await projectTypeField.selectOption("Implementation");
  await phaseField.fill("Discovery");
  await ownerField.fill("PMO Team");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Template saved: Client onboarding template | Implementation | Discovery | PMO Team | Active",
  );
});

test("requires template metadata before saving", async ({ page }) => {
  const {
    templateNameField,
    projectTypeField,
    phaseField,
    ownerField,
    statusField,
    submitButton,
  } = await setupProjectTemplatesPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      templateNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      projectTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      phaseField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      ownerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("keeps a pre-filled project template", async ({ page }) => {
  const {
    templateNameField,
    projectTypeField,
    phaseField,
    ownerField,
    statusField,
    submitButton,
    result,
  } = await setupProjectTemplatesPage(page, {
    templateName: "Internal process template",
    projectType: "Internal",
    phase: "Planning",
    owner: "Operations",
    status: "Draft",
  });

  await expect(templateNameField).toHaveValue("Internal process template");
  await expect(projectTypeField).toHaveValue("Internal");
  await expect(phaseField).toHaveValue("Planning");
  await expect(ownerField).toHaveValue("Operations");
  await expect(statusField).toHaveValue("Draft");
  await submitButton.click();

  await expect(result).toContainText("Internal process template");
  await expect(result).toContainText("Planning");
  await expect(result).toContainText("Operations");
});

test("archives an existing project template", async ({ page }) => {
  const {
    templateNameField,
    projectTypeField,
    phaseField,
    ownerField,
    statusField,
    submitButton,
    result,
  } = await setupProjectTemplatesPage(page, {
    templateName: "Consulting delivery template",
    projectType: "Consulting",
    phase: "Delivery",
    owner: "Delivery Team",
    status: "Archived",
  });

  await expect(statusField).toHaveValue("Archived");
  await submitButton.click();

  await expect(result).toContainText("Consulting delivery template");
  await expect(result).toContainText("Delivery");
  await expect(result).toContainText("Archived");
});
