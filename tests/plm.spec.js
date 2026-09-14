const { test, expect } = require("@playwright/test");

async function setupPlmPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Product Lifecycle Management | Odoo</title>
      </head>
      <body>
        <h1>Product Lifecycle Management</h1>
        <form id="plmForm">
          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${options.product || ""}" required />

          <label for="version">Version *</label>
          <input id="version" name="version" type="text" value="${options.version || ""}" required />

          <label for="changeType">Change type *</label>
          <select id="changeType" name="changeType" required>
            <option value="">Select change type</option>
            <option value="Engineering change" ${options.changeType === "Engineering change" ? "selected" : ""}>Engineering change</option>
            <option value="Component replacement" ${options.changeType === "Component replacement" ? "selected" : ""}>Component replacement</option>
            <option value="Documentation update" ${options.changeType === "Documentation update" ? "selected" : ""}>Documentation update</option>
          </select>

          <label for="effectiveDate">Effective date *</label>
          <input id="effectiveDate" name="effectiveDate" type="date" value="${options.effectiveDate || ""}" required />

          <label for="owner">Change owner *</label>
          <input id="owner" name="owner" type="text" value="${options.owner || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Under review" ${options.status === "Under review" ? "selected" : ""}>Under review</option>
            <option value="Approved" ${options.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Obsolete" ${options.status === "Obsolete" ? "selected" : ""}>Obsolete</option>
          </select>

          <button type="submit">Save change order</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("plmForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("product").value,
              document.getElementById("version").value,
              document.getElementById("changeType").value,
              document.getElementById("effectiveDate").value,
              document.getElementById("owner").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Change order saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    productField: page.locator("#product"),
    versionField: page.locator("#version"),
    changeTypeField: page.locator("#changeType"),
    effectiveDateField: page.locator("#effectiveDate"),
    ownerField: page.locator("#owner"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save change order/i }),
    result: page.locator("#result"),
  };
}

test("loads the product lifecycle form", async ({ page }) => {
  const {
    productField,
    versionField,
    changeTypeField,
    effectiveDateField,
    ownerField,
    statusField,
    submitButton,
  } = await setupPlmPage(page);

  await expect(page).toHaveTitle(/Product Lifecycle Management/i);
  await expect(productField).toBeVisible();
  await expect(versionField).toBeVisible();
  await expect(changeTypeField).toBeVisible();
  await expect(effectiveDateField).toBeVisible();
  await expect(ownerField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves an approved engineering change", async ({ page }) => {
  const {
    productField,
    versionField,
    changeTypeField,
    effectiveDateField,
    ownerField,
    statusField,
    submitButton,
    result,
  } = await setupPlmPage(page);

  await productField.fill("Industrial pump");
  await versionField.fill("v2.1");
  await changeTypeField.selectOption("Engineering change");
  await effectiveDateField.fill("2026-10-01");
  await ownerField.fill("Engineering Team");
  await statusField.selectOption("Approved");
  await submitButton.click();

  await expect(result).toHaveText(
    "Change order saved: Industrial pump | v2.1 | Engineering change | 2026-10-01 | Engineering Team | Approved",
  );
});

test("requires lifecycle change details before saving", async ({ page }) => {
  const {
    productField,
    versionField,
    changeTypeField,
    effectiveDateField,
    ownerField,
    statusField,
    submitButton,
  } = await setupPlmPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      versionField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      changeTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      effectiveDateField.evaluate((element) => element.validity.valueMissing),
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

test("rejects an empty product version", async ({ page }) => {
  const { versionField } = await setupPlmPage(page);

  await versionField.fill("");
  await expect(versionField).toHaveJSProperty("validity.valid", false);
  await expect(versionField).toHaveJSProperty("validity.valueMissing", true);
});

test("keeps an obsolete pre-filled change order", async ({ page }) => {
  const {
    productField,
    versionField,
    changeTypeField,
    effectiveDateField,
    ownerField,
    statusField,
    submitButton,
    result,
  } = await setupPlmPage(page, {
    product: "Packaging machine",
    version: "v1.4",
    changeType: "Component replacement",
    effectiveDate: "2026-08-15",
    owner: "Product Operations",
    status: "Obsolete",
  });

  await expect(productField).toHaveValue("Packaging machine");
  await expect(versionField).toHaveValue("v1.4");
  await expect(changeTypeField).toHaveValue("Component replacement");
  await expect(effectiveDateField).toHaveValue("2026-08-15");
  await expect(ownerField).toHaveValue("Product Operations");
  await expect(statusField).toHaveValue("Obsolete");
  await submitButton.click();

  await expect(result).toContainText("Packaging machine");
  await expect(result).toContainText("Component replacement");
  await expect(result).toContainText("Obsolete");
});
