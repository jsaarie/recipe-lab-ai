import { NextResponse } from "next/server";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import QRCode from "qrcode";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import client from "@/lib/db";
import { mfaSetupLimiter, rateLimitResponse } from "@/lib/rate-limit";

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // MED-1: Validate ObjectId before use
  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // V-03: Rate limit MFA setup (5 per 15 min per user)
  const rl = mfaSetupLimiter.check(session.user.id);
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

  // generateSecret() and toURI() are synchronous in otplib v13
  const secret = totp.generateSecret();
  const otpauthUrl = totp.toURI({
    secret,
    label: session.user.email ?? "",
    issuer: "Recipe Lab AI",
  });

  // Store pending secret (not yet active — confirmed in /verify)
  // HIGH-4: Also store expiry — setup window is 10 minutes
  const db = client.db();
  await db
    .collection("users")
    .updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          mfaPendingSecret: secret,
          mfaPendingSecretExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          updatedAt: new Date(),
        },
      }
    );

  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({ secret, qrDataUrl });
}
