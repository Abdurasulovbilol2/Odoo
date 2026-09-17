const { test, expect } = require("@playwright/test");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function setupContractorPortalPage(page, options = {}) {
  const safeOptions = {
    contractor: escapeHtml(options.contractor),
    project: escapeHtml(options.project),
    phase: escapeHtml(options.phase),
    workDescription: escapeHtml(options.workDescription),
    startDate: escapeHtml(options.startDate),
    endDate: escapeHtml(options.endDate),
    status: escapeHtml(options.status),
  };

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Contractor Portal | Odoo</title>
      </head>
      <body>
        <h1>Contractor Portal</h1>
        <form id="contractorPortalForm">
          <label for="contractor">Contractor *</label>
          <input id="contractor" name="contractor" type="text" value="${safeOptions.contractor || ""}" required />

          <label for="project">Project *</label>
          <input id="project" name="project" type="text" value="${safeOptions.project || ""}" required />

          <label for="phase">Project phase *</label>
          <input id="phase" name="phase" type="text" value="${safeOptions.phase || ""}" required />

          <label for="workDescription">Work description *</label>
          <textarea id="workDescription" name="workDescription" required>${safeOptions.workDescription || ""}</textarea>

          <label for="startDate">Start date *</label>
          <input id="startDate" name="startDate" type="date" value="${safeOptions.startDate || ""}" required />

          <label for="endDate">End date *</label>
          <input id="endDate" name="endDate" type="date" value="${safeOptions.endDate || ""}" required />

          <label for="status">Status *</label>
          <select id="status" name="status" required>
            <option value="">Select status</option>
            <option value="Planned" ${safeOptions.status === "Planned" ? "selected" : ""}>Planned</option>
            <option value="On Site" ${safeOptions.status === "On Site" ? "selected" : ""}>On Site</option>
            <option value="Completed" ${safeOptions.status === "Completed" ? "selected" : ""}>Completed</option>
            <option value="Delayed" ${safeOptions.status === "Delayed" ? "selected" : ""}>Delayed</option>
          </select>

          <button type="submit">Save contractor task</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("contractorPortalForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const contractor = document.getElementById("contractor").value;
            const project = document.getElementById("project").value;
            const phase = document.getElementById("phase").value;
            const workDescription = document.getElementById("workDescription").value;
            const startDate = document.getElementById("startDate").value;
            const endDate = document.getElementById("endDate").value;
            const status = document.getElementById("status").value;
            const result = document.getElementById("result");

            if (startDate && endDate && startDate > endDate) {
              result.textContent = "End date must be on or after start date";
              return;
            }

            result.textContent = "Contractor task saved: " + [contractor, project, phase, workDescription, startDate, endDate, status].join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    contractorField: page.locator("#contractor"),
    projectField: page.locator("#project"),
    phaseField: page.locator("#phase"),
    workDescriptionField: page.locator("#workDescription"),
    startDateField: page.locator("#startDate"),
    endDateField: page.locator("#endDate"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save contractor task/i }),
    result: page.locator("#result"),
  };
}

test("loads the contractor portal form", async ({ page }) => {
  const {
    contractorField,
    projectField,
    phaseField,
    workDescriptionField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
  } = await setupContractorPortalPage(page);

  await expect(page).toHaveTitle(/Contractor Portal/i);
  await expect(contractorField).toBeVisible();
  await expect(projectField).toBeVisible();
  await expect(phaseField).toBeVisible();
  await expect(workDescriptionField).toBeVisible();
  await expect(startDateField).toBeVisible();
  await expect(endDateField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("saves a valid contractor task", async ({ page }) => {
  const {
    contractorField,
    projectField,
    phaseField,
    workDescriptionField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
    result,
  } = await setupContractorPortalPage(page);

  await contractorField.fill("BuildCore Ltd");
  await projectField.fill("Metro Expansion");
  await phaseField.fill("Foundation Works");
  await workDescriptionField.fill(
    "Reinforcement and finishing for slab support",
  );
  await startDateField.fill("2026-09-18");
  await endDateField.fill("2026-09-22");
  await statusField.selectOption("On Site");
  await submitButton.click();

  await expect(result).toHaveText(
    "Contractor task saved: BuildCore Ltd | Metro Expansion | Foundation Works | Reinforcement and finishing for slab support | 2026-09-18 | 2026-09-22 | On Site",
  );
});

test("requires contractor task details before saving", async ({ page }) => {
  const {
    contractorField,
    projectField,
    phaseField,
    workDescriptionField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
  } = await setupContractorPortalPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      contractorField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      projectField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      phaseField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      workDescriptionField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      startDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      endDateField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a contractor task that ends before it starts", async ({
  page,
}) => {
  const {
    contractorField,
    projectField,
    phaseField,
    workDescriptionField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
    result,
  } = await setupContractorPortalPage(page);

  await contractorField.fill("SkyBuild Co");
  await projectField.fill("Bridge Repair");
  await phaseField.fill("Inspection");
  await workDescriptionField.fill("Concrete check and crack sealing");
  await startDateField.fill("2026-09-26");
  await endDateField.fill("2026-09-25");
  await statusField.selectOption("Delayed");
  await submitButton.click();

  await expect(result).toHaveText("End date must be on or after start date");
});

test("keeps a pre-filled contractor task", async ({ page }) => {
  const {
    contractorField,
    projectField,
    phaseField,
    workDescriptionField,
    startDateField,
    endDateField,
    statusField,
    submitButton,
    result,
  } = await setupContractorPortalPage(page, {
    contractor: "NorthStone Group",
    project: "Waterline Upgrade",
    phase: "Pipe Installation",
    workDescription: 'Valve replacement for section "C"',
    startDate: "2026-09-27",
    endDate: "2026-09-30",
    status: "Completed",
  });

  await expect(contractorField).toHaveValue("NorthStone Group");
  await expect(projectField).toHaveValue("Waterline Upgrade");
  await expect(phaseField).toHaveValue("Pipe Installation");
  await expect(workDescriptionField).toHaveValue(
    'Valve replacement for section "C"',
  );
  await expect(startDateField).toHaveValue("2026-09-27");
  await expect(endDateField).toHaveValue("2026-09-30");
  await expect(statusField).toHaveValue("Completed");
  await submitButton.click();

  await expect(result).toContainText("NorthStone Group");
  await expect(result).toContainText("Waterline Upgrade");
  await expect(result).toContainText("Completed");
});
