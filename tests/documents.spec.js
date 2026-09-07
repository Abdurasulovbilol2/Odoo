const { test, expect } = require("@playwright/test");

async function setupDocumentsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Documents | Odoo</title>
      </head>
      <body>
        <h1>Documents</h1>
        <form id="documentForm">
          <label for="title">Document title *</label>
          <input id="title" name="title" type="text" value="${options.title || ""}" required />

          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="">Select category</option>
            <option value="Contracts" ${options.category === "Contracts" ? "selected" : ""}>Contracts</option>
            <option value="Invoices" ${options.category === "Invoices" ? "selected" : ""}>Invoices</option>
            <option value="Reports" ${options.category === "Reports" ? "selected" : ""}>Reports</option>
          </select>

          <label for="owner">Owner *</label>
          <input id="owner" name="owner" type="text" value="${options.owner || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Validated" ${options.status === "Validated" ? "selected" : ""}>Validated</option>
            <option value="Archived" ${options.status === "Archived" ? "selected" : ""}>Archived</option>
          </select>

          <label for="fileName">File name *</label>
          <input id="fileName" name="fileName" type="text" value="${options.fileName || ""}" required />

          <button type="submit">Save document</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("documentForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("title").value,
              document.getElementById("category").value,
              document.getElementById("owner").value,
              document.getElementById("status").value,
              document.getElementById("fileName").value,
            ];
            document.getElementById("result").textContent = "Document saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    titleField: page.locator("#title"),
    categoryField: page.locator("#category"),
    ownerField: page.locator("#owner"),
    statusField: page.locator("#status"),
    fileNameField: page.locator("#fileName"),
    submitButton: page.getByRole("button", { name: /save document/i }),
    result: page.locator("#result"),
  };
}

test("loads the document management form", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    statusField,
    fileNameField,
    submitButton,
  } = await setupDocumentsPage(page);

  await expect(page).toHaveTitle(/Documents/i);
  await expect(titleField).toBeVisible();
  await expect(categoryField).toBeVisible();
  await expect(ownerField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(fileNameField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a validated contract document", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    statusField,
    fileNameField,
    submitButton,
    result,
  } = await setupDocumentsPage(page);

  await titleField.fill("Supplier contract 2026");
  await categoryField.selectOption("Contracts");
  await ownerField.fill("Legal Team");
  await statusField.selectOption("Validated");
  await fileNameField.fill("supplier-contract-2026.pdf");
  await submitButton.click();

  await expect(result).toHaveText(
    "Document saved: Supplier contract 2026 | Contracts | Legal Team | Validated | supplier-contract-2026.pdf",
  );
});

test("requires document metadata before saving", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    statusField,
    fileNameField,
    submitButton,
  } = await setupDocumentsPage(page);

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
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      fileNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("preserves an existing document record", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    statusField,
    fileNameField,
    submitButton,
    result,
  } = await setupDocumentsPage(page, {
    title: "Q3 operations report",
    category: "Reports",
    owner: "Finance",
    status: "Draft",
    fileName: "q3-operations-report.xlsx",
  });

  await expect(titleField).toHaveValue("Q3 operations report");
  await expect(categoryField).toHaveValue("Reports");
  await expect(ownerField).toHaveValue("Finance");
  await expect(statusField).toHaveValue("Draft");
  await expect(fileNameField).toHaveValue("q3-operations-report.xlsx");
  await submitButton.click();

  await expect(result).toContainText("Q3 operations report");
  await expect(result).toContainText("Reports");
  await expect(result).toContainText("Finance");
  await expect(result).toContainText("q3-operations-report.xlsx");
});

test("stores an archived invoice document", async ({ page }) => {
  const {
    titleField,
    categoryField,
    ownerField,
    statusField,
    fileNameField,
    submitButton,
    result,
  } = await setupDocumentsPage(page, {
    title: "Invoices archive 2025",
    category: "Invoices",
    owner: "Accounting",
    status: "Archived",
    fileName: "invoices-archive-2025.zip",
  });

  await expect(statusField).toHaveValue("Archived");
  await submitButton.click();

  await expect(result).toContainText("Invoices archive 2025");
  await expect(result).toContainText("Invoices");
  await expect(result).toContainText("Archived");
  await expect(result).toContainText("invoices-archive-2025.zip");
});
