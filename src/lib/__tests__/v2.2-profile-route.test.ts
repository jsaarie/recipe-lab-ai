/**
 * v2.2 Profile Route Tests — plain TypeScript script (no test framework).
 * Run with:  npx tsx src/lib/__tests__/v2.2-profile-route.test.ts
 *
 * Tests covered:
 *  GET /api/user/profile
 *   1. Unauthenticated GET → 401 Unauthorized
 *   2. Authenticated GET, user exists → 200 with user document
 *   3. Authenticated GET, user not found in DB → 404
 *   4. GET response: password and mfaSecret fields are excluded from response
 *
 *  PATCH /api/user/profile
 *   5. Unauthenticated PATCH → 401 Unauthorized
 *   6. Valid PATCH — update name → 200 success, DB updated
 *   7. Valid PATCH — update defaultUnitSystem → 200 success
 *   8. Valid PATCH — set preferredServings to a valid integer → 200 success
 *   9. Valid PATCH — set preferredServings to null (reset) → 200 success
 *  10. Invalid PATCH — name empty string → 400
 *  11. Invalid PATCH — name exceeds 100 chars → 400
 *  12. Invalid PATCH — defaultUnitSystem invalid value → 400
 *  13. Invalid PATCH — preferredServings = 0 (below min 1) → 400
 *  14. Invalid PATCH — preferredServings = 101 (above max 100) → 400
 *  15. Invalid PATCH — preferredServings non-integer (float) → 400
 *  16. Valid PATCH — empty body (no fields) → 200 (all fields optional)
 *  17. PATCH: updatedAt is set on every update
 */

import { z } from "zod";
import { ObjectId } from "mongodb";

// ---------------------------------------------------------------------------
// Inline re-implementation of the profile route logic
// (src/app/api/user/profile/route.ts)
// The session and DB calls are replaced with simple in-memory mocks.
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  defaultUnitSystem: z.enum(["us", "metric"]).optional(),
  preferredServings: z.number().int().min(1).max(100).nullable().optional(),
});

// --- Types ---

type Session = {
  user: { id: string; email: string };
} | null;

type UserDoc = {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  mfaSecret?: string;
  mfaEnabled: boolean;
  defaultUnitSystem: "us" | "metric";
  preferredServings: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockResponse = {
  status: number;
  body: unknown;
};

function jsonResponse(body: unknown, status = 200): MockResponse {
  return { status, body };
}

// --- GET handler ---

async function getProfile(session: Session, dbUsers: UserDoc[]): Promise<MockResponse> {
  if (!session) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const user = dbUsers.find((u) => u._id.toString() === session.user.id);
  if (!user) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  // Exclude sensitive fields — mirrors the MongoDB projection { password: 0, mfaSecret: 0 }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, mfaSecret, ...safeUser } = user;
  return jsonResponse({ user: safeUser });
}

// --- PATCH handler ---

async function patchProfile(
  session: Session,
  rawBody: unknown,
  dbUsers: UserDoc[],
): Promise<MockResponse> {
  if (!session) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0].message }, 400);
  }

  const updates = { ...parsed.data, updatedAt: new Date() };

  const idx = dbUsers.findIndex((u) => u._id.toString() === session.user.id);
  if (idx >= 0) {
    dbUsers[idx] = { ...dbUsers[idx], ...updates };
  }

  return jsonResponse({ success: true });
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_ID = new ObjectId();
const TEST_SESSION: Session = {
  user: { id: TEST_ID.toString(), email: "user@example.com" },
};

function makeUser(overrides: Partial<UserDoc> = {}): UserDoc {
  return {
    _id: TEST_ID,
    name: "Test User",
    email: "user@example.com",
    password: "$2b$12$hashedpassword",
    mfaEnabled: false,
    defaultUnitSystem: "us",
    preferredServings: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
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

function assertUndefined(testName: string, value: unknown): void {
  if (value === undefined) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected undefined, got: ${JSON.stringify(value)}`;
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

// ===========================================================================
// GET /api/user/profile
// ===========================================================================

// ---------------------------------------------------------------------------
// Test 1 — Unauthenticated GET → 401
// ---------------------------------------------------------------------------

console.log("\nTest 1 — GET: unauthenticated → 401");

{
  const db = [makeUser()];
  const res = await getProfile(null, db);

  assert("GET unauthenticated: status is 401", res.status, 401);
  assert(
    "GET unauthenticated: error is 'Unauthorized'",
    (res.body as Record<string, unknown>).error,
    "Unauthorized",
  );
}

// ---------------------------------------------------------------------------
// Test 2 — Authenticated GET, user exists → 200 with user
// ---------------------------------------------------------------------------

console.log("\nTest 2 — GET: authenticated, user exists → 200");

{
  const db = [makeUser()];
  const res = await getProfile(TEST_SESSION, db);

  assert("GET authenticated: status is 200", res.status, 200);
  const body = res.body as Record<string, unknown>;
  assertTruthy("GET authenticated: body.user is present", body.user);
  const user = body.user as Record<string, unknown>;
  assert("GET authenticated: user.name is correct", user.name, "Test User");
  assert("GET authenticated: user.email is correct", user.email, "user@example.com");
}

// ---------------------------------------------------------------------------
// Test 3 — Authenticated GET, user not found → 404
// ---------------------------------------------------------------------------

console.log("\nTest 3 — GET: user not found in DB → 404");

{
  // Empty DB — no user with matching _id
  const res = await getProfile(TEST_SESSION, []);

  assert("GET user not found: status is 404", res.status, 404);
  assert(
    "GET user not found: error message",
    (res.body as Record<string, unknown>).error,
    "User not found",
  );
}

// ---------------------------------------------------------------------------
// Test 4 — GET response: password and mfaSecret are excluded
// ---------------------------------------------------------------------------

console.log("\nTest 4 — GET: password and mfaSecret excluded from response");

{
  const db = [makeUser({ mfaSecret: "SOME_MFA_SECRET" })];
  const res = await getProfile(TEST_SESSION, db);

  const user = (res.body as Record<string, unknown>).user as Record<string, unknown>;

  assertUndefined(
    "GET response: password field is excluded",
    user.password,
  );
  assertUndefined(
    "GET response: mfaSecret field is excluded",
    user.mfaSecret,
  );
  // Non-sensitive fields should still be present
  assertTruthy(
    "GET response: name is present (non-sensitive field)",
    user.name,
  );
  assertTruthy(
    "GET response: email is present (non-sensitive field)",
    user.email,
  );
}

// ===========================================================================
// PATCH /api/user/profile
// ===========================================================================

// ---------------------------------------------------------------------------
// Test 5 — Unauthenticated PATCH → 401
// ---------------------------------------------------------------------------

console.log("\nTest 5 — PATCH: unauthenticated → 401");

{
  const db = [makeUser()];
  const res = await patchProfile(null, { name: "New Name" }, db);

  assert("PATCH unauthenticated: status is 401", res.status, 401);
  assert(
    "PATCH unauthenticated: error is 'Unauthorized'",
    (res.body as Record<string, unknown>).error,
    "Unauthorized",
  );
}

// ---------------------------------------------------------------------------
// Test 6 — Valid PATCH: update name
// ---------------------------------------------------------------------------

console.log("\nTest 6 — PATCH: update name → 200, DB updated");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { name: "Updated Name" }, db);

  assert("PATCH name: status is 200", res.status, 200);
  assert(
    "PATCH name: body.success is true",
    (res.body as Record<string, unknown>).success,
    true,
  );
  assert("PATCH name: DB updated", db[0].name, "Updated Name");
}

// ---------------------------------------------------------------------------
// Test 7 — Valid PATCH: update defaultUnitSystem
// ---------------------------------------------------------------------------

console.log("\nTest 7 — PATCH: update defaultUnitSystem → 200");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { defaultUnitSystem: "metric" }, db);

  assert("PATCH unit system: status is 200", res.status, 200);
  assert("PATCH unit system: DB updated to 'metric'", db[0].defaultUnitSystem, "metric");
}

// ---------------------------------------------------------------------------
// Test 8 — Valid PATCH: set preferredServings to valid integer
// ---------------------------------------------------------------------------

console.log("\nTest 8 — PATCH: set preferredServings to valid integer → 200");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { preferredServings: 4 }, db);

  assert("PATCH servings (4): status is 200", res.status, 200);
  assert("PATCH servings (4): DB updated", db[0].preferredServings, 4);
}

// ---------------------------------------------------------------------------
// Test 9 — Valid PATCH: set preferredServings to null (reset)
// ---------------------------------------------------------------------------

console.log("\nTest 9 — PATCH: set preferredServings to null → 200");

{
  const db = [makeUser({ preferredServings: 6 })];
  const res = await patchProfile(TEST_SESSION, { preferredServings: null }, db);

  assert("PATCH servings null: status is 200", res.status, 200);
  assert("PATCH servings null: DB updated to null", db[0].preferredServings, null);
}

// ---------------------------------------------------------------------------
// Test 10 — Invalid PATCH: name is empty string → 400
// ---------------------------------------------------------------------------

console.log("\nTest 10 — PATCH: name empty string → 400");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { name: "" }, db);

  assert("PATCH empty name: status is 400", res.status, 400);
  assert("PATCH empty name: DB unchanged", db[0].name, "Test User");
}

// ---------------------------------------------------------------------------
// Test 11 — Invalid PATCH: name exceeds 100 chars → 400
// ---------------------------------------------------------------------------

console.log("\nTest 11 — PATCH: name exceeds 100 chars → 400");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { name: "A".repeat(101) }, db);

  assert("PATCH name too long: status is 400", res.status, 400);
  assert("PATCH name too long: DB unchanged", db[0].name, "Test User");
}

// ---------------------------------------------------------------------------
// Test 12 — Invalid PATCH: invalid defaultUnitSystem value → 400
// ---------------------------------------------------------------------------

console.log("\nTest 12 — PATCH: invalid defaultUnitSystem → 400");

{
  const db = [makeUser()];
  const res = await patchProfile(
    TEST_SESSION,
    { defaultUnitSystem: "imperial" },
    db,
  );

  assert("PATCH invalid unit system: status is 400", res.status, 400);
  assert("PATCH invalid unit system: DB unchanged", db[0].defaultUnitSystem, "us");
}

// ---------------------------------------------------------------------------
// Test 13 — Invalid PATCH: preferredServings = 0 (below min) → 400
// ---------------------------------------------------------------------------

console.log("\nTest 13 — PATCH: preferredServings = 0 → 400");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { preferredServings: 0 }, db);

  assert("PATCH servings 0: status is 400", res.status, 400);
}

// ---------------------------------------------------------------------------
// Test 14 — Invalid PATCH: preferredServings = 101 (above max) → 400
// ---------------------------------------------------------------------------

console.log("\nTest 14 — PATCH: preferredServings = 101 → 400");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { preferredServings: 101 }, db);

  assert("PATCH servings 101: status is 400", res.status, 400);
}

// ---------------------------------------------------------------------------
// Test 15 — Invalid PATCH: preferredServings non-integer (float) → 400
// ---------------------------------------------------------------------------

console.log("\nTest 15 — PATCH: preferredServings = 4.5 (float) → 400");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { preferredServings: 4.5 }, db);

  assert("PATCH servings float: status is 400", res.status, 400);
}

// ---------------------------------------------------------------------------
// Test 16 — Valid PATCH: empty body (all fields optional) → 200
// ---------------------------------------------------------------------------

console.log("\nTest 16 — PATCH: empty body (all fields optional) → 200");

{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, {}, db);

  assert("PATCH empty body: status is 200", res.status, 200);
  // Existing values should not have changed (except updatedAt)
  assert("PATCH empty body: name unchanged", db[0].name, "Test User");
  assert(
    "PATCH empty body: defaultUnitSystem unchanged",
    db[0].defaultUnitSystem,
    "us",
  );
}

// ---------------------------------------------------------------------------
// Test 17 — PATCH: updatedAt is refreshed on every update
// ---------------------------------------------------------------------------

console.log("\nTest 17 — PATCH: updatedAt is updated on each call");

{
  const originalDate = new Date("2026-01-01T00:00:00.000Z");
  const db = [makeUser({ updatedAt: originalDate })];

  const before = db[0].updatedAt;
  await patchProfile(TEST_SESSION, { name: "Updated" }, db);
  const after = db[0].updatedAt;

  assertTruthy(
    "PATCH: updatedAt is a Date after update",
    after instanceof Date,
  );
  assertTruthy(
    "PATCH: updatedAt is later than the original date",
    after > before,
  );
}

// ---------------------------------------------------------------------------
// Source analysis — validate real route structure
// ---------------------------------------------------------------------------

console.log("\nSource analysis — profile/route.ts structure");

{
  const src = readSource("src/app/api/user/profile/route.ts");

  assertContains("profile/route.ts: imports auth", src, "auth");
  assertContains("profile/route.ts: checks session (auth guard)", src, "if (!session)");
  assertContains("profile/route.ts: returns 401 for no session", src, "401");
  assertContains("profile/route.ts: excludes password from projection", src, "password: 0");
  assertContains("profile/route.ts: excludes mfaSecret from projection", src, "mfaSecret: 0");
  assertContains("profile/route.ts: uses Zod patchSchema.safeParse", src, "safeParse");
  assertContains("profile/route.ts: sets updatedAt on patch", src, "updatedAt");
  assertContains("profile/route.ts: preferredServings nullable", src, "nullable");
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
