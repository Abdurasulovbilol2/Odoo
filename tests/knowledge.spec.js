const { test, expect } = require("@playwright/test");

async function setupKnowledgePage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Knowledge | Odoo</title>
      </head>
      <body>
        <h1>Knowledge</h1>
        <form id="articleForm">
          <label for="title">Article title *</label>
          <input id="title" name="title" type="text" value="${options.title || ""}" required />

          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="">Select category</option>
            <option value="Operations" ${options.category === "Operations" ? "selected" : ""}>Operations</option>
            <option value="Human resources" ${options.category === "Human resources" ? "selected" : ""}>Human resources</option>
            <option value="Product" ${options.category === "Product" ? "selected" : ""}>Product</option>
          </select>

          <label for="owner">Article owner *</label>
          <input id="owner" name="owner" type="text" value="${options.owner || ""}" required />

          <label for="content">Article content *</label>
          <textarea id="content" name="content" required>${options.content || ""}</textarea>

          <label for="visibility">Visibility *</label>
          <select id="visibility" name="visibility" required>
            <option value="">Select visibility</option>
            <option value="Internal" ${options.visibility === "Internal" ? "selected" : ""}>Internal</option>
            <option value="Shared" ${options.visibility === "Shared" ? "selected" : ""}>Shared</option>
            <option value="Public" ${options.visibility === "Public" ? "selected" : ""}>Public</option>
          </select>

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Published" ${options.status === "Published" ? "selected" : ""}>Published</option>
            <option value="Archived" ${options.status === "Archived" ? "selected" : ""}>Archived</option>
          </select>

          <button type="submit">Save article</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("articleForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("title").value,
              document.getElementById("category").value,
              document.getElementById("owner").value,
              document.getElementById("content").value,
              document.getElementById("visibility").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Article saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    titleField: page.locator("#title"),
    categoryField: page.locator("#category"),
    ownerField: page.locator("#owner"),
    contentField: page.locator("#content"),
    visibilityField: page.locator("#visibility"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save article/i }),
    result: page.locator("#result"),
  };
}

test("loads the knowledge article form", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    contentField,
    visibilityField,
    statusField,
    submitButton,
  } = await setupKnowledgePage(page);

  await expect(page).toHaveTitle(/Knowledge/i);
  await expect(titleField).toBeVisible();
  await expect(categoryField).toBeVisible();
  await expect(ownerField).toBeVisible();
  await expect(contentField).toBeVisible();
  await expect(visibilityField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a published internal knowledge article", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    contentField,
    visibilityField,
    statusField,
    submitButton,
    result,
  } = await setupKnowledgePage(page);

  await titleField.fill("Onboarding checklist");
  await categoryField.selectOption("Operations");
  await ownerField.fill("People Operations");
  await contentField.fill("Complete account setup and security training.");
  await visibilityField.selectOption("Internal");
  await statusField.selectOption("Published");
  await submitButton.click();

  await expect(result).toHaveText(
    "Article saved: Onboarding checklist | Operations | People Operations | Complete account setup and security training. | Internal | Published",
  );
});

test("requires article details before saving", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    contentField,
    visibilityField,
    statusField,
    submitButton,
  } = await setupKnowledgePage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      titleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      categoryField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      ownerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      contentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      visibilityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects an empty knowledge article body", async ({ page }) => {
  const { contentField } = await setupKnowledgePage(page);

  await contentField.fill("");
  await expect(contentField).toHaveJSProperty("validity.valid", false);
  await expect(contentField).toHaveJSProperty("validity.valueMissing", true);
});

test("keeps a pre-filled archived shared article", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    contentField,
    visibilityField,
    statusField,
    submitButton,
    result,
  } = await setupKnowledgePage(page, {
    title: "Release procedure",
    category: "Product",
    owner: "Product Team",
    content: "Archive prior release notes after the new version is published.",
    visibility: "Shared",
    status: "Archived",
  });

  await expect(titleField).toHaveValue("Release procedure");
  await expect(categoryField).toHaveValue("Product");
  await expect(ownerField).toHaveValue("Product Team");
  await expect(contentField).toHaveValue(
    "Archive prior release notes after the new version is published.",
  );
  await expect(visibilityField).toHaveValue("Shared");
  await expect(statusField).toHaveValue("Archived");
  await submitButton.click();

  await expect(result).toContainText("Release procedure");
  await expect(result).toContainText("Shared");
  await expect(result).toContainText("Archived");
});
