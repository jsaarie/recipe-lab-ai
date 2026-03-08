import { NextResponse } from "next/server";
import { auth } from "@/auth";
import client from "@/lib/db";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { awardXp } from "@/lib/award-xp";

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  cookNotes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const db = client.db();
  const collection = db.collection("savedRecipes");

  const existing = await collection.findOne({
    _id: objectId,
    userId: session.user.id,
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const feedbackCreatedAt = existing.feedbackCreatedAt ?? now;

  await collection.updateOne(
    { _id: objectId },
    {
      $set: {
        rating: parsed.data.rating,
        cookNotes: parsed.data.cookNotes,
        feedbackCreatedAt,
        feedbackUpdatedAt: now,
      },
    }
  );

  // Award XP for rating and/or cook notes (idempotent — won't double-award)
  if (parsed.data.rating !== undefined) {
    await awardXp(session.user.id, id, "rate");
  }
  if (parsed.data.cookNotes?.trim()) {
    await awardXp(session.user.id, id, "notes");
  }

  return NextResponse.json({ updated: true });
}
