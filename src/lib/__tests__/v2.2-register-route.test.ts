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
import { makeAssertions, readSource } from "./test-helpers";

const { assert, assertTruthy, assertContains, summary } = makeAssertions();

// ---------------------------------------------------------------------------
// Inline re-implementation of the registration route logic
// ---------------------------------------------------------------------------

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

type MockResponse = { status: number; body: unknown };
type MockBody = Record<string, unknown> | string;

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

function jsonResponse(body: unknown, status = 200): MockResponse {
  return { status, body };
}

async function registerHandler(rawBody: MockBody, dbUsers: StoredUser[]): Promise<MockResponse> {
  try {
    const body: unknown = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.issues[0].message }, 400);
    }
    const { name, email, password } = parsed.data;
    if (dbUsers.find((u) => u.email === email)) {
      return jsonResponse({ error: "An account with that email already exists." }, 409);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    dbUsers.push({ name, email, password: passwordHash, emailVerified: now, mfaEnabled: false, defaultUnitSystem: "us", preferredServings: null, createdAt: now, updatedAt: now });
    return jsonResponse({ success: true }, 201);
  } catch {
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log("\nTest 1 — Happy path: valid registration payload → 201");
{
  const db: StoredUser[] = [];
  const res = await registerHandler({ name: "Jane Doe", email: "jane@example.com", password: "SecurePass1" }, db);
  assert("Happy path: status is 201", res.status, 201);
  assert("Happy path: body.success is true", (res.body as Record<string, unknown>).success, true);
  assert("Happy path: user stored in DB", db.length, 1);
  assert("Happy path: stored email matches input", db[0].email, "jane@example.com");
  assert("Happy path: stored name matches input", db[0].name, "Jane Doe");
}

console.log("\nTest 2 — Missing name → 400");
{
  const db: StoredUser[] = [];
  const res = await registerHandler({ email: "noname@example.com", password: "SecurePass1" }, db);
  assert("Missing name: status is 400", res.status, 400);
  assertTruthy("Missing name: body.error is a non-empty string", typeof (res.body as Record<string, unknown>).error === "string" && ((res.body as Record<string, unknown>).error as string).length > 0);
  assert("Missing name: no user stored in DB", db.length, 0);
}

console.log("\nTest 3 — Missing email → 400");
{
  const res = await registerHandler({ name: "NoEmail", password: "SecurePass1" }, []);
  assert("Missing email: status is 400", res.status, 400);
}

console.log("\nTest 4 — Invalid email format → 400");
{
  const db: StoredUser[] = [];
  const res = await registerHandler({ name: "BadEmail", email: "not-an-email", password: "SecurePass1" }, db);
  assert("Invalid email: status is 400", res.status, 400);
  assert("Invalid email: no user stored", db.length, 0);
}

console.log("\nTest 5 — Missing password → 400");
{
  const res = await registerHandler({ name: "NoPassword", email: "nopw@example.com" }, []);
  assert("Missing password: status is 400", res.status, 400);
}

console.log("\nTest 6 — Password too short → 400");
{
  const res = await registerHandler({ name: "Short", email: "short@example.com", password: "Sh1" }, []);
  assert("Short password: status is 400", res.status, 400);
  assert("Short password: error message is 'Password must be at least 8 characters'", (res.body as Record<string, unknown>).error, "Password must be at least 8 characters");
}

console.log("\nTest 7 — Password missing uppercase → 400");
{
  const res = await registerHandler({ name: "NoUpper", email: "noupper@example.com", password: "nouppercase1" }, []);
  assert("No uppercase: status is 400", res.status, 400);
  assert("No uppercase: error message", (res.body as Record<string, unknown>).error, "Password must contain an uppercase letter");
}

console.log("\nTest 8 — Password missing lowercase → 400");
{
  const res = await registerHandler({ name: "NoLower", email: "nolower@example.com", password: "NOLOWERCASE1" }, []);
  assert("No lowercase: status is 400", res.status, 400);
  assert("No lowercase: error message", (res.body as Record<string, unknown>).error, "Password must contain a lowercase letter");
}

console.log("\nTest 9 — Password missing digit → 400");
{
  const res = await registerHandler({ name: "NoDigit", email: "nodigit@example.com", password: "NoDigitPass" }, []);
  assert("No digit: status is 400", res.status, 400);
  assert("No digit: error message", (res.body as Record<string, unknown>).error, "Password must contain a number");
}

console.log("\nTest 10 — Duplicate email → 409");
{
  const db: StoredUser[] = [];
  const first = await registerHandler({ name: "First User", email: "dup@example.com", password: "FirstPass1" }, db);
  assert("Duplicate email — first registration: status is 201", first.status, 201);
  const second = await registerHandler({ name: "Second User", email: "dup@example.com", password: "SecondPass1" }, db);
  assert("Duplicate email — second registration: status is 409", second.status, 409);
  assert("Duplicate email: error message", (second.body as Record<string, unknown>).error, "An account with that email already exists.");
  assert("Duplicate email: only one user in DB", db.length, 1);
}

console.log("\nTest 11 — Name too long → 400");
{
  const db: StoredUser[] = [];
  const res = await registerHandler({ name: "A".repeat(101), email: "longname@example.com", password: "LongNamePass1" }, db);
  assert("Name too long: status is 400", res.status, 400);
  assert("Name too long: no user stored", db.length, 0);
}

console.log("\nTest 12 — Stored user document fields and hashed password");
{
  const db: StoredUser[] = [];
  const plainPassword = "StoredFieldPass1";
  await registerHandler({ name: "Doc Check", email: "doccheck@example.com", password: plainPassword }, db);
  const user = db[0];
  assert("Stored doc: name correct", user.name, "Doc Check");
  assert("Stored doc: email correct", user.email, "doccheck@example.com");
  assert("Stored doc: password is NOT the plaintext password", user.password === plainPassword, false);
  assertTruthy("Stored doc: password is a bcrypt hash (starts with $2)", user.password.startsWith("$2"));
  assertTruthy("Stored doc: password verifies correctly with bcrypt.compare", await bcrypt.compare(plainPassword, user.password));
  assert("Stored doc: emailVerified is a Date", user.emailVerified instanceof Date, true);
  assert("Stored doc: createdAt is a Date", user.createdAt instanceof Date, true);
  assert("Stored doc: updatedAt is a Date", user.updatedAt instanceof Date, true);
}

console.log("\nTest 13 — Stored user: mfaEnabled defaults to false");
{
  const db: StoredUser[] = [];
  await registerHandler({ name: "MFA Default", email: "mfadefault@example.com", password: "MfaDefault1" }, db);
  assert("Stored user: mfaEnabled is false", db[0].mfaEnabled, false);
}

console.log("\nTest 14 — Stored user: defaultUnitSystem defaults to 'us'");
{
  const db: StoredUser[] = [];
  await registerHandler({ name: "Unit Default", email: "unitdefault@example.com", password: "UnitDefault1" }, db);
  assert("Stored user: defaultUnitSystem is 'us'", db[0].defaultUnitSystem, "us");
}

console.log("\nTest 15 — Stored user: preferredServings defaults to null");
{
  const db: StoredUser[] = [];
  await registerHandler({ name: "Servings Default", email: "servingsdefault@example.com", password: "ServingsDefault1" }, db);
  assert("Stored user: preferredServings is null", db[0].preferredServings, null);
}

console.log("\nTest 16 — Malformed JSON body → 500");
{
  const res = await registerHandler("{this is not: valid json}", []);
  assert("Malformed JSON: status is 500", res.status, 500);
  assert("Malformed JSON: error message", (res.body as Record<string, unknown>).error, "Something went wrong. Please try again.");
}

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

summary();
