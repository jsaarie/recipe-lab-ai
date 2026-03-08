import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";
import { registerLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { isCommonPassword } from "@/lib/common-passwords";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
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
    // V-03: Rate limit registration by IP (10 per hour)
    const ip = getClientIp(req);
    const rl = registerLimiter.check(ip);
    if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // V-06: Reject common passwords
    if (isCommonPassword(password)) {
      return NextResponse.json(
        { error: "This password is too common. Please choose a stronger password." },
        { status: 400 }
      );
    }
    const db = client.db();

    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    await db.collection("users").insertOne({
      name,
      email,
      password: passwordHash,
      emailVerified: now, // Auto-verify for now; swap for email flow later
      mfaEnabled: false,
      defaultUnitSystem: "us",
      preferredServings: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[register] error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
