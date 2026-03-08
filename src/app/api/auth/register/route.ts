import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
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
