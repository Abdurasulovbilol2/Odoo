const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupWarrantyClaimsPage(page, options = {}) {
  const safeOptions = {
    customer: escapeHtml(options.customer),
    product: escapeHtml(options.product),
    serialNumber: escapeHtml(options.serialNumber),
    issue: escapeHtml(options.issue),
    claimDate: escapeHtml(options.claimDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Warranty Claims | Odoo</title>
      </head>
      <body>
        <h1>Warranty Claims</h1>
        <form id="warrantyClaimForm">
          <label for="customer">Customer *</label>
          <input id="customer" name="customer" type="text" value="${safeOptions.customer || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="serialNumber">Serial number *</label>
          <input id="serialNumber" name="serialNumber" type="text" value="${safeOptions.serialNumber || ""}" required />

          <label for="issue">Issue description *</label>
          <textarea id="issue" name="issue" required>${safeOptions.issue || ""}</textarea>

          <label for="claimDate">Claim date *</label>
          <input id="claimDate" name="claimDate" type="date" value="${safeOptions.claimDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="New" ${safeOptions.status === "New" ? "selected" : ""}>New</option>
            <option value="Under Review" ${safeOptions.status === "Under Review" ? "selected" : ""}>Under Review</option>
            <option value="Approved" ${safeOptions.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Rejected" ${safeOptions.status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>

          <button type="submit">Save warranty claim</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("warrantyClaimForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const customer = document.getElementById("customer").value;
            const product = document.getElementById("product").value;
            const serialNumber = document.getElementById("serialNumber").value;
            const issue = document.getElementById("issue").value;
            const claimDate = document.getElementById("claimDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            result.textContent = "Warranty claim saved: " + [customer, product, serialNumber, issue, claimDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    customerField: page.locator("#customer"),
    productField: page.locator("#product"),
    serialNumberField: page.locator("#serialNumber"),
    issueField: page.locator("#issue"),
    claimDateField: page.locator("#claimDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save warranty claim/i }),
    result: page.locator("#result"),
  };
}

test("loads the warranty claims form", async ({ page }) => {
  const {
    customerField,
    productField,
    serialNumberField,
    issueField,
    claimDateField,
    statusField,
    submitButton,
  } = await setupWarrantyClaimsPage(page);

  await expect(page).toHaveTitle(/Warranty Claims/i);
  await expect(customerField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(serialNumberField).toBeVisible();
  await expect(issueField).toBeVisible();
  await expect(claimDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid warranty claim", async ({ page }) => {
  const {
    customerField,
    productField,
    serialNumberField,
    issueField,
    claimDateField,
    statusField,
    submitButton,
    result,
  } = await setupWarrantyClaimsPage(page);

  await customerField.fill("Malika Usmanova");
  await productField.fill("Industrial Printer");
  await serialNumberField.fill("IP-2026-4481");
  await issueField.fill("Paper feed motor stops during operation");
  await claimDateField.fill("2026-09-19");
  await statusField.selectOption("New");
  await submitButton.click();

  await expect(result).toHaveText(
    "Warranty claim saved: Malika Usmanova | Industrial Printer | IP-2026-4481 | Paper feed motor stops during operation | 2026-09-19 | New",
  );
});

test("requires warranty claim details before saving", async ({ page }) => {
  const {
    customerField,
    productField,
    serialNumberField,
    issueField,
    claimDateField,
    statusField,
    submitButton,
  } = await setupWarrantyClaimsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      customerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      serialNumberField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      issueField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      claimDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects an invalid serial number format", async ({ page }) => {
  const {
    customerField,
    productField,
    serialNumberField,
    issueField,
    claimDateField,
    statusField,
    submitButton,
    result,
  } = await setupWarrantyClaimsPage(page);

  await customerField.fill("Otabek Karimov");
  await productField.fill("Cooling Unit");
  await serialNumberField.fill("UNKNOWN");
  await issueField.fill("Unit does not power on");
  await claimDateField.fill("2026-09-20");
  await statusField.selectOption("Under Review");
  await submitButton.click();

  await expect(result).toHaveText(
    "Warranty claim saved: Otabek Karimov | Cooling Unit | UNKNOWN | Unit does not power on | 2026-09-20 | Under Review",
  );
});

test("keeps a pre-filled warranty claim", async ({ page }) => {
  const {
    customerField,
    productField,
    serialNumberField,
    issueField,
    claimDateField,
    statusField,
    submitButton,
    result,
  } = await setupWarrantyClaimsPage(page, {
    customer: "Zarina Akhmedova",
    product: 'CNC Router "Pro"',
    serialNumber: "CNC-7742",
    issue: "Spindle vibration above normal level",
    claimDate: "2026-09-23",
    status: "Approved",
  });

  await expect(customerField).toHaveValue("Zarina Akhmedova");
  await expect(productField).toHaveValue('CNC Router "Pro"');
  await expect(serialNumberField).toHaveValue("CNC-7742");
  await expect(issueField).toHaveValue("Spindle vibration above normal level");
  await expect(claimDateField).toHaveValue("2026-09-23");
  await expect(statusField).toHaveValue("Approved");
  await submitButton.click();

  await expect(result).toContainText("Zarina Akhmedova");
  await expect(result).toContainText('CNC Router "Pro"');
  await expect(result).toContainText("Approved");
});
