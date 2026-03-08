/**
 * v2.2 Registration Route Tests — plain TypeScript script (no test framework).
 * Run with:  npx tsx src/lib/__tests__/v2.2-register-route.test.ts
 *
 * Tests covered:
 *  1. Happy path — valid payload → 201 { success: true }
 *  2. Missing name — 400 validation error
 *  3. Missing email — 400 validation error
 *  4. Invalid email format — 400 validation error
 *  5. Missing password — 400 validation error
 *  6. Password too short (< 8 chars) — 400 validation error
 *  7. Password missing uppercase — 400 validation error
 *  8. Password missing lowercase — 400 validation error
 *  9. Password missing digit — 400 validation error
 * 10. Duplicate email — 409 conflict
 * 11. Name too long (> 100 chars) — 400 validation error
 * 12. User document stored with correct fields (no plaintext password)
 * 13. User document: mfaEnabled defaults to false
 * 14. User document: defaultUnitSystem defaults to "us"
 * 15. User document: preferredServings defaults to null
 * 16. Malformed JSON body — 500 (generic error from JSON parse failure)
 */

import bcrypt from "bcryptjs";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Inline re-implementation of the registration route logic
// (src/app/api/auth/register/route.ts)
// The DB and hashPassword calls are swapped for simple in-memory mocks so
// the tests run without a live MongoDB connection.
// ---------------------------------------------------------------------------

// Mirrors the Zod schema used in the real route
const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

// Minimal mock response shape to mirror NextResponse.json()
type MockResponse = {
  status: number;
  body: unknown;
};

function jsonResponse(body: unknown, status = 200): MockResponse {
  return { status, body };
}

// Minimal request shape
type MockBody = Record<string, unknown> | string;

// In-memory user store
type StoredUser = {
  name: string;
  email: string;
  password: string;
  emailVerified: Date;
  mfaEnabled: boolean;
  defaultUnitSystem: string;
  preferredServings: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Simulated registration handler — mirrors the logic in the real POST handler
async function registerHandler(
  rawBody: MockBody,
  dbUsers: StoredUser[],
): Promise<MockResponse> {
  try {
    let body: unknown;
    if (typeof rawBody === "string") {
      body = JSON.parse(rawBody); // may throw for malformed JSON
    } else {
      body = rawBody;
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: parsed.error.issues[0].message },
        400,
      );
    }

    const { name, email, password } = parsed.data;

    // Check for duplicate
    const existing = dbUsers.find((u) => u.email === email);
    if (existing) {
      return jsonResponse(
        { error: "An account with that email already exists." },
        409,
      );
    }

    // Hash the password (uses actual bcrypt for realistic coverage)
    const passwordHash = await bcrypt.hash(password, 10); // lower rounds for speed
    const now = new Date();

    dbUsers.push({
      name,
      email,
      password: passwordHash,
      emailVerified: now,
      mfaEnabled: false,
      defaultUnitSystem: "us",
      preferredServings: null,
      createdAt: now,
      updatedAt: now,
    });

    return jsonResponse({ success: true }, 201);
  } catch {
    return jsonResponse(
      { error: "Something went wrong. Please try again." },
      500,
    );
  }
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

function assertContains(testName: string, source: string, needle: string): void {
  if (source.includes(needle)) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected source to contain: ${JSON.stringify(needle)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(__dirname, "../../..");
function readSource(relPath: string): string {
  return readFileSync(resolve(PROJECT_ROOT, relPath), "utf8");
}

// ---------------------------------------------------------------------------
// Test 1 — Happy path: valid payload → 201 success
// ---------------------------------------------------------------------------

console.log("\nTest 1 — Happy path: valid registration payload → 201");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { name: "Jane Doe", email: "jane@example.com", password: "SecurePass1" },
    db,
  );

  assert("Happy path: status is 201", res.status, 201);
  assert(
    "Happy path: body.success is true",
    (res.body as Record<string, unknown>).success,
    true,
  );
  assert("Happy path: user stored in DB", db.length, 1);
  assert("Happy path: stored email matches input", db[0].email, "jane@example.com");
  assert("Happy path: stored name matches input", db[0].name, "Jane Doe");
}

// ---------------------------------------------------------------------------
// Test 2 — Missing name → 400
// ---------------------------------------------------------------------------

console.log("\nTest 2 — Missing name → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { email: "noname@example.com", password: "SecurePass1" },
    db,
  );

  assert("Missing name: status is 400", res.status, 400);
  assertTruthy(
    "Missing name: body.error is a non-empty string",
    typeof (res.body as Record<string, unknown>).error === "string" &&
    ((res.body as Record<string, unknown>).error as string).length > 0,
  );
  assert("Missing name: no user stored in DB", db.length, 0);
}

// ---------------------------------------------------------------------------
// Test 3 — Missing email → 400
// ---------------------------------------------------------------------------

console.log("\nTest 3 — Missing email → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { name: "NoEmail", password: "SecurePass1" },
    db,
  );

  assert("Missing email: status is 400", res.status, 400);
}

// ---------------------------------------------------------------------------
// Test 4 — Invalid email format → 400
// ---------------------------------------------------------------------------

console.log("\nTest 4 — Invalid email format → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { name: "BadEmail", email: "not-an-email", password: "SecurePass1" },
    db,
  );

  assert("Invalid email: status is 400", res.status, 400);
  assert("Invalid email: no user stored", db.length, 0);
}

// ---------------------------------------------------------------------------
// Test 5 — Missing password → 400
// ---------------------------------------------------------------------------

console.log("\nTest 5 — Missing password → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { name: "NoPassword", email: "nopw@example.com" },
    db,
  );

  assert("Missing password: status is 400", res.status, 400);
}

// ---------------------------------------------------------------------------
// Test 6 — Password too short → 400 with specific message
// ---------------------------------------------------------------------------

console.log("\nTest 6 — Password too short → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { name: "Short", email: "short@example.com", password: "Sh1" },
    db,
  );

  assert("Short password: status is 400", res.status, 400);
  assert(
    "Short password: error message is 'Password must be at least 8 characters'",
    (res.body as Record<string, unknown>).error,
    "Password must be at least 8 characters",
  );
}

// ---------------------------------------------------------------------------
// Test 7 — Password missing uppercase → 400
// ---------------------------------------------------------------------------

console.log("\nTest 7 — Password missing uppercase → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { name: "NoUpper", email: "noupper@example.com", password: "nouppercase1" },
    db,
  );

  assert("No uppercase: status is 400", res.status, 400);
  assert(
    "No uppercase: error message is 'Password must contain an uppercase letter'",
    (res.body as Record<string, unknown>).error,
    "Password must contain an uppercase letter",
  );
}

// ---------------------------------------------------------------------------
// Test 8 — Password missing lowercase → 400
// ---------------------------------------------------------------------------

console.log("\nTest 8 — Password missing lowercase → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { name: "NoLower", email: "nolower@example.com", password: "NOLOWERCASE1" },
    db,
  );

  assert("No lowercase: status is 400", res.status, 400);
  assert(
    "No lowercase: error message is 'Password must contain a lowercase letter'",
    (res.body as Record<string, unknown>).error,
    "Password must contain a lowercase letter",
  );
}

// ---------------------------------------------------------------------------
// Test 9 — Password missing digit → 400
// ---------------------------------------------------------------------------

console.log("\nTest 9 — Password missing digit → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    { name: "NoDigit", email: "nodigit@example.com", password: "NoDigitPass" },
    db,
  );

  assert("No digit: status is 400", res.status, 400);
  assert(
    "No digit: error message is 'Password must contain a number'",
    (res.body as Record<string, unknown>).error,
    "Password must contain a number",
  );
}

// ---------------------------------------------------------------------------
// Test 10 — Duplicate email → 409 conflict
// ---------------------------------------------------------------------------

console.log("\nTest 10 — Duplicate email → 409");

{
  const db: StoredUser[] = [];

  // First registration succeeds
  const first = await registerHandler(
    { name: "First User", email: "dup@example.com", password: "FirstPass1" },
    db,
  );
  assert("Duplicate email — first registration: status is 201", first.status, 201);

  // Second registration with same email → 409
  const second = await registerHandler(
    { name: "Second User", email: "dup@example.com", password: "SecondPass1" },
    db,
  );
  assert("Duplicate email — second registration: status is 409", second.status, 409);
  assert(
    "Duplicate email: error message",
    (second.body as Record<string, unknown>).error,
    "An account with that email already exists.",
  );
  // Only one user stored
  assert("Duplicate email: only one user in DB", db.length, 1);
}

// ---------------------------------------------------------------------------
// Test 11 — Name too long (> 100 chars) → 400
// ---------------------------------------------------------------------------

console.log("\nTest 11 — Name too long → 400");

{
  const db: StoredUser[] = [];
  const res = await registerHandler(
    {
      name: "A".repeat(101),
      email: "longname@example.com",
      password: "LongNamePass1",
    },
    db,
  );

  assert("Name too long: status is 400", res.status, 400);
  assert("Name too long: no user stored", db.length, 0);
}

// ---------------------------------------------------------------------------
// Test 12 — Stored user document has correct fields (password is hashed)
// ---------------------------------------------------------------------------

console.log("\nTest 12 — Stored user document fields and hashed password");

{
  const db: StoredUser[] = [];
  const plainPassword = "StoredFieldPass1";

  await registerHandler(
    { name: "Doc Check", email: "doccheck@example.com", password: plainPassword },
    db,
  );

  const user = db[0];

  assert("Stored doc: name correct", user.name, "Doc Check");
  assert("Stored doc: email correct", user.email, "doccheck@example.com");
  assert(
    "Stored doc: password is NOT the plaintext password",
    user.password === plainPassword,
    false,
  );
  assertTruthy(
    "Stored doc: password is a bcrypt hash (starts with $2)",
    user.password.startsWith("$2"),
  );
  assertTruthy(
    "Stored doc: password verifies correctly with bcrypt.compare",
    await bcrypt.compare(plainPassword, user.password),
  );
  assert("Stored doc: emailVerified is a Date", user.emailVerified instanceof Date, true);
  assert("Stored doc: createdAt is a Date", user.createdAt instanceof Date, true);
  assert("Stored doc: updatedAt is a Date", user.updatedAt instanceof Date, true);
}

// ---------------------------------------------------------------------------
// Test 13 — mfaEnabled defaults to false
// ---------------------------------------------------------------------------

console.log("\nTest 13 — Stored user: mfaEnabled defaults to false");

{
  const db: StoredUser[] = [];
  await registerHandler(
    { name: "MFA Default", email: "mfadefault@example.com", password: "MfaDefault1" },
    db,
  );

  assert("Stored user: mfaEnabled is false", db[0].mfaEnabled, false);
}

// ---------------------------------------------------------------------------
// Test 14 — defaultUnitSystem defaults to "us"
// ---------------------------------------------------------------------------

console.log("\nTest 14 — Stored user: defaultUnitSystem defaults to 'us'");

{
  const db: StoredUser[] = [];
  await registerHandler(
    { name: "Unit Default", email: "unitdefault@example.com", password: "UnitDefault1" },
    db,
  );

  assert("Stored user: defaultUnitSystem is 'us'", db[0].defaultUnitSystem, "us");
}

// ---------------------------------------------------------------------------
// Test 15 — preferredServings defaults to null
// ---------------------------------------------------------------------------

console.log("\nTest 15 — Stored user: preferredServings defaults to null");

{
  const db: StoredUser[] = [];
  await registerHandler(
    {
      name: "Servings Default",
      email: "servingsdefault@example.com",
      password: "ServingsDefault1",
    },
    db,
  );

  assert("Stored user: preferredServings is null", db[0].preferredServings, null);
}

// ---------------------------------------------------------------------------
// Test 16 — Malformed JSON body → 500
// ---------------------------------------------------------------------------

console.log("\nTest 16 — Malformed JSON body → 500");

{
  const db: StoredUser[] = [];
  const res = await registerHandler("{this is not: valid json}", db);

  assert("Malformed JSON: status is 500", res.status, 500);
  assert(
    "Malformed JSON: error message",
    (res.body as Record<string, unknown>).error,
    "Something went wrong. Please try again.",
  );
}

// ---------------------------------------------------------------------------
// Source analysis — validate real route structure
// ---------------------------------------------------------------------------

console.log("\nSource analysis — register/route.ts structure");

{
  const src = readSource("src/app/api/auth/register/route.ts");

  assertContains("register/route.ts: imports hashPassword", src, "hashPassword");
  assertContains("register/route.ts: uses Zod safeParse", src, "safeParse");
  assertContains("register/route.ts: checks for duplicate email", src, "existing");
  assertContains("register/route.ts: returns 409 for duplicate", src, "409");
  assertContains("register/route.ts: returns 201 on success", src, "201");
  assertContains("register/route.ts: stores mfaEnabled: false", src, "mfaEnabled: false");
  assertContains("register/route.ts: stores defaultUnitSystem: 'us'", src, '"us"');
  assertContains("register/route.ts: stores preferredServings: null", src, "preferredServings: null");
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
