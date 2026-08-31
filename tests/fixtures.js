const { test: baseTest } = require("@playwright/test");

/**
 * Shared test fixtures for Odoo authentication tests
 */

const signupFormHTML = (options = {}) => `
  <!doctype html>
  <html>
    <head>
      <title>Odoo</title>
    </head>
    <body>
      <form id="signupForm">
        <label>Name</label>
        <input name="name" type="text" value="${options.name || ""}" ${options.nameRequired ? "required" : ""} />
        <label>Email</label>
        <input name="login" type="email" value="${options.email || ""}" ${options.emailRequired ? "required" : ""} />
        ${
          options.includePassword
            ? `
          <label>Password</label>
          <input name="password" type="password" value="${options.password || ""}" ${options.passwordRequired ? "required" : ""} />
        `
            : ""
        }
        <button type="submit">Sign up</button>
      </form>
      <div id="result"></div>
      <script>
        const form = document.getElementById('signupForm');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const name = document.querySelector('input[name="name"]').value;
          const email = document.querySelector('input[name="login"]').value;
          ${
            options.includePassword
              ? `
            const password = document.querySelector('input[name="password"]').value;
            if (password && password.length < 6) {
              document.getElementById('result').textContent = 'Password must be at least 6 characters';
              return;
            }
          `
              : ""
          }
          document.getElementById('result').textContent = name + '|' + email${options.includePassword ? " + '|' + password" : ""};
        });
      </script>
    </body>
  </html>
`;

const signinFormHTML = (options = {}) => `
  <!doctype html>
  <html>
    <head>
      <title>Odoo</title>
    </head>
    <body>
      <form id="loginForm">
        <label>Email</label>
        <input name="login" type="email" value="${options.email || ""}" ${options.emailRequired ? "required" : ""} />
        <label>Password</label>
        <input name="password" type="password" value="${options.password || ""}" ${options.passwordRequired ? "required" : ""} />
        <button type="submit">Log in</button>
      </form>
      <div id="result"></div>
      <script>
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const email = document.querySelector('input[name="login"]').value;
          const password = document.querySelector('input[name="password"]').value;
          if (password.length < 6) {
            document.getElementById('result').textContent = 'Password must be at least 6 characters';
            return;
          }
          document.getElementById('result').textContent = email + '|' + password;
        });
      </script>
    </body>
  </html>
`;

/**
 * Helper function to load signup form and get field locators
 */
async function setupSignupForm(page, options = {}) {
  await page.setContent(signupFormHTML(options));
  return {
    nameField: page.locator('input[name="name"]').first(),
    emailField: page
      .locator('input[name="login"], input[type="email"]')
      .first(),
    passwordField: page.locator('input[name="password"]').first(),
    submitButton: page.getByRole("button", { name: /sign up/i }),
    resultDiv: page.locator("#result"),
  };
}

/**
 * Helper function to load signin form and get field locators
 */
async function setupSigninForm(page, options = {}) {
  await page.setContent(signinFormHTML(options));
  return {
    emailField: page
      .locator('input[name="login"], input[type="email"]')
      .first(),
    passwordField: page.locator('input[name="password"]').first(),
    submitButton: page.getByRole("button", { name: /log in/i }),
    resultDiv: page.locator("#result"),
  };
}

/**
 * Navigation form HTML - allows switching between signup and signin views
 */
const navigationFormHTML = `
  <!doctype html>
  <html>
    <head>
      <title>Odoo</title>
    </head>
    <body>
      <div id="signupView">
        <h1>Sign up</h1>
        <a href="#signin">I already have an account</a>
      </div>
      <div id="signinView" hidden>
        <h1>Sign in</h1>
      </div>
      <script>
        document.querySelector('a[href="#signin"]').addEventListener('click', (event) => {
          event.preventDefault();
          document.getElementById('signupView').hidden = true;
          document.getElementById('signinView').hidden = false;
        });
      </script>
    </body>
  </html>
`;

/**
 * Helper function to load navigation form
 */
async function setupNavigationForm(page) {
  await page.setContent(navigationFormHTML);
  return {
    signupView: page.locator("#signupView"),
    signinView: page.locator("#signinView"),
    signInLink: page.getByRole("link", { name: /i already have an account/i }),
  };
}

/**
 * Forgot password form HTML
 */
const forgotPasswordFormHTML = `
  <!doctype html>
  <html>
    <head>
      <title>Odoo</title>
    </head>
    <body>
      <form id="loginForm">
        <label>Email</label>
        <input name="login" type="email" value="" />
        <label>Password</label>
        <input name="password" type="password" value="" />
        <button type="submit">Log in</button>
        <a href="#/reset-password">Forgot password?</a>
      </form>
      <div id="resetContainer" hidden>Reset instructions sent</div>
      <script>
        document.querySelector('a[href="#/reset-password"]').addEventListener('click', (event) => {
          event.preventDefault();
          document.getElementById('resetContainer').hidden = false;
        });
      </script>
    </body>
  </html>
`;

/**
 * Helper function to load forgot password form
 */
async function setupForgotPasswordForm(page) {
  await page.setContent(forgotPasswordFormHTML);
  return {
    resetLink: page.getByRole("link", { name: /forgot password\?/i }),
    resetContainer: page.locator("#resetContainer"),
  };
}

/**
 * Account details form HTML
 */
const accountDetailsFormHTML = (options = {}) => `
  <!doctype html>
  <html>
    <head>
      <title>Account Details | Odoo</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: bold; margin-bottom: 5px; }
        input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
        .save-btn { background-color: #6c5b7f; color: white; border: none; border-radius: 4px; }
        .result { margin-top: 20px; padding: 10px; display: none; background-color: #d4edda; color: #155724; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>Account Details</h1>
      <form id="accountDetailsForm">
        <div class="form-group">
          <label for="name">Your name *</label>
          <input id="name" name="name" type="text" value="${options.name || ""}" required />
        </div>
        <div class="form-group">
          <label for="email">Email *</label>
          <input id="email" name="email" type="email" value="${options.email || ""}" required />
        </div>
        <div class="form-group">
          <label for="phone">Phone *</label>
          <input id="phone" name="phone" type="tel" value="${options.phone || ""}" required />
        </div>
        <button type="submit" class="save-btn">Save</button>
      </form>
      <div id="result" class="result"></div>
      <script>
        const form = document.getElementById('accountDetailsForm');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const name = document.getElementById('name').value;
          const email = document.getElementById('email').value;
          const phone = document.getElementById('phone').value;
          
          const resultDiv = document.getElementById('result');
          resultDiv.textContent = 'Account details saved: ' + name + ' | ' + email + ' | ' + phone;
          resultDiv.style.display = 'block';
        });
      </script>
    </body>
  </html>
`;

/**
 * Helper function to load account details form
 */
async function setupAccountDetailsForm(page, options = {}) {
  await page.setContent(accountDetailsFormHTML(options));
  return {
    nameField: page.locator("#name"),
    emailField: page.locator("#email"),
    phoneField: page.locator("#phone"),
    submitButton: page.getByRole("button", { name: /save/i }),
    resultDiv: page.locator("#result"),
  };
}

/**
 * Test fixture with pre-configured forms
 */
const test = baseTest.extend({
  signupForm: async ({ page }, use) => {
    const forms = await setupSignupForm(page);
    await use(forms);
  },
  signinForm: async ({ page }, use) => {
    const forms = await setupSigninForm(page);
    await use(forms);
  },
});

module.exports = {
  test,
  signupFormHTML,
  signinFormHTML,
  navigationFormHTML,
  forgotPasswordFormHTML,
  accountDetailsFormHTML,
  setupSignupForm,
  setupSigninForm,
  setupNavigationForm,
  setupForgotPasswordForm,
  setupAccountDetailsForm,
};
