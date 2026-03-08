import { NextResponse } from "next/server";
import { auth } from "@/auth";
import client from "@/lib/db";
import { z } from "zod";
import {
  XP_ACTIONS,
  getTierForXp,
  computeBadges,
  type XpAction,
  type UserProgress,
  type XpLogEntry,
} from "@/lib/xp";

// ---------------------------------------------------------------------------
// GET /api/user/progress
// Returns the user's full progress document (XP, tier, title, badges).
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = client.db();
  const progress = await db
    .collection<UserProgress>("userProgress")
    .findOne({ userId: session.user.id });

  if (!progress) {
    // Return a zeroed-out progress record for new users
    const { title } = getTierForXp(0);
    return NextResponse.json({
      totalXp: 0,
      currentTier: 1,
      currentTitle: title,
      badges: [],
    });
  }

  return NextResponse.json({
    totalXp: progress.totalXp,
    currentTier: progress.currentTier,
    currentTitle: progress.currentTitle,
    badges: progress.badges,
  });
}

// ---------------------------------------------------------------------------
// POST /api/user/progress/xp
// Awards XP for an action. Idempotent per (recipeId, action) pair.
// Body: { recipeId: string, action: XpAction }
// ---------------------------------------------------------------------------

const xpSchema = z.object({
  recipeId: z.string().min(1),
  action: z.enum(["complete", "rate", "notes", "ocr"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = xpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });
  }

  const { recipeId, action } = parsed.data;
  const xpToAward = XP_ACTIONS[action as XpAction];

  const db = client.db();
  const col = db.collection<UserProgress>("userProgress");

  // Load or initialise the progress document
  let progress = await col.findOne({ userId: session.user.id });

  if (!progress) {
    const initial: UserProgress = {
      userId: session.user.id,
      totalXp: 0,
      currentTier: 1,
      currentTitle: "Home Cook",
      badges: [],
      xpLog: [],
    };
    await col.insertOne(initial);
    progress = await col.findOne({ userId: session.user.id });
  }

  if (!progress) {
    return NextResponse.json({ error: "Failed to initialise progress" }, { status: 500 });
  }

  // Idempotency: skip if this (recipeId, action) was already awarded
  const alreadyAwarded = progress.xpLog.some(
    (e: XpLogEntry) => e.recipeId === recipeId && e.actions.includes(action as XpAction)
  );

  if (alreadyAwarded) {
    return NextResponse.json({ awarded: false, reason: "already_awarded" });
  }

  // Find or create a log entry for this recipe
  const existingEntry = progress.xpLog.find((e: XpLogEntry) => e.recipeId === recipeId);
  const now = new Date();

  let newXpLog: XpLogEntry[];
  if (existingEntry) {
    newXpLog = progress.xpLog.map((e: XpLogEntry) =>
      e.recipeId === recipeId ? { ...e, actions: [...e.actions, action as XpAction] } : e
    );
  } else {
    newXpLog = [
      ...progress.xpLog,
      { recipeId, actions: [action as XpAction], awardedAt: now },
    ];
  }

  const newTotalXp = progress.totalXp + xpToAward;
  const newTier = getTierForXp(newTotalXp);

  // Compute updated badges
  const savedRecipes = await db
    .collection("savedRecipes")
    .find({ userId: session.user.id }, { projection: { rating: 1, cookNotes: 1, savedAt: 1 } })
    .toArray() as unknown as { rating?: number; cookNotes?: string; savedAt: Date | string }[];

  const savedCount = savedRecipes.length;
  const recentRatings = savedRecipes
    .filter((r) => r.rating != null)
    .sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime())
    .map((r) => r.rating as number);

  const newBadges = computeBadges({
    xpLog: newXpLog,
    savedRecipes,
    savedCount,
    recentRatings,
  });

  await col.updateOne(
    { userId: session.user.id },
    {
      $set: {
        totalXp: newTotalXp,
        currentTier: newTier.tier,
        currentTitle: newTier.title,
        badges: newBadges,
        xpLog: newXpLog,
      },
    }
  );

  return NextResponse.json({
    awarded: true,
    xpAwarded: xpToAward,
    totalXp: newTotalXp,
    currentTier: newTier.tier,
    currentTitle: newTier.title,
    newBadges,
  });
}
