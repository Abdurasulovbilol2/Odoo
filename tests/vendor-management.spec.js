const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupVendorManagementPage(page, options = {}) {
  const safeOptions = {
    vendorName: escapeHtml(options.vendorName),
    contactPerson: escapeHtml(options.contactPerson),
    email: escapeHtml(options.email),
    category: escapeHtml(options.category),
    rating: escapeHtml(options.rating),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Vendor Management | Odoo</title>
      </head>
      <body>
        <h1>Vendor Management</h1>
        <form id="vendorForm">
          <label for="vendorName">Vendor name *</label>
          <input id="vendorName" name="vendorName" type="text" value="${safeOptions.vendorName || ""}" required />

          <label for="contactPerson">Contact person *</label>
          <input id="contactPerson" name="contactPerson" type="text" value="${safeOptions.contactPerson || ""}" required />

          <label for="email">Email *</label>
          <input id="email" name="email" type="email" value="${safeOptions.email || ""}" required />

          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="">Select category</option>
            <option value="Services" ${safeOptions.category === "Services" ? "selected" : ""}>Services</option>
            <option value="Goods" ${safeOptions.category === "Goods" ? "selected" : ""}>Goods</option>
            <option value="Logistics" ${safeOptions.category === "Logistics" ? "selected" : ""}>Logistics</option>
            <option value="IT" ${safeOptions.category === "IT" ? "selected" : ""}>IT</option>
          </select>

          <label for="rating">Rating *</label>
          <input id="rating" name="rating" type="number" step="0.1" value="${safeOptions.rating || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Active" ${safeOptions.status === "Active" ? "selected" : ""}>Active</option>
            <option value="Pending" ${safeOptions.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Blocked" ${safeOptions.status === "Blocked" ? "selected" : ""}>Blocked</option>
          </select>

          <button type="submit">Save vendor</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("vendorForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const vendorName = document.getElementById("vendorName").value;
            const contactPerson = document.getElementById("contactPerson").value;
            const email = document.getElementById("email").value;
            const category = document.getElementById("category").value;
            const rating = document.getElementById("rating").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (Number(rating) < 1 || Number(rating) > 5) {
              result.textContent = "Rating must be between 1 and 5";
              return;
            }

            result.textContent = "Vendor saved: " + [vendorName, contactPerson, email, category, rating, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    vendorNameField: page.locator("#vendorName"),
    contactPersonField: page.locator("#contactPerson"),
    emailField: page.locator("#email"),
    categoryField: page.locator("#category"),
    ratingField: page.locator("#rating"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save vendor/i }),
    result: page.locator("#result"),
  };
}

test("loads the vendor management form", async ({ page }) => {
  const {
    vendorNameField,
    contactPersonField,
    emailField,
    categoryField,
    ratingField,
    statusField,
    submitButton,
  } = await setupVendorManagementPage(page);

  await expect(page).toHaveTitle(/Vendor Management/i);
  await expect(vendorNameField).toBeVisible();
  await expect(contactPersonField).toBeVisible();
  await expect(emailField).toBeVisible();
  await expect(categoryField).toBeVisible();
  await expect(ratingField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid vendor", async ({ page }) => {
  const {
    vendorNameField,
    contactPersonField,
    emailField,
    categoryField,
    ratingField,
    statusField,
    submitButton,
    result,
  } = await setupVendorManagementPage(page);

  await vendorNameField.fill("Prime Logistics");
  await contactPersonField.fill("Dilshod Samadov");
  await emailField.fill("vendor@primelogistics.com");
  await categoryField.selectOption("Logistics");
  await ratingField.fill("4.7");
  await statusField.selectOption("Active");
  await submitButton.click();

  await expect(result).toHaveText(
    "Vendor saved: Prime Logistics | Dilshod Samadov | vendor@primelogistics.com | Logistics | 4.7 | Active",
  );
});

test("requires vendor details before saving", async ({ page }) => {
  const {
    vendorNameField,
    contactPersonField,
    emailField,
    categoryField,
    ratingField,
    statusField,
    submitButton,
  } = await setupVendorManagementPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      vendorNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      contactPersonField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      emailField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      categoryField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      ratingField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects ratings outside the valid range", async ({ page }) => {
  const {
    vendorNameField,
    contactPersonField,
    emailField,
    categoryField,
    ratingField,
    statusField,
    submitButton,
    result,
  } = await setupVendorManagementPage(page);

  await vendorNameField.fill("Northline Services");
  await contactPersonField.fill("Anvar Rahimov");
  await emailField.fill("anvar@northline.com");
  await categoryField.selectOption("Services");
  await ratingField.fill("0");
  await statusField.selectOption("Pending");
  await submitButton.click();

  await expect(result).toHaveText("Rating must be between 1 and 5");
});

test("keeps a pre-filled vendor record", async ({ page }) => {
  const {
    vendorNameField,
    contactPersonField,
    emailField,
    categoryField,
    ratingField,
    statusField,
    submitButton,
    result,
  } = await setupVendorManagementPage(page, {
    vendorName: "Alpha IT Solutions",
    contactPerson: "Nodira Pardaeva",
    email: "ops@alpha-it.com",
    category: "IT",
    rating: "4.9",
    status: "Active",
  });

  await expect(vendorNameField).toHaveValue("Alpha IT Solutions");
  await expect(contactPersonField).toHaveValue("Nodira Pardaeva");
  await expect(emailField).toHaveValue("ops@alpha-it.com");
  await expect(categoryField).toHaveValue("IT");
  await expect(ratingField).toHaveValue("4.9");
  await expect(statusField).toHaveValue("Active");
  await submitButton.click();

  await expect(result).toContainText("Alpha IT Solutions");
  await expect(result).toContainText("Nodira Pardaeva");
  await expect(result).toContainText("Active");
});
