const { test, expect } = require("@playwright/test");

async function setupRecruitmentPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <title>Recruitment | Odoo</title>
      </head>
      <body>
        <h1>Recruitment</h1>
        <form id="jobForm">
          <label for="jobTitle">Job title *</label>
          <input id="jobTitle" name="jobTitle" type="text" value="${options.jobTitle || ""}" required />

          <label for="department">Department *</label>
          <input id="department" name="department" type="text" value="${options.department || ""}" required />

          <label for="recruiter">Recruiter *</label>
          <input id="recruiter" name="recruiter" type="text" value="${options.recruiter || ""}" required />

          <label for="positions">Open positions *</label>
          <input id="positions" name="positions" type="number" min="1" value="${options.positions || ""}" required />

          <label for="location">Work location</label>
          <input id="location" name="location" type="text" value="${options.location || ""}" />

          <button type="submit">Publish job</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("jobForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = [
              document.getElementById("jobTitle").value,
              document.getElementById("department").value,
              document.getElementById("recruiter").value,
              document.getElementById("positions").value,
              document.getElementById("location").value,
            ];
            document.getElementById("result").textContent = "Job opening saved: " + values.join(" | ");
          });
        </script>
      </body>
    </html>
  `);

  return {
    jobTitleField: page.locator("#jobTitle"),
    departmentField: page.locator("#department"),
    recruiterField: page.locator("#recruiter"),
    positionsField: page.locator("#positions"),
    locationField: page.locator("#location"),
    submitButton: page.getByRole("button", { name: /publish job/i }),
    result: page.locator("#result"),
  };
}

test("loads the recruitment job form", async ({ page }) => {
  const {
    jobTitleField,
    departmentField,
    recruiterField,
    positionsField,
    locationField,
    submitButton,
  } = await setupRecruitmentPage(page);

  await expect(page).toHaveTitle(/Recruitment/i);
  await expect(jobTitleField).toBeVisible();
  await expect(departmentField).toBeVisible();
  await expect(recruiterField).toBeVisible();
  await expect(positionsField).toBeVisible();
  await expect(locationField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a new recruitment opening", async ({ page }) => {
  const {
    jobTitleField,
    departmentField,
    recruiterField,
    positionsField,
    locationField,
    submitButton,
    result,
  } = await setupRecruitmentPage(page);

  await jobTitleField.fill("Senior Accountant");
  await departmentField.fill("Finance");
  await recruiterField.fill("hr.manager@odoo.com");
  await positionsField.fill("2");
  await locationField.fill("Remote");
  await submitButton.click();

  await expect(result).toHaveText(
    "Job opening saved: Senior Accountant | Finance | hr.manager@odoo.com | 2 | Remote",
  );
});

test("requires job details and positions", async ({ page }) => {
  const {
    jobTitleField,
    departmentField,
    recruiterField,
    positionsField,
    submitButton,
  } = await setupRecruitmentPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      jobTitleField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      departmentField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      recruiterField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      positionsField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("rejects a zero open position count", async ({ page }) => {
  const {
    jobTitleField,
    departmentField,
    recruiterField,
    positionsField,
    submitButton,
  } = await setupRecruitmentPage(page, {
    jobTitle: "Project Manager",
    department: "Operations",
    recruiter: "talent@odoo.com",
    positions: "0",
  });

  await jobTitleField.fill("Project Manager");
  await departmentField.fill("Operations");
  await recruiterField.fill("talent@odoo.com");
  await positionsField.fill("0");
  await submitButton.click();

  await expect
    .poll(async () =>
      positionsField.evaluate((element) => element.validity.rangeUnderflow),
    )
    .toBeTruthy();
});

test("updates an existing recruitment opening", async ({ page }) => {
  const {
    jobTitleField,
    departmentField,
    recruiterField,
    positionsField,
    locationField,
    submitButton,
    result,
  } = await setupRecruitmentPage(page, {
    jobTitle: "Operations Analyst",
    department: "Operations",
    recruiter: "hiring@odoo.com",
    positions: "3",
    location: "Berlin",
  });

  await expect(jobTitleField).toHaveValue("Operations Analyst");
  await expect(departmentField).toHaveValue("Operations");
  await expect(recruiterField).toHaveValue("hiring@odoo.com");
  await expect(positionsField).toHaveValue("3");
  await expect(locationField).toHaveValue("Berlin");
  await submitButton.click();

  await expect(result).toContainText("Operations Analyst");
  await expect(result).toContainText("Operations");
  await expect(result).toContainText("3");
  await expect(result).toContainText("Berlin");
});
