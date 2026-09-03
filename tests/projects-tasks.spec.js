const { test, expect } = require("@playwright/test");

async function setupProjectsPage(page, options = {}) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Projects and Tasks | Odoo</title></head>
      <body>
        <h1>Projects and Tasks</h1>
        <form id="taskForm">
          <label for="project">Project *</label>
          <input id="project" name="project" type="text" value="${options.project || ""}" required />
          <label for="task">Task name *</label>
          <input id="task" name="task" type="text" value="${options.task || ""}" required />
          <label for="assignee">Assignee *</label>
          <input id="assignee" name="assignee" type="text" value="${options.assignee || ""}" required />
          <label for="priority">Priority *</label>
          <select id="priority" name="priority" required>
            <option value="">Select a priority</option>
            <option value="low" ${options.priority === "low" ? "selected" : ""}>Low</option>
            <option value="normal" ${options.priority === "normal" ? "selected" : ""}>Normal</option>
            <option value="high" ${options.priority === "high" ? "selected" : ""}>High</option>
          </select>
          <label for="status">Task status *</label>
          <select id="status" name="status" required>
            <option value="">Select a status</option>
            <option value="todo" ${options.status === "todo" ? "selected" : ""}>To do</option>
            <option value="progress" ${options.status === "progress" ? "selected" : ""}>In progress</option>
            <option value="done" ${options.status === "done" ? "selected" : ""}>Done</option>
          </select>
          <button type="submit">Save task</button>
        </form>
        <div id="result" role="status"></div>
        <script>
          document.getElementById("taskForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const values = ["project", "task", "assignee", "priority", "status"]
              .map((field) => document.getElementById(field).value)
              .join(" | ");
            document.getElementById("result").textContent = "Task saved: " + values;
          });
        </script>
      </body>
    </html>
  `);

  return {
    projectField: page.locator("#project"),
    taskField: page.locator("#task"),
    assigneeField: page.locator("#assignee"),
    priorityField: page.locator("#priority"),
    statusField: page.locator("#status"),
    submitButton: page.getByRole("button", { name: /save task/i }),
    result: page.locator("#result"),
  };
}

test("loads the projects and tasks form", async ({ page }) => {
  const {
    projectField,
    taskField,
    assigneeField,
    priorityField,
    statusField,
    submitButton,
  } = await setupProjectsPage(page);

  await expect(page).toHaveTitle(/Projects and Tasks/i);
  await expect(projectField).toBeVisible();
  await expect(taskField).toBeVisible();
  await expect(assigneeField).toBeVisible();
  await expect(priorityField).toBeVisible();
  await expect(statusField).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test("creates a high-priority project task", async ({ page }) => {
  const {
    projectField,
    taskField,
    assigneeField,
    priorityField,
    statusField,
    submitButton,
    result,
  } = await setupProjectsPage(page);

  await projectField.fill("Website redesign");
  await taskField.fill("Approve homepage mockups");
  await assigneeField.fill("Jane Smith");
  await priorityField.selectOption("high");
  await statusField.selectOption("todo");
  await submitButton.click();

  await expect(result).toHaveText(
    "Task saved: Website redesign | Approve homepage mockups | Jane Smith | high | todo",
  );
});

test("requires project, task, assignee, priority, and status", async ({
  page,
}) => {
  const {
    projectField,
    taskField,
    assigneeField,
    priorityField,
    statusField,
    submitButton,
  } = await setupProjectsPage(page);

  await submitButton.click();

  await expect
    .poll(async () =>
      projectField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      taskField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      assigneeField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      priorityField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
  await expect
    .poll(async () =>
      statusField.evaluate((element) => element.validity.valueMissing),
    )
    .toBeTruthy();
});

test("updates a task priority", async ({ page }) => {
  const { taskField, priorityField, submitButton, result } =
    await setupProjectsPage(page, {
      project: "Website redesign",
      task: "Approve homepage mockups",
      assignee: "Jane Smith",
      priority: "normal",
      status: "progress",
    });

  await expect(priorityField).toHaveValue("normal");
  await priorityField.selectOption("high");
  await submitButton.click();

  await expect(result).toContainText("Approve homepage mockups");
  await expect(result).toContainText("high");
});

test("marks an in-progress task as done", async ({ page }) => {
  const { taskField, statusField, submitButton, result } =
    await setupProjectsPage(page, {
      project: "Website redesign",
      task: "Implement responsive layout",
      assignee: "Jane Smith",
      priority: "normal",
      status: "progress",
    });

  await expect(statusField).toHaveValue("progress");
  await statusField.selectOption("done");
  await submitButton.click();

  await expect(result).toContainText("Implement responsive layout");
  await expect(result).toContainText("done");
  await expect(taskField).toHaveValue("Implement responsive layout");
});
