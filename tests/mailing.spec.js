const { test, expect } = require("@playwright/test");

async function setupMailingPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Mailing | Odoo</title>
      </head>
      <body>
        <h1>Mailing Campaign</h1>
        <form id="mailForm">
          <label for="campaignName">Campaign name *</label>
          <input id="campaignName" name="campaignName" type="text" value="${options.campaignName || ""}" required />

          <label for="subject">Email subject *</label>
          <input id="subject" name="subject" type="text" value="${options.subject || ""}" required />

          <label for="sender">Sender *</label>
          <input id="sender" name="sender" type="email" value="${options.sender || ""}" required />

          <label for="audience">Audience *</label>
          <select id="audience" name="audience" required>
            <option value="">Select audience</option>
            <option value="All customers" ${options.audience === "All customers" ? "selected" : ""}>All customers</option>
            <option value="Leads" ${options.audience === "Leads" ? "selected" : ""}>Leads</option>
            <option value="Subscribers" ${options.audience === "Subscribers" ? "selected" : ""}>Subscribers</option>
          </select>

          <label for="sendDate">Send date *</label>
          <input id="sendDate" name="sendDate" type="date" value="${options.sendDate || ""}" required />

          <button type="submit">Send campaign</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("mailForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("campaignName").value,
              document.getElementById("subject").value,
              document.getElementById("sender").value,
              document.getElementById("audience").value,
              document.getElementById("sendDate").value,
            ];
            document.getElementById("result").textContent = "Campaign queued: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    campaignNameField: page.locator("#campaignName"),
    subjectField: page.locator("#subject"),
    senderField: page.locator("#sender"),
    audienceField: page.locator("#audience"),
    sendDateField: page.locator("#sendDate"),
    submitButton: page.getByRole("button", { name: /send campaign/i }),
    result: page.locator("#result"),
  };
}

test("loads the mailing campaign form", async ({ page }) => {
  const {
    campaignNameField,
    subjectField,
    senderField,
    audienceField,
    sendDateField,
    submitButton,
  } = await setupMailingPage(page);

  await expect(page).toHaveTitle(/Mailing/i);
  await expect(campaignNameField).toBeVisible();
  await expect(subjectField).toBeVisible();
  await expect(senderField).toBeVisible();
  await expect(audienceField).toBeVisible();
  await expect(sendDateField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("queues a marketing campaign", async ({ page }) => {
  const {
    campaignNameField,
    subjectField,
    senderField,
    audienceField,
    sendDateField,
    submitButton,
    result,
  } = await setupMailingPage(page);

  await campaignNameField.fill("Quarterly product update");
  await subjectField.fill("New features for your workspace");
  await senderField.fill("marketing@odoo.com");
  await audienceField.selectOption("Subscribers");
  await sendDateField.fill("2026-09-18");
  await submitButton.click();

  await expect(result).toHaveText(
    "Campaign queued: Quarterly product update | New features for your workspace | marketing@odoo.com | Subscribers | 2026-09-18",
  );
});

test("requires campaign details before sending", async ({ page }) => {
  const {
    campaignNameField,
    subjectField,
    senderField,
    audienceField,
    sendDateField,
    submitButton,
  } = await setupMailingPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      campaignNameField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      subjectField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      senderField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      audienceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      sendDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("keeps existing mailing campaign values", async ({ page }) => {
  const {
    campaignNameField,
    subjectField,
    senderField,
    audienceField,
    sendDateField,
    submitButton,
    result,
  } = await setupMailingPage(page, {
    campaignName: "Customer success webinar",
    subject: "Reserve your seat",
    sender: "events@odoo.com",
    audience: "All customers",
    sendDate: "2026-10-02",
  });

  await expect(campaignNameField).toHaveValue("Customer success webinar");
  await expect(subjectField).toHaveValue("Reserve your seat");
  await expect(senderField).toHaveValue("events@odoo.com");
  await expect(audienceField).toHaveValue("All customers");
  await expect(sendDateField).toHaveValue("2026-10-02");
  await submitButton.click();

  await expect(result).toContainText("Customer success webinar");
  await expect(result).toContainText("Reserve your seat");
  await expect(result).toContainText("2026-10-02");
});

test("sends a campaign to leads on a future date", async ({ page }) => {
  const {
    campaignNameField,
    subjectField,
    senderField,
    audienceField,
    sendDateField,
    submitButton,
    result,
  } = await setupMailingPage(page, {
    campaignName: "Lead nurture",
    subject: "Follow up from your demo request",
    sender: "sales@odoo.com",
    audience: "Leads",
    sendDate: "2026-11-15",
  });

  await expect(audienceField).toHaveValue("Leads");
  await expect(sendDateField).toHaveValue("2026-11-15");
  await submitButton.click();

  await expect(result).toContainText("Lead nurture");
  await expect(result).toContainText("Leads");
  await expect(result).toContainText("2026-11-15");
});
