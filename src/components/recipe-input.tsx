"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParsedRecipe } from "@/types/recipe";

interface RecipeInputProps {
  compact?: boolean;
  onRecipeParsed: (recipe: ParsedRecipe, source: "structured" | "ai") => void;
  onLoading: (loading: boolean) => void;
}

export function RecipeInput({ compact, onRecipeParsed, onLoading }: RecipeInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a recipe URL.");
      return;
    }
    if (!validateUrl(trimmed)) {
      setError("Please enter a valid URL (e.g. https://example.com/recipe).");
      return;
    }

    setLoading(true);
    onLoading(true);

    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to extract recipe.");
        return;
      }

      onRecipeParsed(data.recipe, data.source || "ai");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }

  return (
    <div className={`w-full space-y-3 ${compact ? "max-w-xl" : "max-w-xl lg:max-w-none"}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          type="url"
          placeholder="Paste a recipe URL..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError("");
          }}
          className={`rounded-full border-neutral-200 bg-white text-neutral-700 shadow-sm placeholder:text-neutral-400 focus-visible:ring-[#7C9070]/40 ${compact ? "h-10 pl-4 pr-4 text-sm sm:h-11 sm:pr-20" : "h-14 pl-5 pr-4 text-base sm:h-16 sm:pl-7 sm:pr-32 sm:text-lg"}`}
        />
        <Button
          type="submit"
          disabled={loading}
          className={`absolute top-1/2 -translate-y-1/2 hidden rounded-full bg-[#7C9070] font-semibold text-white shadow-sm hover:bg-[#6B7F60] disabled:opacity-50 sm:inline-flex ${compact ? "right-1.5 h-8 px-4 text-sm" : "right-2 h-12 px-7 text-base"}`}
        >
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            "Cook"
          )}
        </Button>
      </form>

      {error && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
