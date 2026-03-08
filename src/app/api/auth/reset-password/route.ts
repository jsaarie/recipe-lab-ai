import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import client from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";
import { forgotPasswordLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { isCommonPassword } from "@/lib/common-passwords";

const schema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export async function POST(req: NextRequest) {
  try {
    // V-03: Rate limit reset-password by IP (shares forgot-password limiter)
    const ip = getClientIp(req);
    const rl = forgotPasswordLimiter.check(ip);
    if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, email, password } = parsed.data;

    // V-06: Reject common passwords
    if (isCommonPassword(password)) {
      return NextResponse.json(
        { error: "This password is too common. Please choose a stronger password." },
        { status: 400 }
      );
    }
    const db = client.db();

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetRecord = await db.collection("password_reset_tokens").findOne({
      userId: user._id,
      tokenHash,
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      // Clean up expired token if it exists
      if (resetRecord) {
        await db.collection("password_reset_tokens").deleteOne({ _id: resetRecord._id });
      }
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    // Update the password
    const passwordHash = await hashPassword(password);
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { password: passwordHash, updatedAt: new Date() } }
    );

    // Delete all reset tokens for this user
    await db.collection("password_reset_tokens").deleteMany({ userId: user._id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password] error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
