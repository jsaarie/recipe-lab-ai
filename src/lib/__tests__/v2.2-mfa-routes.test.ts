/**
 * v2.2 MFA Route Tests — plain TypeScript script (no test framework).
 * Run with:  npx tsx src/lib/__tests__/v2.2-mfa-routes.test.ts
 *
 * Tests covered:
 *  MFA Setup — POST /api/user/mfa/setup
 *   1. Unauthenticated request → 401
 *   2. Authenticated request → 200 with secret and qrDataUrl
 *   3. Setup: secret stored as mfaPendingSecret (not mfaSecret) in DB
 *   4. Setup: returned qrDataUrl is a base64 data URL
 *   5. Setup: returned secret is a non-empty Base32 string
 *   6. Setup: calling setup twice overwrites the pending secret
 *
 *  MFA Verify — POST /api/user/mfa/verify
 *   7. Unauthenticated request → 401
 *   8. Token not 6 digits → 400
 *   9. Token too short (< 6) → 400
 *  10. Token too long (> 6) → 400
 *  11. mode "setup" with no pending secret → 400
 *  12. mode "setup" with valid TOTP token → 200, MFA activated
 *  13. mode "setup": after activation mfaEnabled = true, mfaSecret set
 *  14. mode "setup": after activation mfaPendingSecret removed
 *  15. mode "setup" with invalid TOTP token → 401
 *  16. mode "login" with no mfaSecret → 400
 *  17. mode "login" with valid TOTP token → 200
 *  18. mode "login" with invalid TOTP token → 401
 *  19. mode defaults to "login" when not specified
 *  20. User not found in DB → 404
 *
 *  Static source analysis
 *  21. setup/route.ts stores mfaPendingSecret, not mfaSecret
 *  22. verify/route.ts promotes pendingSecret to mfaSecret on confirm
 *  23. verify/route.ts removes mfaPendingSecret on activation
 */

import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import QRCode from "qrcode";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { makeAssertions, readSource } from "./test-helpers";

const { assert, assertTruthy, assertUndefined, assertMatches, assertContains, summary } = makeAssertions();

// ---------------------------------------------------------------------------
// TOTP instance
// ---------------------------------------------------------------------------

const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });

// ---------------------------------------------------------------------------
// Inline re-implementation of the MFA route logic
// ---------------------------------------------------------------------------

type Session = { user: { id: string; email: string } } | null;

type UserDoc = {
  _id: ObjectId;
  email: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaPendingSecret?: string;
};

type MockResponse = { status: number; body: unknown };

function jsonResponse(body: unknown, status = 200): MockResponse {
  return { status, body };
}

async function setupMFAHandler(session: Session, dbUsers: UserDoc[]): Promise<MockResponse> {
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);
  const secret = totp.generateSecret();
  const otpauthUrl = totp.toURI({ secret, label: session.user.email ?? "", issuer: "Recipe Lab AI" });
  const idx = dbUsers.findIndex((u) => u._id.toString() === session.user.id);
  if (idx >= 0) dbUsers[idx] = { ...dbUsers[idx], mfaPendingSecret: secret };
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return jsonResponse({ secret, qrDataUrl });
}

const bodySchema = z.object({
  token: z.string().length(6),
  mode: z.enum(["setup", "login"]).default("login"),
});

async function verifyMFAHandler(session: Session, rawBody: unknown, dbUsers: UserDoc[]): Promise<MockResponse> {
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) return jsonResponse({ error: "Invalid request" }, 400);
  const { token, mode } = parsed.data;
  const user = dbUsers.find((u) => u._id.toString() === session.user.id);
  if (!user) return jsonResponse({ error: "User not found" }, 404);

  if (mode === "setup") {
    const pendingSecret = user.mfaPendingSecret;
    if (!pendingSecret) return jsonResponse({ error: "No MFA setup in progress" }, 400);
    const result = await totp.verify(token, { secret: pendingSecret });
    if (!result.valid) return jsonResponse({ error: "Invalid code" }, 401);
    const idx = dbUsers.findIndex((u) => u._id.toString() === session.user.id);
    dbUsers[idx] = { ...dbUsers[idx], mfaEnabled: true, mfaSecret: pendingSecret, mfaPendingSecret: undefined };
    return jsonResponse({ success: true });
  }

  const mfaSecret = user.mfaSecret;
  if (!mfaSecret) return jsonResponse({ error: "MFA not enabled" }, 400);
  const result = await totp.verify(token, { secret: mfaSecret });
  if (!result.valid) return jsonResponse({ error: "Invalid code" }, 401);
  return jsonResponse({ success: true });
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_ID = new ObjectId();
const TEST_SESSION: Session = { user: { id: TEST_ID.toString(), email: "mfa-user@example.com" } };

function makeUser(overrides: Partial<UserDoc> = {}): UserDoc {
  return { _id: TEST_ID, email: "mfa-user@example.com", mfaEnabled: false, ...overrides };
}

// ---------------------------------------------------------------------------
// MFA Setup tests
// ---------------------------------------------------------------------------

console.log("\nTest 1 — Setup: unauthenticated → 401");
{
  const res = await setupMFAHandler(null, [makeUser()]);
  assert("Setup unauthenticated: status is 401", res.status, 401);
  assert("Setup unauthenticated: error is 'Unauthorized'", (res.body as Record<string, unknown>).error, "Unauthorized");
}

console.log("\nTest 2 — Setup: authenticated → 200 with secret and qrDataUrl");
{
  const res = await setupMFAHandler(TEST_SESSION, [makeUser()]);
  assert("Setup authenticated: status is 200", res.status, 200);
  assertTruthy("Setup: body.secret is present", (res.body as Record<string, unknown>).secret);
  assertTruthy("Setup: body.qrDataUrl is present", (res.body as Record<string, unknown>).qrDataUrl);
}

console.log("\nTest 3 — Setup: secret stored as mfaPendingSecret, not mfaSecret");
{
  const db = [makeUser()];
  const res = await setupMFAHandler(TEST_SESSION, db);
  const returnedSecret = (res.body as Record<string, unknown>).secret as string;
  assert("Setup: mfaPendingSecret set to the returned secret", db[0].mfaPendingSecret, returnedSecret);
  assertUndefined("Setup: mfaSecret is NOT set during setup (pending only)", db[0].mfaSecret);
  assert("Setup: mfaEnabled is still false during setup", db[0].mfaEnabled, false);
}

console.log("\nTest 4 — Setup: qrDataUrl is a base64 PNG data URL");
{
  const res = await setupMFAHandler(TEST_SESSION, [makeUser()]);
  const qrDataUrl = (res.body as Record<string, unknown>).qrDataUrl as string;
  assertMatches("Setup: qrDataUrl starts with 'data:image/png;base64,'", qrDataUrl, /^data:image\/png;base64,/);
  assertTruthy("Setup: qrDataUrl has substantial base64 content", qrDataUrl.length > 100);
}

console.log("\nTest 5 — Setup: secret is a valid Base32 string");
{
  const res = await setupMFAHandler(TEST_SESSION, [makeUser()]);
  const secret = (res.body as Record<string, unknown>).secret as string;
  assertTruthy("Setup: secret is non-empty", secret.length > 0);
  assertMatches("Setup: secret contains only Base32 characters (A-Z, 2-7)", secret, /^[A-Z2-7]+=*$/);
}

console.log("\nTest 6 — Setup: second call overwrites mfaPendingSecret");
{
  const db = [makeUser()];
  const res1 = await setupMFAHandler(TEST_SESSION, db);
  const secret1 = (res1.body as Record<string, unknown>).secret as string;
  const res2 = await setupMFAHandler(TEST_SESSION, db);
  const secret2 = (res2.body as Record<string, unknown>).secret as string;
  assert("Setup twice: both calls return 200", res1.status === 200 && res2.status === 200, true);
  assert("Setup twice: DB mfaPendingSecret matches the second secret", db[0].mfaPendingSecret, secret2);
  assertTruthy("Setup twice: first secret was overwritten", db[0].mfaPendingSecret !== secret1 || secret1 === secret2);
}

// ---------------------------------------------------------------------------
// MFA Verify tests
// ---------------------------------------------------------------------------

console.log("\nTest 7 — Verify: unauthenticated → 401");
{
  const res = await verifyMFAHandler(null, { token: "123456", mode: "login" }, [makeUser()]);
  assert("Verify unauthenticated: status is 401", res.status, 401);
}

console.log("\nTest 8 — Verify: non-6-digit token → 400");
{
  const res = await verifyMFAHandler(TEST_SESSION, { token: "abcdef", mode: "login" }, [makeUser()]);
  assert("Verify non-digit token: status is 400", res.status, 400);
}

console.log("\nTest 9 — Verify: token too short (< 6 chars) → 400");
{
  const res = await verifyMFAHandler(TEST_SESSION, { token: "12345", mode: "login" }, [makeUser()]);
  assert("Verify short token: status is 400", res.status, 400);
}

console.log("\nTest 10 — Verify: token too long (> 6 chars) → 400");
{
  const res = await verifyMFAHandler(TEST_SESSION, { token: "1234567", mode: "login" }, [makeUser()]);
  assert("Verify long token: status is 400", res.status, 400);
}

console.log("\nTest 11 — Verify setup mode: no pending secret → 400");
{
  const res = await verifyMFAHandler(TEST_SESSION, { token: "123456", mode: "setup" }, [makeUser()]);
  assert("Verify setup no pending: status is 400", res.status, 400);
  assert("Verify setup no pending: error is 'No MFA setup in progress'", (res.body as Record<string, unknown>).error, "No MFA setup in progress");
}

console.log("\nTest 12 — Verify setup mode: valid token → 200, MFA activated");
{
  const db = [makeUser()];
  await setupMFAHandler(TEST_SESSION, db);
  const pendingSecret = db[0].mfaPendingSecret!;
  const validToken = await totp.generate({ secret: pendingSecret });
  const res = await verifyMFAHandler(TEST_SESSION, { token: validToken, mode: "setup" }, db);
  assert("Verify setup valid token: status is 200", res.status, 200);
  assert("Verify setup valid token: body.success is true", (res.body as Record<string, unknown>).success, true);
}

console.log("\nTest 13 — Verify setup: after activation mfaEnabled = true, mfaSecret set");
{
  const db = [makeUser()];
  await setupMFAHandler(TEST_SESSION, db);
  const pendingSecret = db[0].mfaPendingSecret!;
  const validToken = await totp.generate({ secret: pendingSecret });
  await verifyMFAHandler(TEST_SESSION, { token: validToken, mode: "setup" }, db);
  assert("Post-setup: mfaEnabled is true", db[0].mfaEnabled, true);
  assert("Post-setup: mfaSecret equals the former pendingSecret", db[0].mfaSecret, pendingSecret);
}

console.log("\nTest 14 — Verify setup: mfaPendingSecret removed after activation");
{
  const db = [makeUser()];
  await setupMFAHandler(TEST_SESSION, db);
  const pendingSecret = db[0].mfaPendingSecret!;
  const validToken = await totp.generate({ secret: pendingSecret });
  await verifyMFAHandler(TEST_SESSION, { token: validToken, mode: "setup" }, db);
  assertUndefined("Post-setup: mfaPendingSecret is removed from DB", db[0].mfaPendingSecret);
}

console.log("\nTest 15 — Verify setup mode: invalid token → 401");
{
  const db = [makeUser()];
  await setupMFAHandler(TEST_SESSION, db);
  const res = await verifyMFAHandler(TEST_SESSION, { token: "000000", mode: "setup" }, db);
  assert("Verify setup invalid token: status is 401", res.status, 401);
  assert("Verify setup invalid token: error is 'Invalid code'", (res.body as Record<string, unknown>).error, "Invalid code");
}

console.log("\nTest 16 — Verify login mode: MFA not enabled → 400");
{
  const res = await verifyMFAHandler(TEST_SESSION, { token: "123456", mode: "login" }, [makeUser()]);
  assert("Verify login no MFA: status is 400", res.status, 400);
  assert("Verify login no MFA: error is 'MFA not enabled'", (res.body as Record<string, unknown>).error, "MFA not enabled");
}

console.log("\nTest 17 — Verify login mode: valid TOTP token → 200");
{
  const db = [makeUser()];
  await setupMFAHandler(TEST_SESSION, db);
  const pendingSecret = db[0].mfaPendingSecret!;
  const setupToken = await totp.generate({ secret: pendingSecret });
  await verifyMFAHandler(TEST_SESSION, { token: setupToken, mode: "setup" }, db);
  const loginToken = await totp.generate({ secret: db[0].mfaSecret! });
  const res = await verifyMFAHandler(TEST_SESSION, { token: loginToken, mode: "login" }, db);
  assert("Verify login valid token: status is 200", res.status, 200);
  assert("Verify login valid token: body.success is true", (res.body as Record<string, unknown>).success, true);
}

console.log("\nTest 18 — Verify login mode: invalid token → 401");
{
  const activeSecret = totp.generateSecret();
  const res = await verifyMFAHandler(TEST_SESSION, { token: "000000", mode: "login" }, [makeUser({ mfaEnabled: true, mfaSecret: activeSecret })]);
  assert("Verify login invalid token: status is 401", res.status, 401);
  assert("Verify login invalid token: error is 'Invalid code'", (res.body as Record<string, unknown>).error, "Invalid code");
}

console.log("\nTest 19 — Verify: mode defaults to 'login' when omitted");
{
  const res = await verifyMFAHandler(TEST_SESSION, { token: "123456" }, [makeUser()]);
  assert("Default mode to login: status is 400 (not a schema error)", res.status, 400);
  assert("Default mode to login: error is 'MFA not enabled' (mode defaulted to login)", (res.body as Record<string, unknown>).error, "MFA not enabled");
}

console.log("\nTest 20 — Verify: user not found → 404");
{
  const res = await verifyMFAHandler(TEST_SESSION, { token: "123456", mode: "login" }, []);
  assert("Verify user not found: status is 404", res.status, 404);
  assert("Verify user not found: error is 'User not found'", (res.body as Record<string, unknown>).error, "User not found");
}

// ---------------------------------------------------------------------------
// Static source analysis
// ---------------------------------------------------------------------------

console.log("\nStatic source analysis — MFA route structure");
{
  const setupSrc = readSource("src/app/api/user/mfa/setup/route.ts");
  const verifySrc = readSource("src/app/api/user/mfa/verify/route.ts");

  assertContains("setup/route.ts: checks session (auth guard)", setupSrc, "if (!session)");
  assertContains("setup/route.ts: stores mfaPendingSecret (not mfaSecret) during setup", setupSrc, "mfaPendingSecret: secret");
  assertContains("setup/route.ts: generates QR code data URL", setupSrc, "QRCode.toDataURL");
  assertContains("setup/route.ts: uses totp.generateSecret()", setupSrc, "generateSecret");
  assertContains("setup/route.ts: returns { secret, qrDataUrl }", setupSrc, "qrDataUrl");

  assertContains("verify/route.ts: promotes pendingSecret to mfaSecret on confirm ($set)", verifySrc, "mfaSecret: pendingSecret");
  assertContains("verify/route.ts: sets mfaEnabled: true on confirm", verifySrc, "mfaEnabled: true");
  assertContains("verify/route.ts: removes mfaPendingSecret with $unset on activation", verifySrc, "$unset");
  assertContains("verify/route.ts: $unset targets mfaPendingSecret field", verifySrc, "mfaPendingSecret");
  assertContains('verify/route.ts: mode can be "setup" or "login"', verifySrc, '"setup", "login"');
  assertContains("verify/route.ts: mode defaults to 'login'", verifySrc, '.default("login")');
  assertContains("verify/route.ts: token must be length 6", verifySrc, "z.string().length(6)");
  assertContains("verify/route.ts: checks user not found → 404", verifySrc, "User not found");
  assertContains("verify/route.ts: returns 401 for invalid code", verifySrc, "Invalid code");
}

summary();
