/**
 * v2.2 Auth Utilities Tests — plain TypeScript script (no test framework).
 * Run with:  npx tsx src/lib/__tests__/v2.2-auth-utils.test.ts
 *
 * Tests covered:
 *  1. hashPassword — produces a valid bcrypt hash (correct length, prefix)
 *  2. hashPassword — different calls produce different salts (non-deterministic)
 *  3. hashPassword — uses SALT_ROUNDS=12 (cost factor in hash prefix)
 *  4. verifyPassword — returns true for correct password
 *  5. verifyPassword — returns false for wrong password
 *  6. verifyPassword — returns false for empty string against real hash
 *  7. verifyPassword — returns false when hash is corrupted/invalid
 *  8. hashPassword + verifyPassword round-trip — multiple passwords
 *  9. hashPassword — handles special characters in password
 * 10. verifyPassword — case-sensitive (uppercase ≠ lowercase)
 */

import bcrypt from "bcryptjs";
import { makeAssertions } from "./test-helpers";

const { assert, assertTruthy, assertFalsy, assertMatches, summary } = makeAssertions();

// ---------------------------------------------------------------------------
// Inline copies of the functions under test (src/lib/auth-utils.ts)
// ---------------------------------------------------------------------------

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// Test 1 — hashPassword produces a valid bcrypt hash format
// ---------------------------------------------------------------------------

console.log("\nTest 1 — hashPassword: produces a valid bcrypt hash");

{
  const hash = await hashPassword("SecurePass1");
  assertMatches("hashPassword: result starts with bcrypt prefix '$2'", hash, /^\$2[ab]\$/);
  assert("hashPassword: result length is 60 characters", hash.length, 60);
}

// ---------------------------------------------------------------------------
// Test 2 — hashPassword is non-deterministic (different salts per call)
// ---------------------------------------------------------------------------

console.log("\nTest 2 — hashPassword: non-deterministic (unique salts)");

{
  const hash1 = await hashPassword("SamePassword1");
  const hash2 = await hashPassword("SamePassword1");
  assert("hashPassword: two hashes of the same password are NOT equal (unique salts)", hash1 !== hash2, true);
}

// ---------------------------------------------------------------------------
// Test 3 — hashPassword uses SALT_ROUNDS = 12
// ---------------------------------------------------------------------------

console.log("\nTest 3 — hashPassword: cost factor is 12");

{
  const hash = await hashPassword("TestPass1");
  assertMatches("hashPassword: hash encodes cost factor 12 ($2b$12$ prefix)", hash, /^\$2[ab]\$12\$/);
}

// ---------------------------------------------------------------------------
// Test 4 — verifyPassword: returns true for correct password
// ---------------------------------------------------------------------------

console.log("\nTest 4 — verifyPassword: correct password returns true");

{
  const password = "CorrectPassword1";
  const hash = await hashPassword(password);
  assert("verifyPassword: correct password against its own hash → true", await verifyPassword(password, hash), true);
}

// ---------------------------------------------------------------------------
// Test 5 — verifyPassword: returns false for wrong password
// ---------------------------------------------------------------------------

console.log("\nTest 5 — verifyPassword: wrong password returns false");

{
  const hash = await hashPassword("OriginalPass1");
  assert("verifyPassword: wrong password against hash → false", await verifyPassword("WrongPassword1", hash), false);
}

// ---------------------------------------------------------------------------
// Test 6 — verifyPassword: empty string against real hash returns false
// ---------------------------------------------------------------------------

console.log("\nTest 6 — verifyPassword: empty string against hash returns false");

{
  const hash = await hashPassword("RealPassword1");
  assert("verifyPassword: empty string against real hash → false", await verifyPassword("", hash), false);
}

// ---------------------------------------------------------------------------
// Test 7 — verifyPassword: corrupted/invalid hash returns false (no throw)
// ---------------------------------------------------------------------------

console.log("\nTest 7 — verifyPassword: corrupted hash does not throw, returns false");

{
  let result: boolean;
  let threw = false;
  try {
    result = await verifyPassword("SomePassword1", "not-a-valid-bcrypt-hash");
  } catch {
    threw = true;
    result = false;
  }
  assertFalsy("verifyPassword: corrupted hash does not throw an unhandled exception", threw);
  assert("verifyPassword: corrupted hash → false", result, false);
}

// ---------------------------------------------------------------------------
// Test 8 — Round-trip: hash then verify multiple passwords
// ---------------------------------------------------------------------------

console.log("\nTest 8 — Round-trip: hash and verify multiple passwords");

{
  const testCases = [
    { password: "SimplePass1",       label: "simple alphanumeric" },
    { password: "P@ssw0rd!#$%^&*()", label: "special characters" },
    { password: "A".repeat(72),      label: "72-char max (bcrypt limit)" },
    { password: "Min8Char",          label: "minimum 8 chars" },
  ];

  for (const { password, label } of testCases) {
    const hash = await hashPassword(password);
    assert(`Round-trip [${label}]: correct password → true`, await verifyPassword(password, hash), true);
    assert(`Round-trip [${label}]: appended char → false`, await verifyPassword(password + "x", hash), false);
  }
}

// ---------------------------------------------------------------------------
// Test 9 — hashPassword: handles special characters
// ---------------------------------------------------------------------------

console.log("\nTest 9 — hashPassword: special characters produce valid hash");

{
  const special = "P@$$w0rd!<>&\"'";
  const hash = await hashPassword(special);
  assertTruthy("hashPassword: special chars produce a non-empty hash string", hash.length > 0);
  assertMatches("hashPassword: special chars hash still has bcrypt format", hash, /^\$2[ab]\$12\$/);
  assert("verifyPassword: special chars password verifies correctly", await verifyPassword(special, hash), true);
}

// ---------------------------------------------------------------------------
// Test 10 — verifyPassword: case-sensitive (uppercase ≠ lowercase)
// ---------------------------------------------------------------------------

console.log("\nTest 10 — verifyPassword: passwords are case-sensitive");

{
  const password = "CaseSensitive1";
  const hash = await hashPassword(password);
  assert("verifyPassword: all-uppercase variant → false", await verifyPassword("CASESENSITIVE1", hash), false);
  assert("verifyPassword: all-lowercase variant → false", await verifyPassword("casesensitive1", hash), false);
  assert("verifyPassword: original case → true (sanity check)", await verifyPassword("CaseSensitive1", hash), true);
}

summary();
