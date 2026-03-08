"use client";

import { useEffect, useState } from "react";
import { TIERS } from "@/lib/xp";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  title: string;
  totalXp: number;
  badgeCount: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
}

const TIER_EMOJI = ["🍳", "🥄", "🔪", "👨‍🍳", "⭐", "🏅", "🏆"];

function tierEmojiForTitle(title: string): string {
  const idx = TIERS.findIndex((t) => t.title === title);
  return idx >= 0 ? TIER_EMOJI[idx] : "🍳";
}

interface LeaderboardProps {
  onClose: () => void;
}

export function Leaderboard({ onClose }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-warm-800">Leaderboard</h2>
          <p className="text-sm text-warm-500">Top chefs by XP earned</p>
        </div>
        <button
          onClick={onClose}
          className="whitespace-nowrap rounded-full border border-warm-200 px-3 py-1 text-xs font-medium text-warm-600 hover:bg-warm-50 hover:text-warm-800 transition-colors"
        >
          🍳 Culinary Rank
        </button>
      </div>

      {/* Content */}
      {loading && (
        <div className="py-10 text-center text-sm text-warm-400">Loading leaderboard…</div>
      )}

      {error && (
        <div className="py-10 text-center text-sm text-red-500">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          {data.entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-warm-400">
              No chefs on the board yet. Start cooking!
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.entries.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                    entry.isCurrentUser
                      ? "bg-primary/5 ring-1 ring-primary/20"
                      : "bg-warm-50"
                  }`}
                >
                  {/* Rank */}
                  <span className="w-8 shrink-0 text-center text-xs font-semibold text-warm-400 tabular-nums">
                    #{entry.rank}
                  </span>

                  {/* Name + title */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`truncate text-sm font-medium ${entry.isCurrentUser ? "text-primary" : "text-warm-800"}`}>
                        {entry.name}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="shrink-0 text-[10px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          you
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-warm-400 truncate">
                      {tierEmojiForTitle(entry.title)} {entry.title}
                    </div>
                  </div>

                  {/* XP + badges */}
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-warm-700 tabular-nums">
                      {entry.totalXp.toLocaleString()} XP
                    </div>
                    <div className="text-xs text-warm-400">
                      🎖️ {entry.badgeCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current user outside top 50 */}
          {data.currentUserRank && (
            <p className="text-xs text-warm-400 text-center">
              Your global rank: <span className="font-semibold text-warm-600">#{data.currentUserRank}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
