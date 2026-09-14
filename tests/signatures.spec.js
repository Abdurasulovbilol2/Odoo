const { test, expect } = require("@playwright/test");

async function setupSignaturesPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Signatures | Odoo</title>
      </head>
      <body>
        <h1>Signatures</h1>
        <form id="signatureForm">
          <label for="document">Document *</label>
          <input id="document" name="document" type="text" value="${options.document || ""}" required />

          <label for="signer">Signer *</label>
          <input id="signer" name="signer" type="text" value="${options.signer || ""}" required />

          <label for="signerEmail">Signer email *</label>
          <input id="signerEmail" name="signerEmail" type="email" value="${options.signerEmail || ""}" required />

          <label for="requestDate">Request date *</label>
          <input id="requestDate" name="requestDate" type="date" value="${options.requestDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Draft" ${options.status === "Draft" ? "selected" : ""}>Draft</option>
            <option value="Sent" ${options.status === "Sent" ? "selected" : ""}>Sent</option>
            <option value="Signed" ${options.status === "Signed" ? "selected" : ""}>Signed</option>
            <option value="Refused" ${options.status === "Refused" ? "selected" : ""}>Refused</option>
          </select>

          <button type="submit">Save signature request</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("signatureForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("document").value,
              document.getElementById("signer").value,
              document.getElementById("signerEmail").value,
              document.getElementById("requestDate").value,
              document.getElementById("status").value,
            ];
            document.getElementById("result").textContent = "Signature request saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    documentField: page.locator("#document"),
    signerField: page.locator("#signer"),
    signerEmailField: page.locator("#signerEmail"),
    requestDateField: page.locator("#requestDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save signature request/i }),
    result: page.locator("#result"),
  };
}

test("loads the signatures form", async ({ page }) => {
  const {
    documentField,
    signerField,
    signerEmailField,
    requestDateField,
    statusField,
    submitButton,
  } = await setupSignaturesPage(page);

  await expect(page).toHaveTitle(/Signatures/i);
  await expect(documentField).toBeVisible();
  await expect(signerField).toBeVisible();
  await expect(signerEmailField).toBeVisible();
  await expect(requestDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a sent signature request", async ({ page }) => {
  const {
    documentField,
    signerField,
    signerEmailField,
    requestDateField,
    statusField,
    submitButton,
    result,
  } = await setupSignaturesPage(page);

  await documentField.fill("Vendor agreement");
  await signerField.fill("Amina Karimova");
  await signerEmailField.fill("amina@example.com");
  await requestDateField.fill("2026-09-14");
  await statusField.selectOption("Sent");
  await submitButton.click();

  await expect(result).toHaveText(
    "Signature request saved: Vendor agreement | Amina Karimova | amina@example.com | 2026-09-14 | Sent",
  );
});

test("requires signature request details before saving", async ({ page }) => {
  const {
    documentField,
    signerField,
    signerEmailField,
    requestDateField,
    statusField,
    submitButton,
  } = await setupSignaturesPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      documentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      signerField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      signerEmailField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      requestDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects an invalid signer email", async ({ page }) => {
  const { signerEmailField } = await setupSignaturesPage(page);

  await signerEmailField.fill("amina-at-example.com");
  await expect(signerEmailField).toHaveJSProperty("validity.valid", false);
  await expect(signerEmailField).toHaveJSProperty(
    "validity.typeMismatch",
    true,
  );
});

test("keeps a signed pre-filled request", async ({ page }) => {
  const {
    documentField,
    signerField,
    signerEmailField,
    requestDateField,
    statusField,
    submitButton,
    result,
  } = await setupSignaturesPage(page, {
    document: "Employment contract",
    signer: "Bilol Abdurasulov",
    signerEmail: "bilol@example.com",
    requestDate: "2026-09-10",
    status: "Signed",
  });

  await expect(documentField).toHaveValue("Employment contract");
  await expect(signerField).toHaveValue("Bilol Abdurasulov");
  await expect(signerEmailField).toHaveValue("bilol@example.com");
  await expect(requestDateField).toHaveValue("2026-09-10");
  await expect(statusField).toHaveValue("Signed");
  await submitButton.click();

  await expect(result).toContainText("Employment contract");
  await expect(result).toContainText("bilol@example.com");
  await expect(result).toContainText("Signed");
});
