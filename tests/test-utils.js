/**
 * Test Utilities and Helpers
 * Shared functions for test data generation and common operations
 */

/**
 * Generate random email for unique test data
 */
function generateTestEmail(prefix = "testuser") {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}@test.example.com`;
}

/**
 * Generate random username
 */
function generateTestUsername(prefix = "user") {
  const random = Math.floor(Math.random() * 100000);
  return `${prefix}-${random}`;
}

/**
 * Generate random phone number
 */
function generateTestPhone() {
  const area = String(Math.floor(Math.random() * 900) + 100);
  const exchange = String(Math.floor(Math.random() * 900) + 100);
  const line = String(Math.floor(Math.random() * 9000) + 1000);
  return `+1${area}${exchange}${line}`;
}

/**
 * Generate test data set
 */
function generateTestData() {
  return {
    name: generateTestUsername("TestUser"),
    email: generateTestEmail(),
    phone: generateTestPhone(),
    password: `Pass${Date.now()}`, // Ensure strong password
  };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^.\s@]+\.[^\s@]+$/;
  // Additional checks
  if (!email || email.length === 0) return false;
  if (email.startsWith("@") || email.endsWith("@")) return false;
  if (email.includes("@.") || email.includes(".@")) return false;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 */
function isValidPhone(phone) {
  const phoneRegex = /^\+?[1-9]\d{9,14}$/; // E.164 format - at least 10 digits after country code
  return phoneRegex.test(phone);
}

/**
 * Validate password strength
 * Requires: at least 8 chars, uppercase, lowercase, number
 */
function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Wait for element with timeout
 */
async function waitForElement(page, selector, timeout = 30000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retry a function multiple times
 */
async function retry(fn, maxAttempts = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Fill form fields with data object
 */
async function fillFormFields(page, fieldsMap) {
  for (const [selector, value] of Object.entries(fieldsMap)) {
    const field = page.locator(selector).first();
    await field.fill(value);
  }
}

/**
 * Get form field values as object
 */
async function getFormFieldValues(page, selectors) {
  const values = {};
  for (const [key, selector] of Object.entries(selectors)) {
    const field = page.locator(selector).first();
    values[key] = await field.inputValue();
  }
  return values;
}

/**
 * Check if element is visible and enabled
 */
async function isElementActive(page, selector) {
  const element = page.locator(selector).first();
  return (await element.isVisible()) && (await element.isEnabled());
}

/**
 * Take screenshot with timestamp
 */
async function takeScreenshotWithTimestamp(page, name = "screenshot") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${name}-${timestamp}.png`;
  await page.screenshot({ path: `./test-results/${filename}` });
  return filename;
}

/**
 * Simulate network conditions
 */
async function setNetworkConditions(page, condition = "slow-4g") {
  const conditions = {
    "slow-4g": {
      downloadThroughput: (50 * 1000) / 8,
      uploadThroughput: (20 * 1000) / 8,
      latency: 400,
    },
    "4g": {
      downloadThroughput: (4 * 1000 * 1000) / 8,
      uploadThroughput: (3 * 1000 * 1000) / 8,
      latency: 50,
    },
    wifi: {
      downloadThroughput: (30 * 1000 * 1000) / 8,
      uploadThroughput: (15 * 1000 * 1000) / 8,
      latency: 2,
    },
  };

  const config = conditions[condition] || conditions["4g"];
  await page.route("**/*", (route) => {
    route.continue();
  });
  return config;
}

/**
 * Create test context with common settings
 */
function createTestContext(browser, options = {}) {
  return {
    locale: options.locale || "en-US",
    timezone: options.timezone || "UTC",
    viewport: options.viewport || { width: 1280, height: 720 },
    ...options,
  };
}

module.exports = {
  generateTestEmail,
  generateTestUsername,
  generateTestPhone,
  generateTestData,
  isValidEmail,
  isValidPhone,
  isStrongPassword,
  waitForElement,
  retry,
  fillFormFields,
  getFormFieldValues,
  isElementActive,
  takeScreenshotWithTimestamp,
  setNetworkConditions,
  createTestContext,
};
