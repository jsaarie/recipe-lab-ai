"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface FeedbackModalProps {
  recipeId: string;
  recipeTitle: string;
  initialRating?: number;
  initialNotes?: string;
  onClose: () => void;
  onSaved: (rating: number | undefined, cookNotes: string) => void;
}

export function FeedbackModal({
  recipeId,
  recipeTitle,
  initialRating,
  initialNotes = "",
  onClose,
  onSaved,
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number | undefined>(initialRating);
  const [hovered, setHovered] = useState<number | undefined>(undefined);
  const [cookNotes, setCookNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/library/${recipeId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, cookNotes: cookNotes.trim() || undefined }),
      });
      if (!res.ok) {
        setError("Failed to save feedback. Please try again.");
        setSaving(false);
        return;
      }
      onSaved(rating, cookNotes.trim());
      onClose();
    } catch {
      setError("Failed to save feedback. Please try again.");
    }
    setSaving(false);
  }, [recipeId, rating, cookNotes, onSaved, onClose]);

  const displayRating = hovered ?? rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white px-5 py-6 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-warm-800">Rate This Recipe</h2>
            <p className="mt-0.5 text-sm text-warm-500 truncate max-w-[260px]">{recipeTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Star selector */}
          <div>
            <p className="mb-2 text-sm font-medium text-warm-600">Rating</p>
            <div className="flex gap-1.5" onMouseLeave={() => setHovered(undefined)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(rating === star ? undefined : star)}
                  onMouseEnter={() => setHovered(star)}
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                  className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`size-9 transition-colors ${
                      displayRating !== undefined && star <= displayRating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-warm-100 text-warm-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating !== undefined && (
              <p className="mt-1.5 text-xs text-warm-400">
                {["", "Poor", "Fair", "Good", "Great", "Amazing!"][rating]}
                {" · "}
                <button
                  onClick={() => setRating(undefined)}
                  className="underline hover:text-warm-600"
                >
                  Clear
                </button>
              </p>
            )}
          </div>

          {/* Cook notes */}
          <div>
            <label
              htmlFor="cook-notes"
              className="mb-2 block text-sm font-medium text-warm-600"
            >
              Cook Notes <span className="font-normal text-warm-400">(optional)</span>
            </label>
            <textarea
              id="cook-notes"
              value={cookNotes}
              onChange={(e) => setCookNotes(e.target.value)}
              placeholder="How did it turn out? What would you change next time?"
              rows={4}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-warm-800 placeholder:text-warm-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-right text-xs text-warm-400">
              {cookNotes.length}/2000
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            onClick={handleSave}
            disabled={saving || (rating === undefined && !cookNotes.trim())}
            className="h-12 w-full rounded-full bg-primary text-base font-semibold text-white shadow-sm hover:bg-sage-500"
          >
            {saving ? "Saving…" : "Save Feedback"}
          </Button>
        </div>
      </div>
    </div>
  );
}
