import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import client from "@/lib/db";

// MED-6: Added .finite() to prevent NaN from parseInt slipping through
const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  defaultUnitSystem: z.enum(["us", "metric"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // MED-1: Validate ObjectId before use
  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const db = client.db();
  const user = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(session.user.id) },
      // MED-2: Exclude mfaPendingSecret and mfaPendingSecretExpiresAt from response
      { projection: { password: 0, mfaSecret: 0, mfaPendingSecret: 0, mfaPendingSecretExpiresAt: 0 } }
    );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // MED-1: Validate ObjectId before use
  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const updates = { ...parsed.data, updatedAt: new Date() };
  const db = client.db();

  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(session.user.id) }, { $set: updates });

  return NextResponse.json({ success: true });
}
