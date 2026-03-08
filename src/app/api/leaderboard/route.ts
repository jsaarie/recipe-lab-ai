import { NextResponse } from "next/server";
import { auth } from "@/auth";
import client from "@/lib/db";
import type { UserProgress } from "@/lib/xp";

// GET /api/leaderboard
// Returns top 50 users sorted by totalXp, with name, rank title, xp, and badge count.
// Requires authentication.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = client.db();

  // Fetch top 50 by XP
  const topProgress = await db
    .collection<UserProgress>("userProgress")
    .find({})
    .sort({ totalXp: -1 })
    .limit(50)
    .toArray();

  if (topProgress.length === 0) {
    return NextResponse.json({ entries: [], currentUserRank: null });
  }

  // Resolve display names from users collection.
  // userId is stored as ObjectId.toString(); convert back to ObjectId for the query.
  const { ObjectId } = await import("mongodb");
  const userIds = topProgress.map((p) => p.userId);
  const objectIds = userIds.flatMap((id) => {
    try { return [new ObjectId(id)]; } catch { return []; }
  });
  const users = await db
    .collection("users")
    .find({ _id: { $in: objectIds } }, { projection: { _id: 1, name: 1 } })
    .toArray();

  const nameMap = new Map<string, string>();
  for (const u of users) {
    nameMap.set(String(u._id), (u.name as string) ?? "Chef");
  }

  const entries = topProgress.map((p, index) => ({
    rank: index + 1,
    userId: p.userId,
    name: nameMap.get(p.userId) ?? "Chef",
    title: p.currentTitle,
    totalXp: p.totalXp,
    badgeCount: (p.badges ?? []).length,
    isCurrentUser: p.userId === session.user!.id,
  }));

  // If current user is not in top 50, find their rank separately
  let currentUserRank: number | null = null;
  const inTop = entries.find((e) => e.isCurrentUser);
  if (!inTop) {
    const currentProgress = await db
      .collection<UserProgress>("userProgress")
      .findOne({ userId: session.user.id });
    if (currentProgress) {
      const above = await db
        .collection<UserProgress>("userProgress")
        .countDocuments({ totalXp: { $gt: currentProgress.totalXp } });
      currentUserRank = above + 1;
    }
  }

  return NextResponse.json({ entries, currentUserRank });
}
