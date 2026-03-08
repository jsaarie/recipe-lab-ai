import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import client from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    // V-03: Rate limit forgot-password by IP (5 per hour)
    const ip = getClientIp(req);
    const rl = forgotPasswordLimiter.check(ip);
    if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      // Always return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    const { email } = parsed.data;
    const db = client.db();

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({ success: true });
    }

    // Generate a secure token
    const rawToken = randomBytes(32).toString("hex");
    // Store a hash of the token (so a DB leak doesn't expose valid tokens)
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await db.collection("password_reset_tokens").deleteMany({ userId: user._id });

    await db.collection("password_reset_tokens").insertOne({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      createdAt: new Date(),
    });

    // Build the reset URL
    const baseUrl = process.env.NEXTAUTH_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (emailErr) {
      // Log but don't fail — token is saved; useful during dev without Resend key
      console.warn("[forgot-password] Email send failed, reset link logged above.", emailErr);
      console.log(`[forgot-password] Reset link for ${email}: ${resetUrl}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password] error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
