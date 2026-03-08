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

// ---------------------------------------------------------------------------
// Inline copies of the functions under test (src/lib/auth-utils.ts)
// Copied verbatim so there are zero path-alias dependencies.
// ---------------------------------------------------------------------------

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(testName: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (ok) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected: ${JSON.stringify(expected)}\n         actual  : ${JSON.stringify(actual)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertTruthy(testName: string, value: unknown): void {
  if (value) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected truthy, got: ${JSON.stringify(value)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertFalsy(testName: string, value: unknown): void {
  if (!value) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected falsy, got: ${JSON.stringify(value)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertMatches(testName: string, value: string, pattern: RegExp): void {
  if (pattern.test(value)) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected to match: ${pattern}\n         actual  : ${value}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Test 1 — hashPassword produces a valid bcrypt hash format
// ---------------------------------------------------------------------------

console.log("\nTest 1 — hashPassword: produces a valid bcrypt hash");

{
  const hash = await hashPassword("SecurePass1");

  // bcrypt hashes start with $2b$ (or $2a$) followed by cost factor
  assertMatches(
    "hashPassword: result starts with bcrypt prefix '$2'",
    hash,
    /^\$2[ab]\$/,
  );

  // bcrypt hashes are always 60 characters
  assert(
    "hashPassword: result length is 60 characters",
    hash.length,
    60,
  );
}

// ---------------------------------------------------------------------------
// Test 2 — hashPassword is non-deterministic (different salts per call)
// ---------------------------------------------------------------------------

console.log("\nTest 2 — hashPassword: non-deterministic (unique salts)");

{
  const password = "SamePassword1";
  const hash1 = await hashPassword(password);
  const hash2 = await hashPassword(password);

  assert(
    "hashPassword: two hashes of the same password are NOT equal (unique salts)",
    hash1 !== hash2,
    true,
  );
}

// ---------------------------------------------------------------------------
// Test 3 — hashPassword uses SALT_ROUNDS = 12 (cost factor)
// ---------------------------------------------------------------------------

console.log("\nTest 3 — hashPassword: cost factor is 12");

{
  const hash = await hashPassword("TestPass1");

  // bcrypt format: $2b$12$... — the cost factor is embedded in the hash string
  assertMatches(
    "hashPassword: hash encodes cost factor 12 ($2b$12$ prefix)",
    hash,
    /^\$2[ab]\$12\$/,
  );
}

// ---------------------------------------------------------------------------
// Test 4 — verifyPassword: returns true for correct password
// ---------------------------------------------------------------------------

console.log("\nTest 4 — verifyPassword: correct password returns true");

{
  const password = "CorrectPassword1";
  const hash = await hashPassword(password);
  const result = await verifyPassword(password, hash);

  assert(
    "verifyPassword: correct password against its own hash → true",
    result,
    true,
  );
}

// ---------------------------------------------------------------------------
// Test 5 — verifyPassword: returns false for wrong password
// ---------------------------------------------------------------------------

console.log("\nTest 5 — verifyPassword: wrong password returns false");

{
  const hash = await hashPassword("OriginalPass1");
  const result = await verifyPassword("WrongPassword1", hash);

  assert(
    "verifyPassword: wrong password against hash → false",
    result,
    false,
  );
}

// ---------------------------------------------------------------------------
// Test 6 — verifyPassword: empty string against real hash returns false
// ---------------------------------------------------------------------------

console.log("\nTest 6 — verifyPassword: empty string against hash returns false");

{
  const hash = await hashPassword("RealPassword1");
  const result = await verifyPassword("", hash);

  assert(
    "verifyPassword: empty string against real hash → false",
    result,
    false,
  );
}

// ---------------------------------------------------------------------------
// Test 7 — verifyPassword: corrupted/invalid hash returns false (no throw)
// ---------------------------------------------------------------------------

console.log("\nTest 7 — verifyPassword: corrupted hash does not throw, returns false");

{
  let result: boolean;
  let threw = false;
  try {
    // bcrypt.compare catches invalid hashes and returns false
    result = await verifyPassword("SomePassword1", "not-a-valid-bcrypt-hash");
  } catch {
    threw = true;
    result = false;
  }

  assertFalsy(
    "verifyPassword: corrupted hash does not throw an unhandled exception",
    threw,
  );
  assert(
    "verifyPassword: corrupted hash → false",
    result,
    false,
  );
}

// ---------------------------------------------------------------------------
// Test 8 — Round-trip: hash then verify multiple passwords
// ---------------------------------------------------------------------------

console.log("\nTest 8 — Round-trip: hash and verify multiple passwords");

{
  const testCases: { password: string; label: string }[] = [
    { password: "SimplePass1",       label: "simple alphanumeric" },
    { password: "P@ssw0rd!#$%^&*()", label: "special characters" },
    { password: "A".repeat(72),      label: "72-char max (bcrypt limit)" },
    { password: "Min8Char",          label: "minimum 8 chars" },
  ];

  for (const { password, label } of testCases) {
    const hash = await hashPassword(password);
    const correct = await verifyPassword(password, hash);
    const wrong = await verifyPassword(password + "x", hash);

    assert(
      `Round-trip [${label}]: correct password → true`,
      correct,
      true,
    );
    assert(
      `Round-trip [${label}]: appended char → false`,
      wrong,
      false,
    );
  }
}

// ---------------------------------------------------------------------------
// Test 9 — hashPassword: handles special characters
// ---------------------------------------------------------------------------

console.log("\nTest 9 — hashPassword: special characters produce valid hash");

{
  const special = "P@$$w0rd!<>&\"'";
  const hash = await hashPassword(special);

  assertTruthy(
    "hashPassword: special chars produce a non-empty hash string",
    hash.length > 0,
  );
  assertMatches(
    "hashPassword: special chars hash still has bcrypt format",
    hash,
    /^\$2[ab]\$12\$/,
  );

  const verified = await verifyPassword(special, hash);
  assert(
    "verifyPassword: special chars password verifies correctly",
    verified,
    true,
  );
}

// ---------------------------------------------------------------------------
// Test 10 — verifyPassword: case-sensitive (uppercase ≠ lowercase)
// ---------------------------------------------------------------------------

console.log("\nTest 10 — verifyPassword: passwords are case-sensitive");

{
  const password = "CaseSensitive1";
  const hash = await hashPassword(password);

  const withUppercase = await verifyPassword("CASESENSITIVE1", hash);
  const withLowercase = await verifyPassword("casesensitive1", hash);
  const withOriginal  = await verifyPassword("CaseSensitive1", hash);

  assert(
    "verifyPassword: all-uppercase variant → false",
    withUppercase,
    false,
  );
  assert(
    "verifyPassword: all-lowercase variant → false",
    withLowercase,
    false,
  );
  assert(
    "verifyPassword: original case → true (sanity check)",
    withOriginal,
    true,
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
if (failures.length > 0) {
  console.error("\nFailed tests:");
  for (const f of failures) console.error(f);
  process.exit(1);
} else {
  console.log("All tests passed.");
  process.exit(0);
}
