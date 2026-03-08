import { NextResponse } from "next/server";
import { auth } from "@/auth";
import client from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
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

  const db = client.db();
  const doc = await db
    .collection("savedRecipes")
    .findOne({ _id: objectId, userId: session.user.id });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    _id: doc._id.toString(),
    userId: doc.userId,
    savedAt: doc.savedAt,
    recipe: doc.recipe,
    servings: doc.servings,
    ingredientSwaps: doc.ingredientSwaps,
    unitSystem: doc.unitSystem,
  });
}

export async function DELETE(
  _req: Request,
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

  const db = client.db();
  const result = await db
    .collection("savedRecipes")
    .deleteOne({ _id: objectId, userId: session.user.id });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
