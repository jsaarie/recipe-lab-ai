// XP engine — tiers, badges, and award logic for v4.1 Culinary RPG

export const XP_ACTIONS = {
  complete: 100,
  rate: 15,
  notes: 20,
  ocr: 50,
  extract: 5,
  substitute: 10,
} as const;

export type XpAction = keyof typeof XP_ACTIONS;

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

export interface Tier {
  tier: number;
  title: string;
  xpRequired: number;
}

export const TIERS: Tier[] = [
  { tier: 1, title: "Home Cook",       xpRequired: 0 },
  { tier: 2, title: "Prep Cook",       xpRequired: 200 },
  { tier: 3, title: "Line Cook",       xpRequired: 500 },
  { tier: 4, title: "Sous Chef",       xpRequired: 1200 },
  { tier: 5, title: "Head Chef",       xpRequired: 2500 },
  { tier: 6, title: "Executive Chef",  xpRequired: 5000 },
  { tier: 7, title: "Iron Chef",        xpRequired: 10000 },
];

export function getTierForXp(xp: number): Tier {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (xp >= tier.xpRequired) current = tier;
  }
  return current;
}

/** Returns progress (0–1) toward the next tier, or 1 if at max tier. */
export function getTierProgress(xp: number): number {
  const current = getTierForXp(xp);
  const nextIndex = current.tier; // tier is 1-indexed; TIERS[tier] is next
  if (nextIndex >= TIERS.length) return 1;
  const next = TIERS[nextIndex];
  const range = next.xpRequired - current.xpRequired;
  const earned = xp - current.xpRequired;
  return Math.min(earned / range, 1);
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  // Core
  { id: "first_flame",      name: "First Flame",      description: "Complete your first recipe" },
  { id: "ten_timer",        name: "Ten Timer",         description: "Complete 10 recipes" },
  { id: "quarter_century",  name: "Quarter Century",   description: "Complete 25 recipes" },
  { id: "critics_voice",    name: "Critic's Voice",    description: "Submit your first rating" },
  { id: "field_notes",      name: "Field Notes",       description: "Add your first cook notes" },
  { id: "gold_standard",    name: "Gold Standard",     description: "Rate 3 recipes 5 stars in a row" },
  // Extended
  { id: "ocr_pioneer",      name: "OCR Pioneer",       description: "Scan your first recipe via OCR" },
  { id: "bookworm",         name: "Bookworm",          description: "Save 20 recipes to your library" },
  { id: "night_owl",        name: "Night Owl",         description: "Complete a recipe after 10 PM" },
  { id: "early_bird",       name: "Early Bird",        description: "Complete a recipe before 8 AM" },
  { id: "five_recipes",     name: "Kitchen Regular",   description: "Complete 5 recipes" },
  { id: "substitutor",      name: "The Substitutor",   description: "Make an ingredient substitution" },
];

export const BADGE_MAP = Object.fromEntries(BADGE_DEFS.map((b) => [b.id, b]));

export type BadgeId = (typeof BADGE_DEFS)[number]["id"];

// ---------------------------------------------------------------------------
// UserProgress shape (mirrors MongoDB document)
// ---------------------------------------------------------------------------

export interface XpLogEntry {
  recipeId: string;
  actions: XpAction[];
  awardedAt: Date;
}

export interface UserProgress {
  userId: string;
  totalXp: number;
  currentTier: number;
  currentTitle: string;
  badges: BadgeId[];
  xpLog: XpLogEntry[];
}

// ---------------------------------------------------------------------------
// Badge computation
// ---------------------------------------------------------------------------

interface BadgeInput {
  xpLog: XpLogEntry[];
  /** All saved recipes for the user (from savedRecipes collection) */
  savedRecipes: {
    rating?: number;
    cookNotes?: string;
    savedAt: Date | string;
  }[];
  savedCount: number;
  /** Ratings in chronological order (newest last) */
  recentRatings: number[];
}

export function computeBadges(input: BadgeInput): BadgeId[] {
  const { xpLog, savedRecipes, savedCount, recentRatings } = input;

  const completions = xpLog.filter((e) => e.actions.includes("complete"));
  const hasRated = xpLog.some((e) => e.actions.includes("rate"));
  const hasNotes = xpLog.some((e) => e.actions.includes("notes"));
  const hasOcr = xpLog.some((e) => e.actions.includes("ocr"));

  const earned: BadgeId[] = [];

  const hasSubstitute = xpLog.some((e) => e.actions.includes("substitute"));

  if (completions.length >= 1) earned.push("first_flame");
  if (completions.length >= 5) earned.push("five_recipes");
  if (completions.length >= 10) earned.push("ten_timer");
  if (completions.length >= 25) earned.push("quarter_century");
  if (hasRated) earned.push("critics_voice");
  if (hasNotes) earned.push("field_notes");
  if (hasOcr) earned.push("ocr_pioneer");
  if (hasSubstitute) earned.push("substitutor");
  if (savedCount >= 20) earned.push("bookworm");

  // Gold Standard: 3 most recent ratings all 5 stars
  if (recentRatings.length >= 3 && recentRatings.slice(-3).every((r) => r === 5)) {
    earned.push("gold_standard");
  }

  // Night Owl / Early Bird — check completion timestamps
  for (const entry of completions) {
    const hour = new Date(entry.awardedAt).getHours();
    if (hour >= 22 || hour < 0) earned.push("night_owl");
    if (hour < 8) earned.push("early_bird");
  }

  // Deduplicate
  return [...new Set(earned)];
}
