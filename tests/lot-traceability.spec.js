const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupLotTraceabilityPage(page, options = {}) {
  const safeOptions = {
    lotNumber: escapeHtml(options.lotNumber),
    product: escapeHtml(options.product),
    warehouse: escapeHtml(options.warehouse),
    quantity: escapeHtml(options.quantity),
    expiryDate: escapeHtml(options.expiryDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Lot Traceability | Odoo</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          form { display: grid; gap: 8px; max-width: 420px; }
          .date-picker { display: grid; gap: 8px; }
          #expiryDate { width: 220px; }
          #calendarPanel {
            border: 1px solid #d0d5dd;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
            width: 260px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.08);
          }
          .calendar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
          }
          .calendar-day {
            border: 1px solid #e5e7eb;
            background: #fff;
            border-radius: 4px;
            padding: 6px 0;
            cursor: pointer;
          }
          .calendar-day.muted {
            opacity: 0.4;
            cursor: default;
          }
          .calendar-day.selected {
            background: #2d7ff9;
            color: #fff;
            border-color: #2d7ff9;
          }
        </style>
      </head>
      <body>
        <h1>Lot Traceability</h1>
        <form id="traceabilityForm">
          <label for="lotNumber">Lot number *</label>
          <input id="lotNumber" name="lotNumber" type="text" value="${safeOptions.lotNumber || ""}" required />

          <label for="product">Product *</label>
          <input id="product" name="product" type="text" value="${safeOptions.product || ""}" required />

          <label for="warehouse">Warehouse *</label>
          <input id="warehouse" name="warehouse" type="text" value="${safeOptions.warehouse || ""}" required />

          <label for="quantity">Quantity *</label>
          <input id="quantity" name="quantity" type="number" step="0.01" value="${safeOptions.quantity || ""}" required />

          <label for="expiryDate">Expiry date *</label>
          <div class="date-picker">
            <input id="expiryDate" name="expiryDate" type="text" value="${safeOptions.expiryDate || ""}" placeholder="YYYY-MM-DD" required />
            <button type="button" id="calendarToggle">Open calendar</button>
            <div id="calendarPanel" hidden>
              <div class="calendar-header">
                <button type="button" id="prevMonth" aria-label="Previous month">&lt;</button>
                <span id="calendarMonthLabel"></span>
                <button type="button" id="nextMonth" aria-label="Next month">&gt;</button>
              </div>
              <div class="calendar-grid" id="calendarDays"></div>
            </div>
          </div>

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Available" ${safeOptions.status === "Available" ? "selected" : ""}>Available</option>
            <option value="Reserved" ${safeOptions.status === "Reserved" ? "selected" : ""}>Reserved</option>
            <option value="Quarantined" ${safeOptions.status === "Quarantined" ? "selected" : ""}>Quarantined</option>
            <option value="Expired" ${safeOptions.status === "Expired" ? "selected" : ""}>Expired</option>
          </select>

          <button type="submit">Save lot</button>
        </form>
        <div id="result" role="status"></div>

        <script>
          const expiryInput = document.getElementById("expiryDate");
          const calendarPanel = document.getElementById("calendarPanel");
          const calendarDays = document.getElementById("calendarDays");
          const monthLabel = document.getElementById("calendarMonthLabel");
          const toggleButton = document.getElementById("calendarToggle");
          const prevMonthButton = document.getElementById("prevMonth");
          const nextMonthButton = document.getElementById("nextMonth");

          let currentViewDate = expiryInput.value ? new Date(expiryInput.value + "T00:00:00") : new Date();

          const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return year + "-" + month + "-" + day;
          };

          function renderCalendar() {
            const year = currentViewDate.getFullYear();
            const month = currentViewDate.getMonth();
            monthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(currentViewDate);

            const firstDayOfMonth = new Date(year, month, 1);
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const offset = (firstDayOfMonth.getDay() + 6) % 7;
            const previousMonthDays = new Date(year, month, 0).getDate();

            const cells = [];
            for (let i = 0; i < offset; i++) {
              const day = previousMonthDays - offset + i + 1;
              cells.push('<button type="button" class="calendar-day muted" disabled>' + day + '</button>');
            }

            for (let day = 1; day <= daysInMonth; day++) {
              const dateValue = formatDate(new Date(year, month, day));
              const selectedClass = expiryInput.value === dateValue ? "selected" : "";
              cells.push('<button type="button" class="calendar-day ' + selectedClass + '" data-date="' + dateValue + '">' + day + '</button>');
            }

            const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
            for (let day = 1; cells.length < totalCells; day++) {
              cells.push('<button type="button" class="calendar-day muted" disabled>' + day + '</button>');
            }

            calendarDays.innerHTML = cells.join("");

            calendarDays.querySelectorAll("[data-date]").forEach((button) => {
              button.addEventListener("click", () => {
                expiryInput.value = button.dataset.date;
                currentViewDate = new Date(button.dataset.date + "T00:00:00");
                calendarPanel.hidden = true;
                renderCalendar();
              });
            });
          }

          toggleButton.addEventListener("click", () => {
            calendarPanel.hidden = !calendarPanel.hidden;
            if (!calendarPanel.hidden) {
              renderCalendar();
            }
          });

          prevMonthButton.addEventListener("click", () => {
            currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1);
            renderCalendar();
          });

          nextMonthButton.addEventListener("click", () => {
            currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1);
            renderCalendar();
          });

          expiryInput.addEventListener("change", () => {
            if (expiryInput.value) {
              currentViewDate = new Date(expiryInput.value + "T00:00:00");
            }
            renderCalendar();
          });

          document.getElementById("traceabilityForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const lotNumber = document.getElementById("lotNumber").value;
            const product = document.getElementById("product").value;
            const warehouse = document.getElementById("warehouse").value;
            const quantity = Number(document.getElementById("quantity").value);
            const expiryDate = document.getElementById("expiryDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (quantity <= 0) {
              result.textContent = "Quantity must be greater than zero";
              return;
            }

            if (status === "Expired" && expiryDate) {
              const today = new Date();
              const expiry = new Date(expiryDate + "T00:00:00");
              if (expiry < today) {
                result.textContent = "Lot is expired and cannot be available in stock";
                return;
              }
            }

            result.textContent = "Lot saved: " + [lotNumber, product, warehouse, quantity.toFixed(2), expiryDate, status].join(" | ");
          });

          renderCalendar();
        </script>
      </body>
    </html>
  `);

  return {
    lotNumberField: page.locator("#lotNumber"),
    productField: page.locator("#product"),
    warehouseField: page.locator("#warehouse"),
    quantityField: page.locator("#quantity"),
    expiryDateField: page.locator("#expiryDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save lot/i }),
    result: page.locator("#result"),
  };
}

test("loads the lot traceability form", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
  } = await setupLotTraceabilityPage(page);

  await expect(page).toHaveTitle(/Lot Traceability/i);
  await expect(lotNumberField).toBeVisible();
  await expect(productField).toBeVisible();
  await expect(warehouseField).toBeVisible();
  await expect(quantityField).toBeVisible();
  await expect(expiryDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("records a valid lot traceability entry", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
    result,
  } = await setupLotTraceabilityPage(page);

  await lotNumberField.fill("LOT-2026-1001");
  await productField.fill("Organic Almonds");
  await warehouseField.fill("Cold Store A");
  await quantityField.fill("120");
  await expiryDateField.fill("2027-02-15");
  await statusField.selectOption("Available");
  await submitButton.click();

  await expect(result).toHaveText(
    "Lot saved: LOT-2026-1001 | Organic Almonds | Cold Store A | 120.00 | 2027-02-15 | Available",
  );
});

test("requires all lot details before saving", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
  } = await setupLotTraceabilityPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      lotNumberField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      productField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      warehouseField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      quantityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      expiryDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects zero or negative quantities", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
    result,
  } = await setupLotTraceabilityPage(page);

  await lotNumberField.fill("LOT-2026-1010");
  await productField.fill("Dried Fruit");
  await warehouseField.fill("Dry Store");
  await quantityField.fill("0");
  await expiryDateField.fill("2027-01-25");
  await statusField.selectOption("Reserved");
  await submitButton.click();

  await expect(result).toHaveText("Quantity must be greater than zero");
});

test("keeps a pre-filled lot traceability record", async ({ page }) => {
  const {
    lotNumberField,
    productField,
    warehouseField,
    quantityField,
    expiryDateField,
    statusField,
    submitButton,
    result,
  } = await setupLotTraceabilityPage(page, {
    lotNumber: 'LOT-2026-2000 "Bulk"',
    product: "Cocoa Beans",
    warehouse: "Warehouse 7",
    quantity: "55",
    expiryDate: "2026-11-30",
    status: "Quarantined",
  });

  await expect(lotNumberField).toHaveValue('LOT-2026-2000 "Bulk"');
  await expect(productField).toHaveValue("Cocoa Beans");
  await expect(warehouseField).toHaveValue("Warehouse 7");
  await expect(quantityField).toHaveValue("55");
  await expect(expiryDateField).toHaveValue("2026-11-30");
  await expect(statusField).toHaveValue("Quarantined");
  await submitButton.click();

  await expect(result).toContainText('LOT-2026-2000 "Bulk"');
  await expect(result).toContainText("Cocoa Beans");
  await expect(result).toContainText("55.00");
});
