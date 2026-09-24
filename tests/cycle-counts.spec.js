const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupCycleCountsPage(page, options = {}) {
  const safeOptions = {
    item: escapeHtml(options.item),
    expectedQuantity: escapeHtml(options.expectedQuantity),
    countedQuantity: escapeHtml(options.countedQuantity),
    variance: escapeHtml(options.variance),
    countedBy: escapeHtml(options.countedBy),
    countDate: escapeHtml(options.countDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Cycle Counts | Odoo</title>
      </head>
      <body>
        <h1>Cycle Counts</h1>
        <form id="countForm">
          <label for="item">Item *</label>
          <input id="item" name="item" type="text" value="${safeOptions.item || ""}" required />

          <label for="expectedQuantity">Expected quantity *</label>
          <input id="expectedQuantity" name="expectedQuantity" type="number" step="0.01" value="${safeOptions.expectedQuantity || ""}" required />

          <label for="countedQuantity">Counted quantity *</label>
          <input id="countedQuantity" name="countedQuantity" type="number" step="0.01" value="${safeOptions.countedQuantity || ""}" required />

          <label for="variance">Variance *</label>
          <input id="variance" name="variance" type="number" step="0.01" value="${safeOptions.variance || ""}" required />

          <label for="countedBy">Counted by *</label>
          <input id="countedBy" name="countedBy" type="text" value="${safeOptions.countedBy || ""}" required />

          <label for="countDate">Count date *</label>
          <input id="countDate" name="countDate" type="date" value="${safeOptions.countDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Open" ${safeOptions.status === "Open" ? "selected" : ""}>Open</option>
            <option value="Validated" ${safeOptions.status === "Validated" ? "selected" : ""}>Validated</option>
            <option value="Discrepancy" ${safeOptions.status === "Discrepancy" ? "selected" : ""}>Discrepancy</option>
          </select>

          <button type="submit">Submit count</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          document.getElementById("countForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const item = document.getElementById("item").value.trim();
            const expected = Number(document.getElementById("expectedQuantity").value);
            const counted = Number(document.getElementById("countedQuantity").value);
            const variance = Number(document.getElementById("variance").value);
            const countedBy = document.getElementById("countedBy").value.trim();
            const countDate = document.getElementById("countDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (expected < 0 || counted < 0) {
              result.textContent = "Quantities cannot be negative";
              return;
            }

            if (Math.abs(variance) < 0.01) {
              result.textContent = "Variance must reflect the count difference";
              return;
            }

            if (status === "Discrepancy" && Math.abs(variance) < 1) {
              result.textContent = "Discrepancy status requires a variance of at least 1 unit";
              return;
            }

            result.textContent = "Count submitted: " + [item, expected.toFixed(2), counted.toFixed(2), variance.toFixed(2), countedBy, countDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    itemField: page.locator("#item"),
    expectedQuantityField: page.locator("#expectedQuantity"),
    countedQuantityField: page.locator("#countedQuantity"),
    varianceField: page.locator("#variance"),
    countedByField: page.locator("#countedBy"),
    countDateField: page.locator("#countDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /submit count/i }),
    result: page.locator("#result"),
  };
}

test("loads the cycle counts form", async ({ page }) => {
  const {
    itemField,
    expectedQuantityField,
    countedQuantityField,
    varianceField,
    countedByField,
    countDateField,
    statusField,
    submitButton,
  } = await setupCycleCountsPage(page);

  await expect(page).toHaveTitle(/Cycle Counts/i);
  await expect(itemField).toBeVisible();
  await expect(expectedQuantityField).toBeVisible();
  await expect(countedQuantityField).toBeVisible();
  await expect(varianceField).toBeVisible();
  await expect(countedByField).toBeVisible();
  await expect(countDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("submits a valid cycle count", async ({ page }) => {
  const {
    itemField,
    expectedQuantityField,
    countedQuantityField,
    varianceField,
    countedByField,
    countDateField,
    statusField,
    submitButton,
    result,
  } = await setupCycleCountsPage(page);

  await itemField.fill("Laptop Charger");
  await expectedQuantityField.fill("100");
  await countedQuantityField.fill("96");
  await varianceField.fill("-4");
  await countedByField.fill("J. Patel");
  await countDateField.fill("2026-09-25");
  await statusField.selectOption("Discrepancy");
  await submitButton.click();

  await expect(result).toHaveText(
    "Count submitted: Laptop Charger | 100.00 | 96.00 | -4.00 | J. Patel | 2026-09-25 | Discrepancy",
  );
});

test("requires all count fields before submission", async ({ page }) => {
  const {
    itemField,
    expectedQuantityField,
    countedQuantityField,
    varianceField,
    countedByField,
    countDateField,
    statusField,
    submitButton,
  } = await setupCycleCountsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      itemField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      expectedQuantityField.evaluate(
        (element) => element.validity.valueMissing,
      ),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      countedQuantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      varianceField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      countedByField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      countDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects negative quantities", async ({ page }) => {
  const {
    itemField,
    expectedQuantityField,
    countedQuantityField,
    varianceField,
    countedByField,
    countDateField,
    statusField,
    submitButton,
    result,
  } = await setupCycleCountsPage(page);

  await itemField.fill("Printer Paper");
  await expectedQuantityField.fill("20");
  await countedQuantityField.fill("-1");
  await varianceField.fill("-21");
  await countedByField.fill("R. Gomez");
  await countDateField.fill("2026-09-26");
  await statusField.selectOption("Open");
  await submitButton.click();

  await expect(result).toHaveText("Quantities cannot be negative");
});

test("keeps a pre-filled cycle count", async ({ page }) => {
  const {
    itemField,
    expectedQuantityField,
    countedQuantityField,
    varianceField,
    countedByField,
    countDateField,
    statusField,
    submitButton,
    result,
  } = await setupCycleCountsPage(page, {
    item: 'Safety Gloves "XL"',
    expectedQuantity: "80",
    countedQuantity: "82",
    variance: "2",
    countedBy: "M. Smith",
    countDate: "2026-09-27",
    status: "Validated",
  });

  await expect(itemField).toHaveValue('Safety Gloves "XL"');
  await expect(expectedQuantityField).toHaveValue("80");
  await expect(countedQuantityField).toHaveValue("82");
  await expect(varianceField).toHaveValue("2");
  await expect(countedByField).toHaveValue("M. Smith");
  await expect(countDateField).toHaveValue("2026-09-27");
  await expect(statusField).toHaveValue("Validated");

  await submitButton.click();

  await expect(result).toContainText('Safety Gloves "XL"');
  await expect(result).toContainText("82.00");
});
