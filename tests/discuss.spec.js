const { test, expect } = require("@playwright/test");

async function setupDiscussPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Discuss | Odoo</title>
      </head>
      <body>
        <h1>Discuss</h1>
        <form id="messageForm">
          <label for="channel">Channel *</label>
          <select id="channel" name="channel" required>
            <option value="">Select channel</option>
            <option value="General" ${options.channel === "General" ? "selected" : ""}>General</option>
            <option value="Sales" ${options.channel === "Sales" ? "selected" : ""}>Sales</option>
            <option value="Support" ${options.channel === "Support" ? "selected" : ""}>Support</option>
          </select>

          <label for="recipient">Recipient *</label>
          <input id="recipient" name="recipient" type="text" value="${options.recipient || ""}" required />

          <label for="subject">Message subject *</label>
          <input id="subject" name="subject" type="text" value="${options.subject || ""}" required />

          <label for="message">Message *</label>
          <textarea id="message" name="message" required>${options.message || ""}</textarea>

          <button type="submit">Send message</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("messageForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("channel").value,
              document.getElementById("recipient").value,
              document.getElementById("subject").value,
              document.getElementById("message").value,
            ];
            document.getElementById("result").textContent = "Message sent: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    channelField: page.locator("#channel"),
    recipientField: page.locator("#recipient"),
    subjectField: page.locator("#subject"),
    messageField: page.locator("#message"),
    submitButton: page.getByRole("button", { name: /send message/i }),
    result: page.locator("#result"),
  };
}

test("loads the discuss message form", async ({ page }) => {
  const {
    channelField,
    recipientField,
    subjectField,
    messageField,
    submitButton,
  } = await setupDiscussPage(page);

  await expect(page).toHaveTitle(/Discuss/i);
  await expect(channelField).toBeVisible();
  await expect(recipientField).toBeVisible();
  await expect(subjectField).toBeVisible();
  await expect(messageField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("sends a message to a team channel", async ({ page }) => {
  const {
    channelField,
    recipientField,
    subjectField,
    messageField,
    submitButton,
    result,
  } = await setupDiscussPage(page);

  await channelField.selectOption("Sales");
  await recipientField.fill("sales-team@odoo.com");
  await subjectField.fill("Quarterly follow-up");
  await messageField.fill(
    "Please review the latest pipeline numbers before Friday.",
  );
  await submitButton.click();

  await expect(result).toHaveText(
    "Message sent: Sales | sales-team@odoo.com | Quarterly follow-up | Please review the latest pipeline numbers before Friday.",
  );
});

test("requires channel, recipient, subject, and message", async ({ page }) => {
  const {
    channelField,
    recipientField,
    subjectField,
    messageField,
    submitButton,
  } = await setupDiscussPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      channelField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      recipientField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      subjectField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      messageField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("keeps a pre-filled discussion message", async ({ page }) => {
  const {
    channelField,
    recipientField,
    subjectField,
    messageField,
    submitButton,
    result,
  } = await setupDiscussPage(page, {
    channel: "Support",
    recipient: "support@odoo.com",
    subject: "Incident update",
    message: "The outage was resolved and the team is monitoring the logs.",
  });

  await expect(channelField).toHaveValue("Support");
  await expect(recipientField).toHaveValue("support@odoo.com");
  await expect(subjectField).toHaveValue("Incident update");
  await expect(messageField).toHaveValue(
    "The outage was resolved and the team is monitoring the logs.",
  );
  await submitButton.click();

  await expect(result).toContainText("Support");
  await expect(result).toContainText("support@odoo.com");
  await expect(result).toContainText("Incident update");
});

test("sends a message to the general channel", async ({ page }) => {
  const {
    channelField,
    recipientField,
    subjectField,
    messageField,
    submitButton,
    result,
  } = await setupDiscussPage(page, {
    channel: "General",
    recipient: "team@odoo.com",
    subject: "Office hours reminder",
    message: "Office hours are moved to 3 PM today.",
  });

  await expect(channelField).toHaveValue("General");
  await submitButton.click();

  await expect(result).toContainText("General");
  await expect(result).toContainText("team@odoo.com");
  await expect(result).toContainText("Office hours reminder");
});
