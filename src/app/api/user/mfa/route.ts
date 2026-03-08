import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import client from "@/lib/db";
import { verifyPassword } from "@/lib/auth-utils";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // MED-1: Validate ObjectId before use
  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const db = client.db();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(session.user.id) });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.mfaEnabled) {
    return NextResponse.json({ error: "MFA is not enabled" }, { status: 400 });
  }

  const passwordValid = await verifyPassword(parsed.data.password, user.password as string);
  if (!passwordValid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(session.user.id) },
    {
      $set: { mfaEnabled: false, updatedAt: new Date() },
      $unset: {
        mfaSecret: "",
        mfaPendingSecret: "",
        mfaPendingSecretExpiresAt: "",
      },
    }
  );

  return NextResponse.json({ success: true });
}
