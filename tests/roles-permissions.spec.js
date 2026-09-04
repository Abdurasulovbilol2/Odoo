const { test, expect } = require("@playwright/test");

async function setupPermissionsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Roles and Permissions | Odoo</title></head>
      <body>
        <h1>User Roles and Access Permissions</h1>
        <form id="permissionsForm">
          <label for="user">User *</label>
          <input id="user" name="user" type="text" value="${options.user || ""}" required />
          <label for="role">Role *</label>
          <select id="role" name="role" required>
            <option value="">Select a role</option>
            <option value="sales-user" ${options.role === "sales-user" ? "selected" : ""}>Sales User</option>
            <option value="inventory-user" ${options.role === "inventory-user" ? "selected" : ""}>Inventory User</option>
            <option value="accounting-manager" ${options.role === "accounting-manager" ? "selected" : ""}>Accounting Manager</option>
            <option value="administrator" ${options.role === "administrator" ? "selected" : ""}>Administrator</option>
          </select>
          <label for="module">Module *</label>
          <select id="module" name="module" required>
            <option value="">Select a module</option>
            <option value="sales" ${options.module === "sales" ? "selected" : ""}>Sales</option>
            <option value="inventory" ${options.module === "inventory" ? "selected" : ""}>Inventory</option>
            <option value="accounting" ${options.module === "accounting" ? "selected" : ""}>Accounting</option>
          </select>
          <label for="access">Access level *</label>
          <select id="access" name="access" required>
            <option value="">Select access</option>
            <option value="read" ${options.access === "read" ? "selected" : ""}>Read</option>
            <option value="write" ${options.access === "write" ? "selected" : ""}>Read and write</option>
            <option value="none" ${options.access === "none" ? "selected" : ""}>No access</option>
          </select>
          <button type="submit">Save permissions</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("permissionsForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const access = document.getElementById("access").value;
            const result = document.getElementById("result");
            if (access === "none") {
              result.textContent = "Access denied";
              return;
            }
            const values = ["user", "role", "module", "access"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            result.textContent = "Permissions saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    userField: page.locator("#user"),
    roleField: page.locator("#role"),
    moduleField: page.locator("#module"),
    accessField: page.locator("#access"),
    submitButton: page.getByRole("button", { name: /save permissions/i }),
    result: page.locator("#result"),
  };
}

test("loads the roles and permissions form", async ({ page }) => {
  const { userField, roleField, moduleField, accessField, submitButton } =
    await setupPermissionsPage(page);

  await expect(page).toHaveTitle(/Roles and Permissions/i);
  await expect(userField).toBeVisible();
  await expect(roleField).toBeVisible();
  await expect(moduleField).toBeVisible();
  await expect(accessField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("grants a sales user write access", async ({ page }) => {
  const {
    userField,
    roleField,
    moduleField,
    accessField,
    submitButton,
    result,
  } = await setupPermissionsPage(page);

  await userField.fill("Jane Smith");
  await roleField.selectOption("sales-user");
  await moduleField.selectOption("sales");
  await accessField.selectOption("write");
  await submitButton.click();

  await expect(result).toHaveText(
    "Permissions saved: Jane Smith | sales-user | sales | write",
  );
});

test("requires user, role, module, and access level", async ({ page }) => {
  const { userField, roleField, moduleField, accessField, submitButton } =
    await setupPermissionsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      userField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      roleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      moduleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      accessField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("denies access when a module has no access", async ({ page }) => {
  const {
    userField,
    roleField,
    moduleField,
    accessField,
    submitButton,
    result,
  } = await setupPermissionsPage(page);

  await userField.fill("Jane Smith");
  await roleField.selectOption("sales-user");
  await moduleField.selectOption("accounting");
  await accessField.selectOption("none");
  await submitButton.click();

  await expect(result).toHaveText("Access denied");
});

test("updates an existing user's module permissions", async ({ page }) => {
  const {
    userField,
    roleField,
    moduleField,
    accessField,
    submitButton,
    result,
  } = await setupPermissionsPage(page, {
    user: "Jane Smith",
    role: "inventory-user",
    module: "inventory",
    access: "read",
  });

  await expect(accessField).toHaveValue("read");
  await accessField.selectOption("write");
  await submitButton.click();

  await expect(result).toContainText("Jane Smith");
  await expect(result).toContainText("inventory");
  await expect(result).toContainText("write");
});
