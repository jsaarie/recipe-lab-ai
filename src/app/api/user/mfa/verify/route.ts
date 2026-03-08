import { NextRequest, NextResponse } from "next/server";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import client from "@/lib/db";
import { mfaVerifyLimiter, rateLimitResponse } from "@/lib/rate-limit";

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

const bodySchema = z.object({
  token: z.string().length(6),
  // If "setup" — confirms the pending secret and enables MFA
  // If "login" — verifies against the active secret for MFA challenge
  mode: z.enum(["setup", "login"]).default("login"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // MED-1: Validate ObjectId before use
  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // V-03: Rate limit MFA verification (5 per 15 min per user)
  const rl = mfaVerifyLimiter.check(session.user.id);
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { token, mode } = parsed.data;
  const db = client.db();

  // CRIT-1: Ensure TTL index exists on mfa_used_tokens.expiresAt
  // MongoDB auto-removes documents once expiresAt is reached (expireAfterSeconds: 0)
  await db.collection("mfa_used_tokens").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true }
  );

  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(session.user.id) });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (mode === "setup") {
    const pendingSecret = user.mfaPendingSecret as string | undefined;
    const pendingExpiresAt = user.mfaPendingSecretExpiresAt as Date | undefined;

    if (!pendingSecret) {
      return NextResponse.json({ error: "No MFA setup in progress" }, { status: 400 });
    }

    // HIGH-4: Check pending secret expiry
    if (!pendingExpiresAt || new Date() > new Date(pendingExpiresAt)) {
      await db.collection("users").updateOne(
        { _id: new ObjectId(session.user.id) },
        { $unset: { mfaPendingSecret: "", mfaPendingSecretExpiresAt: "" } }
      );
      return NextResponse.json(
        { error: "MFA setup has expired. Please restart the setup process." },
        { status: 400 }
      );
    }

    // CRIT-1: Check replay — has this token already been used?
    const usedKey = `setup:${session.user.id}:${token}`;
    const alreadyUsed = await db.collection("mfa_used_tokens").findOne({ key: usedKey });
    if (alreadyUsed) {
      return NextResponse.json({ error: "Code already used" }, { status: 401 });
    }

    // MED-5: Correct otplib v13 TOTP class API: verify(token, { secret })
    // Returns a VerifyResult object; check .valid property
    const result = await totp.verify(token, { secret: pendingSecret });
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    // CRIT-1: Record token as used (TTL 90 seconds)
    await db.collection("mfa_used_tokens").insertOne({
      key: usedKey,
      userId: session.user.id,
      token,
      expiresAt: new Date(Date.now() + 90 * 1000),
    });

    // Activate MFA
    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: { mfaEnabled: true, mfaSecret: pendingSecret, updatedAt: new Date() },
        $unset: { mfaPendingSecret: "", mfaPendingSecretExpiresAt: "" },
      }
    );
    return NextResponse.json({ success: true });
  }

  // mode === "login" — verify the active TOTP secret
  const mfaSecret = user.mfaSecret as string | undefined;
  if (!mfaSecret) {
    return NextResponse.json({ error: "MFA not enabled" }, { status: 400 });
  }

  // CRIT-1: Check replay — has this token already been used?
  const usedKey = `login:${session.user.id}:${token}`;
  const alreadyUsed = await db.collection("mfa_used_tokens").findOne({ key: usedKey });
  if (alreadyUsed) {
    return NextResponse.json({ error: "Code already used" }, { status: 401 });
  }

  // MED-5: Correct otplib v13 TOTP class API: verify(token, { secret })
  // Returns a VerifyResult object; check .valid property
  const result = await totp.verify(token, { secret: mfaSecret });
  if (!result.valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  // CRIT-1: Record token as used (TTL 90 seconds)
  await db.collection("mfa_used_tokens").insertOne({
    key: usedKey,
    userId: session.user.id,
    token,
    expiresAt: new Date(Date.now() + 90 * 1000),
  });

  return NextResponse.json({ success: true });
}
