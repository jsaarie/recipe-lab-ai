"use client";

import { useState } from "react";
import { BADGE_DEFS, TIERS, getTierProgress, type BadgeId } from "@/lib/xp";
import { Leaderboard } from "@/components/leaderboard";

interface XpProgressProps {
  totalXp: number;
  currentTier: number;
  currentTitle: string;
  badges: BadgeId[];
}

export function XpProgress({ totalXp, currentTier, currentTitle, badges: badgesProp }: XpProgressProps) {
  const badges = badgesProp ?? [];
  const progress = getTierProgress(totalXp);
  const nextTier = TIERS.find((t) => t.tier === currentTier + 1);
  const xpToNext = nextTier ? nextTier.xpRequired - totalXp : null;
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeBadge, setActiveBadge] = useState<string | null>(null);

  if (showLeaderboard) {
    return <Leaderboard onClose={() => setShowLeaderboard(false)} />;
  }

  return (
    <div id="culinary-rank" className="scroll-mt-20 rounded-2xl border border-warm-200 bg-white p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-warm-800">Culinary Rank</h2>
          <p className="text-sm text-warm-500">{totalXp.toLocaleString()} XP earned</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowLeaderboard(true)}
            className="whitespace-nowrap rounded-full border border-warm-200 px-3 py-1 text-xs font-medium text-warm-600 hover:bg-warm-50 hover:text-warm-800 transition-colors"
            title="View leaderboard"
          >
            🏆 Leaderboard
          </button>
          <span className="whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {currentTitle}
          </span>
        </div>
      </div>

      {/* XP bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-warm-100">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-warm-400">
          <span>Tier {currentTier}</span>
          {nextTier ? (
            <span>{xpToNext?.toLocaleString()} XP to {nextTier.title}</span>
          ) : (
            <span>Max rank reached</span>
          )}
        </div>
      </div>

      {/* Tier ladder */}
      <div className="grid grid-cols-7 gap-1">
        {TIERS.map((tier) => {
          const unlocked = currentTier >= tier.tier;
          return (
            <div
              key={tier.tier}
              title={`${tier.title} (${tier.xpRequired.toLocaleString()} XP)`}
              className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors ${
                unlocked ? "bg-primary/10" : "bg-warm-50"
              }`}
            >
              <span className={`text-base ${unlocked ? "grayscale-0" : "grayscale opacity-30"}`} suppressHydrationWarning>
                {["🍳", "🥄", "🔪", "👨‍🍳", "⭐", "🏅", "🏆"][tier.tier - 1]}
              </span>
              <span
                className={`text-[9px] font-medium leading-tight text-center ${
                  unlocked ? "text-primary" : "text-warm-300"
                }`}
              >
                {tier.title.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Badges */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-warm-700">
          Badges{" "}
          <span className="font-normal text-warm-400">
            {badges.length}/{BADGE_DEFS.length}
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {BADGE_DEFS.map((def) => {
            const unlocked = badges.includes(def.id as BadgeId);
            const isActive = activeBadge === def.id;
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => setActiveBadge(isActive ? null : def.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors w-full ${
                  unlocked
                    ? "border-primary/20 bg-primary/5"
                    : "border-warm-100 bg-warm-50 opacity-40"
                }`}
              >
                <span className="text-2xl" suppressHydrationWarning>{BADGE_EMOJI[def.id] ?? "🎖️"}</span>
                <span className="text-[11px] font-medium leading-tight text-warm-700">
                  {def.name}
                </span>
                {isActive && (
                  <span className="text-[10px] leading-tight text-warm-500 mt-0.5">
                    {unlocked ? def.description : `Locked: ${def.description}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const BADGE_EMOJI: Record<string, string> = {
  first_flame:     "🔥",
  ten_timer:       "⏱️",
  quarter_century: "🎯",
  critics_voice:   "⭐",
  field_notes:     "📝",
  gold_standard:   "🥇",
  ocr_pioneer:     "📷",
  bookworm:        "📚",
  night_owl:       "🦉",
  early_bird:      "🐦",
  five_recipes:    "🍽",
  substitutor:     "🔄",
};
