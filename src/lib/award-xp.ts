/**
 * Server-side helper to award XP for a given action.
 * Silently no-ops if XP was already awarded for this (recipeId, action) pair.
 */
import client from "@/lib/db";
import {
  XP_ACTIONS,
  getTierForXp,
  computeBadges,
  type XpAction,
  type UserProgress,
  type XpLogEntry,
} from "@/lib/xp";

export async function awardXp(
  userId: string,
  recipeId: string,
  action: XpAction
): Promise<void> {
  const db = client.db();
  const col = db.collection<UserProgress>("userProgress");

  let progress = await col.findOne({ userId });

  if (!progress) {
    const initial: UserProgress = {
      userId,
      totalXp: 0,
      currentTier: 1,
      currentTitle: "Home Cook",
      badges: [],
      xpLog: [],
    };
    await col.insertOne(initial);
    progress = await col.findOne({ userId });
  }

  if (!progress) return;

  // Idempotency check
  const alreadyAwarded = progress.xpLog.some(
    (e: XpLogEntry) => e.recipeId === recipeId && e.actions.includes(action)
  );
  if (alreadyAwarded) return;

  const existingEntry = progress.xpLog.find((e: XpLogEntry) => e.recipeId === recipeId);
  const now = new Date();

  let newXpLog: XpLogEntry[];
  if (existingEntry) {
    newXpLog = progress.xpLog.map((e: XpLogEntry) =>
      e.recipeId === recipeId ? { ...e, actions: [...e.actions, action] } : e
    );
  } else {
    newXpLog = [...progress.xpLog, { recipeId, actions: [action], awardedAt: now }];
  }

  const newTotalXp = progress.totalXp + XP_ACTIONS[action];
  const newTier = getTierForXp(newTotalXp);

  const savedRecipes = await db
    .collection("savedRecipes")
    .find({ userId }, { projection: { rating: 1, cookNotes: 1, savedAt: 1 } })
    .toArray() as unknown as { rating?: number; cookNotes?: string; savedAt: Date | string }[];

  const recentRatings = savedRecipes
    .filter((r) => r.rating != null)
    .sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime())
    .map((r) => r.rating as number);

  const newBadges = computeBadges({
    xpLog: newXpLog,
    savedRecipes,
    savedCount: savedRecipes.length,
    recentRatings,
  });

  await col.updateOne(
    { userId },
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
}
