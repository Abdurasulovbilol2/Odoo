const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupCouponsPromotionsPage(page, options = {}) {
  const safeOptions = {
    campaign: escapeHtml(options.campaign),
    couponCode: escapeHtml(options.couponCode),
    discountType: escapeHtml(options.discountType),
    discountValue: escapeHtml(options.discountValue),
    minimumSpend: escapeHtml(options.minimumSpend),
    expiryDate: escapeHtml(options.expiryDate),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Coupons and Promotions | Odoo</title>
      </head>
      <body>
        <h1>Coupons and Promotions</h1>
        <form id="promotionForm">
          <label for="campaign">Campaign *</label>
          <input id="campaign" name="campaign" type="text" value="${safeOptions.campaign || ""}" required />

          <label for="couponCode">Coupon code *</label>
          <input id="couponCode" name="couponCode" type="text" value="${safeOptions.couponCode || ""}" required />

          <label for="discountType">Discount type *</label>
          <select id="discountType" name="discountType" required>
            <option value="">Select type</option>
            <option value="Percentage" ${safeOptions.discountType === "Percentage" ? "selected" : ""}>Percentage</option>
            <option value="Fixed amount" ${safeOptions.discountType === "Fixed amount" ? "selected" : ""}>Fixed amount</option>
          </select>

          <label for="discountValue">Discount value *</label>
          <input id="discountValue" name="discountValue" type="number" step="0.01" value="${safeOptions.discountValue || ""}" required />

          <label for="minimumSpend">Minimum spend *</label>
          <input id="minimumSpend" name="minimumSpend" type="number" step="0.01" value="${safeOptions.minimumSpend || ""}" required />

          <label for="expiryDate">Expiry date *</label>
          <input id="expiryDate" name="expiryDate" type="date" value="${safeOptions.expiryDate || ""}" required />

          <button type="submit">Save promotion</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("promotionForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const campaign = document.getElementById("campaign").value;
            const couponCode = document.getElementById("couponCode").value;
            const discountType = document.getElementById("discountType").value;
            const discountValue = Number(document.getElementById("discountValue").value);
            const minimumSpend = Number(document.getElementById("minimumSpend").value);
            const expiryDate = document.getElementById("expiryDate").value;
            const result = document.getElementById("result");

            if (discountValue <= 0) {
              result.textContent = "Discount value must be greater than zero";
              return;
            }

            if (minimumSpend < 0) {
              result.textContent = "Minimum spend cannot be negative";
              return;
            }

            if (discountType === "Percentage" && discountValue > 100) {
              result.textContent = "Percentage discount cannot exceed 100";
              return;
            }

            result.textContent = "Promotion saved: " + [campaign, couponCode, discountType, discountValue.toFixed(2), minimumSpend.toFixed(2), expiryDate].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    campaignField: page.locator("#campaign"),
    couponCodeField: page.locator("#couponCode"),
    discountTypeField: page.locator("#discountType"),
    discountValueField: page.locator("#discountValue"),
    minimumSpendField: page.locator("#minimumSpend"),
    expiryDateField: page.locator("#expiryDate"),
    submitButton: page.getByRole("button", { name: /save promotion/i }),
    result: page.locator("#result"),
  };
}

test("loads the coupons and promotions form", async ({ page }) => {
  const {
    campaignField,
    couponCodeField,
    discountTypeField,
    discountValueField,
    minimumSpendField,
    expiryDateField,
    submitButton,
  } = await setupCouponsPromotionsPage(page);

  await expect(page).toHaveTitle(/Coupons and Promotions/i);
  await expect(campaignField).toBeVisible();
  await expect(couponCodeField).toBeVisible();
  await expect(discountTypeField).toBeVisible();
  await expect(discountValueField).toBeVisible();
  await expect(minimumSpendField).toBeVisible();
  await expect(expiryDateField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid percentage promotion", async ({ page }) => {
  const {
    campaignField,
    couponCodeField,
    discountTypeField,
    discountValueField,
    minimumSpendField,
    expiryDateField,
    submitButton,
    result,
  } = await setupCouponsPromotionsPage(page);

  await campaignField.fill("Autumn Sale");
  await couponCodeField.fill("AUTUMN15");
  await discountTypeField.selectOption("Percentage");
  await discountValueField.fill("15");
  await minimumSpendField.fill("75");
  await expiryDateField.fill("2026-10-31");
  await submitButton.click();

  await expect(result).toHaveText(
    "Promotion saved: Autumn Sale | AUTUMN15 | Percentage | 15.00 | 75.00 | 2026-10-31",
  );
});

test("requires all promotion fields before saving", async ({ page }) => {
  const {
    campaignField,
    couponCodeField,
    discountTypeField,
    discountValueField,
    minimumSpendField,
    expiryDateField,
    submitButton,
  } = await setupCouponsPromotionsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      campaignField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      couponCodeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      discountTypeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      discountValueField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      minimumSpendField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      expiryDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects percentage discounts above 100", async ({ page }) => {
  const {
    campaignField,
    couponCodeField,
    discountTypeField,
    discountValueField,
    minimumSpendField,
    expiryDateField,
    submitButton,
    result,
  } = await setupCouponsPromotionsPage(page);

  await campaignField.fill("Clearance");
  await couponCodeField.fill("CLEARANCE");
  await discountTypeField.selectOption("Percentage");
  await discountValueField.fill("125");
  await minimumSpendField.fill("10");
  await expiryDateField.fill("2026-12-31");
  await submitButton.click();

  await expect(result).toHaveText("Percentage discount cannot exceed 100");
});

test("keeps a pre-filled promotion", async ({ page }) => {
  const {
    campaignField,
    couponCodeField,
    discountTypeField,
    discountValueField,
    minimumSpendField,
    expiryDateField,
    submitButton,
    result,
  } = await setupCouponsPromotionsPage(page, {
    campaign: 'Partner Launch "2026"',
    couponCode: "PARTNER25",
    discountType: "Fixed amount",
    discountValue: "25",
    minimumSpend: "150",
    expiryDate: "2026-11-30",
  });

  await expect(campaignField).toHaveValue('Partner Launch "2026"');
  await expect(couponCodeField).toHaveValue("PARTNER25");
  await expect(discountTypeField).toHaveValue("Fixed amount");
  await expect(discountValueField).toHaveValue("25");
  await expect(minimumSpendField).toHaveValue("150");
  await expect(expiryDateField).toHaveValue("2026-11-30");
  await submitButton.click();

  await expect(result).toContainText('Partner Launch "2026"');
  await expect(result).toContainText("PARTNER25");
  await expect(result).toContainText("25.00");
});
