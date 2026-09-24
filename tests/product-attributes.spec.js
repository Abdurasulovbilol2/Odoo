const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupProductAttributesPage(page, options = {}) {
  const safeOptions = {
    attributeName: escapeHtml(options.attributeName),
    attributeValue: escapeHtml(options.attributeValue),
    displayName: escapeHtml(options.displayName),
    sequence: escapeHtml(options.sequence),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Product Attributes | Odoo</title>
      </head>
      <body>
        <h1>Product Attributes</h1>
        <form id="attributeForm">
          <label for="attributeName">Attribute name *</label>
          <input id="attributeName" name="attributeName" type="text" value="${safeOptions.attributeName || ""}" required />

          <label for="attributeValue">Attribute value *</label>
          <input id="attributeValue" name="attributeValue" type="text" value="${safeOptions.attributeValue || ""}" required />

          <label for="displayName">Display name *</label>
          <input id="displayName" name="displayName" type="text" value="${safeOptions.displayName || ""}" required />

          <label for="sequence">Sequence *</label>
          <input id="sequence" name="sequence" type="number" step="1" value="${safeOptions.sequence || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Active" ${safeOptions.status === "Active" ? "selected" : ""}>Active</option>
            <option value="Inactive" ${safeOptions.status === "Inactive" ? "selected" : ""}>Inactive</option>
          </select>

          <button type="submit">Save attribute</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("attributeForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const attributeName = document.getElementById("attributeName").value;
            const attributeValue = document.getElementById("attributeValue").value;
            const displayName = document.getElementById("displayName").value;
            const sequence = Number(document.getElementById("sequence").value);
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (sequence < 0) {
              result.textContent = "Sequence cannot be negative";
              return;
            }

            if (status === "Active" && !attributeValue.trim()) {
              result.textContent = "Active attributes need a value";
              return;
            }

            result.textContent = "Attribute saved: " + [attributeName, attributeValue, displayName, sequence, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    attributeNameField: page.locator("#attributeName"),
    attributeValueField: page.locator("#attributeValue"),
    displayNameField: page.locator("#displayName"),
    sequenceField: page.locator("#sequence"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save attribute/i }),
    result: page.locator("#result"),
  };
}

test("loads the product attributes form", async ({ page }) => {
  const {
    attributeNameField,
    attributeValueField,
    displayNameField,
    sequenceField,
    statusField,
    submitButton,
  } = await setupProductAttributesPage(page);

  await expect(page).toHaveTitle(/Product Attributes/i);
  await expect(attributeNameField).toBeVisible();
  await expect(attributeValueField).toBeVisible();
  await expect(displayNameField).toBeVisible();
  await expect(sequenceField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid product attribute", async ({ page }) => {
  const {
    attributeNameField,
    attributeValueField,
    displayNameField,
    sequenceField,
    statusField,
    submitButton,
    result,
  } = await setupProductAttributesPage(page);

  await attributeNameField.fill("Material");
  await attributeValueField.fill("Cotton");
  await displayNameField.fill("Material Type");
  await sequenceField.fill("1");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Attribute saved: Material | Cotton | Material Type | 1 | Active",
  );
});

test("requires all attribute fields before saving", async ({ page }) => {
  const {
    attributeNameField,
    attributeValueField,
    displayNameField,
    sequenceField,
    statusField,
    submitButton,
  } = await setupProductAttributesPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      attributeNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      attributeValueField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      displayNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      sequenceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects negative sequences", async ({ page }) => {
  const {
    attributeNameField,
    attributeValueField,
    displayNameField,
    sequenceField,
    statusField,
    submitButton,
    result,
  } = await setupProductAttributesPage(page);

  await attributeNameField.fill("Fit");
  await attributeValueField.fill("Loose");
  await displayNameField.fill("Fit Style");
  await sequenceField.fill("-1");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText("Sequence cannot be negative");
});

test("keeps a pre-filled product attribute", async ({ page }) => {
  const {
    attributeNameField,
    attributeValueField,
    displayNameField,
    sequenceField,
    statusField,
    submitButton,
    result,
  } = await setupProductAttributesPage(page, {
    attributeName: "Color",
    attributeValue: "Forest Green",
    displayName: "Default Color",
    sequence: "2",
    status: "Inactive",
  });

  await expect(attributeNameField).toHaveValue("Color");
  await expect(attributeValueField).toHaveValue("Forest Green");
  await expect(displayNameField).toHaveValue("Default Color");
  await expect(sequenceField).toHaveValue("2");
  await expect(statusField).toHaveValue("Inactive");
  await submitButton.click();

  await expect(result).toContainText("Color");
  await expect(result).toContainText("Forest Green");
  await expect(result).toContainText("2");
});
