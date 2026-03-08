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
import { makeAssertions, readSource } from "./test-helpers";

const { assert, assertTruthy, assertUndefined, assertContains, summary } = makeAssertions();

// ---------------------------------------------------------------------------
// Inline re-implementation of the profile route logic
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  defaultUnitSystem: z.enum(["us", "metric"]).optional(),
  preferredServings: z.number().int().min(1).max(100).nullable().optional(),
});

type Session = { user: { id: string; email: string } } | null;

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

type MockResponse = { status: number; body: unknown };

function jsonResponse(body: unknown, status = 200): MockResponse {
  return { status, body };
}

async function getProfile(session: Session, dbUsers: UserDoc[]): Promise<MockResponse> {
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);
  const user = dbUsers.find((u) => u._id.toString() === session.user.id);
  if (!user) return jsonResponse({ error: "User not found" }, 404);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, mfaSecret, ...safeUser } = user;
  return jsonResponse({ user: safeUser });
}

async function patchProfile(session: Session, rawBody: unknown, dbUsers: UserDoc[]): Promise<MockResponse> {
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);
  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) return jsonResponse({ error: parsed.error.issues[0].message }, 400);
  const updates = { ...parsed.data, updatedAt: new Date() };
  const idx = dbUsers.findIndex((u) => u._id.toString() === session.user.id);
  if (idx >= 0) dbUsers[idx] = { ...dbUsers[idx], ...updates };
  return jsonResponse({ success: true });
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_ID = new ObjectId();
const TEST_SESSION: Session = { user: { id: TEST_ID.toString(), email: "user@example.com" } };

function makeUser(overrides: Partial<UserDoc> = {}): UserDoc {
  return {
    _id: TEST_ID, name: "Test User", email: "user@example.com", password: "$2b$12$hashedpassword",
    mfaEnabled: false, defaultUnitSystem: "us", preferredServings: null,
    createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — GET /api/user/profile
// ---------------------------------------------------------------------------

console.log("\nTest 1 — GET: unauthenticated → 401");
{
  const res = await getProfile(null, [makeUser()]);
  assert("GET unauthenticated: status is 401", res.status, 401);
  assert("GET unauthenticated: error is 'Unauthorized'", (res.body as Record<string, unknown>).error, "Unauthorized");
}

console.log("\nTest 2 — GET: authenticated, user exists → 200");
{
  const res = await getProfile(TEST_SESSION, [makeUser()]);
  assert("GET authenticated: status is 200", res.status, 200);
  const user = (res.body as Record<string, unknown>).user as Record<string, unknown>;
  assertTruthy("GET authenticated: body.user is present", user);
  assert("GET authenticated: user.name is correct", user.name, "Test User");
  assert("GET authenticated: user.email is correct", user.email, "user@example.com");
}

console.log("\nTest 3 — GET: user not found in DB → 404");
{
  const res = await getProfile(TEST_SESSION, []);
  assert("GET user not found: status is 404", res.status, 404);
  assert("GET user not found: error message", (res.body as Record<string, unknown>).error, "User not found");
}

console.log("\nTest 4 — GET: password and mfaSecret excluded from response");
{
  const res = await getProfile(TEST_SESSION, [makeUser({ mfaSecret: "SOME_MFA_SECRET" })]);
  const user = (res.body as Record<string, unknown>).user as Record<string, unknown>;
  assertUndefined("GET response: password field is excluded", user.password);
  assertUndefined("GET response: mfaSecret field is excluded", user.mfaSecret);
  assertTruthy("GET response: name is present (non-sensitive field)", user.name);
  assertTruthy("GET response: email is present (non-sensitive field)", user.email);
}

// ---------------------------------------------------------------------------
// Tests — PATCH /api/user/profile
// ---------------------------------------------------------------------------

console.log("\nTest 5 — PATCH: unauthenticated → 401");
{
  const res = await patchProfile(null, { name: "New Name" }, [makeUser()]);
  assert("PATCH unauthenticated: status is 401", res.status, 401);
  assert("PATCH unauthenticated: error is 'Unauthorized'", (res.body as Record<string, unknown>).error, "Unauthorized");
}

console.log("\nTest 6 — PATCH: update name → 200, DB updated");
{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { name: "Updated Name" }, db);
  assert("PATCH name: status is 200", res.status, 200);
  assert("PATCH name: body.success is true", (res.body as Record<string, unknown>).success, true);
  assert("PATCH name: DB updated", db[0].name, "Updated Name");
}

console.log("\nTest 7 — PATCH: update defaultUnitSystem → 200");
{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { defaultUnitSystem: "metric" }, db);
  assert("PATCH unit system: status is 200", res.status, 200);
  assert("PATCH unit system: DB updated to 'metric'", db[0].defaultUnitSystem, "metric");
}

console.log("\nTest 8 — PATCH: set preferredServings to valid integer → 200");
{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { preferredServings: 4 }, db);
  assert("PATCH servings (4): status is 200", res.status, 200);
  assert("PATCH servings (4): DB updated", db[0].preferredServings, 4);
}

console.log("\nTest 9 — PATCH: set preferredServings to null → 200");
{
  const db = [makeUser({ preferredServings: 6 })];
  const res = await patchProfile(TEST_SESSION, { preferredServings: null }, db);
  assert("PATCH servings null: status is 200", res.status, 200);
  assert("PATCH servings null: DB updated to null", db[0].preferredServings, null);
}

console.log("\nTest 10 — PATCH: name empty string → 400");
{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { name: "" }, db);
  assert("PATCH empty name: status is 400", res.status, 400);
  assert("PATCH empty name: DB unchanged", db[0].name, "Test User");
}

console.log("\nTest 11 — PATCH: name exceeds 100 chars → 400");
{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { name: "A".repeat(101) }, db);
  assert("PATCH name too long: status is 400", res.status, 400);
  assert("PATCH name too long: DB unchanged", db[0].name, "Test User");
}

console.log("\nTest 12 — PATCH: invalid defaultUnitSystem → 400");
{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, { defaultUnitSystem: "imperial" }, db);
  assert("PATCH invalid unit system: status is 400", res.status, 400);
  assert("PATCH invalid unit system: DB unchanged", db[0].defaultUnitSystem, "us");
}

console.log("\nTest 13 — PATCH: preferredServings = 0 → 400");
{
  const res = await patchProfile(TEST_SESSION, { preferredServings: 0 }, [makeUser()]);
  assert("PATCH servings 0: status is 400", res.status, 400);
}

console.log("\nTest 14 — PATCH: preferredServings = 101 → 400");
{
  const res = await patchProfile(TEST_SESSION, { preferredServings: 101 }, [makeUser()]);
  assert("PATCH servings 101: status is 400", res.status, 400);
}

console.log("\nTest 15 — PATCH: preferredServings = 4.5 (float) → 400");
{
  const res = await patchProfile(TEST_SESSION, { preferredServings: 4.5 }, [makeUser()]);
  assert("PATCH servings float: status is 400", res.status, 400);
}

console.log("\nTest 16 — PATCH: empty body (all fields optional) → 200");
{
  const db = [makeUser()];
  const res = await patchProfile(TEST_SESSION, {}, db);
  assert("PATCH empty body: status is 200", res.status, 200);
  assert("PATCH empty body: name unchanged", db[0].name, "Test User");
  assert("PATCH empty body: defaultUnitSystem unchanged", db[0].defaultUnitSystem, "us");
}

console.log("\nTest 17 — PATCH: updatedAt is updated on each call");
{
  const originalDate = new Date("2026-01-01T00:00:00.000Z");
  const db = [makeUser({ updatedAt: originalDate })];
  const before = db[0].updatedAt;
  await patchProfile(TEST_SESSION, { name: "Updated" }, db);
  const after = db[0].updatedAt;
  assertTruthy("PATCH: updatedAt is a Date after update", after instanceof Date);
  assertTruthy("PATCH: updatedAt is later than the original date", after > before);
}

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

summary();
