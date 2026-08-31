const { test, expect } = require("@playwright/test");
const {
  generateTestData,
  isValidEmail,
  isValidPhone,
  isStrongPassword,
  generateTestEmail,
  generateTestPhone,
} = require("./test-utils");

/**
 * Validation Tests
 * Tests data validation logic for auth flows
 */

test("validate email format function", async () => {
  expect(isValidEmail("user@example.com")).toBeTruthy();
  expect(isValidEmail("john.doe@company.co.uk")).toBeTruthy();
  expect(isValidEmail("invalid-email")).toBeFalsy();
  expect(isValidEmail("@example.com")).toBeFalsy();
  expect(isValidEmail("user@.com")).toBeFalsy();
  expect(isValidEmail("")).toBeFalsy();
});

test("validate phone format function", async () => {
  expect(isValidPhone("+12125551234")).toBeTruthy();
  expect(isValidPhone("+443301234567")).toBeTruthy();
  expect(isValidPhone("12125551234")).toBeTruthy();
  expect(isValidPhone("invalid-phone")).toBeFalsy();
  expect(isValidPhone("123")).toBeFalsy();
  expect(isValidPhone("")).toBeFalsy();
});

test("validate password strength function", async () => {
  expect(isStrongPassword("WeakPass1")).toBeTruthy();
  expect(isStrongPassword("Pass1")).toBeFalsy(); // Too short
  expect(isStrongPassword("weakpass1")).toBeFalsy(); // No uppercase
  expect(isStrongPassword("WEAKPASS1")).toBeFalsy(); // No lowercase
  expect(isStrongPassword("WeakPass")).toBeFalsy(); // No number
});

test("generate unique test data", async () => {
  const data1 = generateTestData();
  const data2 = generateTestData();

  // Verify structure
  expect(data1).toHaveProperty("name");
  expect(data1).toHaveProperty("email");
  expect(data1).toHaveProperty("phone");
  expect(data1).toHaveProperty("password");

  // Verify uniqueness
  expect(data1.email).not.toBe(data2.email);
  expect(data1.phone).not.toBe(data2.phone);

  // Verify format
  expect(isValidEmail(data1.email)).toBeTruthy();
  expect(isValidPhone(data1.phone)).toBeTruthy();
  expect(isStrongPassword(data1.password)).toBeTruthy();
});

test("generate consistent test emails", async () => {
  const email1 = generateTestEmail("signup");
  const email2 = generateTestEmail("signup");

  expect(email1).toContain("signup");
  expect(email2).toContain("signup");
  expect(email1).not.toBe(email2); // Should be unique
  expect(isValidEmail(email1)).toBeTruthy();
  expect(isValidEmail(email2)).toBeTruthy();
});

test("generate valid test phone numbers", async () => {
  const phones = Array.from({ length: 5 }, () => generateTestPhone());

  phones.forEach((phone) => {
    expect(isValidPhone(phone)).toBeTruthy();
    expect(phone).toMatch(/^\+1\d{10}$/); // E.164 format for US
  });

  // Verify uniqueness
  const uniquePhones = new Set(phones);
  expect(uniquePhones.size).toBe(5);
});

test("handle edge case emails", async () => {
  const edgeCases = [
    { email: "a@b.co", valid: true },
    { email: "user+tag@example.com", valid: true },
    { email: "user name@example.com", valid: false },
    { email: "user@example@example.com", valid: false },
    { email: "user@example.c", valid: true }, // Technically valid
    { email: "user@.example.com", valid: false },
    { email: "@example.com", valid: false },
  ];

  edgeCases.forEach(({ email, valid }) => {
    expect(isValidEmail(email)).toBe(valid);
  });
});

test("validate international phone numbers", async () => {
  const internationalPhones = [
    { phone: "+442071234567", valid: true }, // UK
    { phone: "+33123456789", valid: true }, // France
    { phone: "+919876543210", valid: true }, // India
    { phone: "+8613800000000", valid: true }, // China
    { phone: "invalid", valid: false },
    { phone: "+0123456789", valid: false }, // Invalid leading 0
  ];

  internationalPhones.forEach(({ phone, valid }) => {
    expect(isValidPhone(phone)).toBe(valid);
  });
});

test("password strength validation edge cases", async () => {
  const passwords = [
    { password: "Pass123!@#", strong: true },
    { password: "Pass1234", strong: true }, // 8 chars minimum
    { password: "pass123", strong: false }, // No uppercase
    { password: "PASS123", strong: false }, // No lowercase
    { password: "PassABC", strong: false }, // No number
    { password: "P1", strong: false }, // Too short
    { password: "Password123456", strong: true },
  ];

  passwords.forEach(({ password, strong }) => {
    expect(isStrongPassword(password)).toBe(strong);
  });
});
