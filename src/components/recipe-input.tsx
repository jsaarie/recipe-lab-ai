"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RecipeInput() {
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
    // TODO: Call /api/parse-recipe and display result
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Input
            type="url"
            placeholder="Paste a recipe URL..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            className="h-14 rounded-full border-neutral-200 bg-white px-6 text-base text-neutral-700 shadow-sm placeholder:text-neutral-400 focus-visible:ring-[#7C9070]/40"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-14 rounded-full bg-[#7C9070] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#6B7F60] disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
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
              Extracting...
            </span>
          ) : (
            "Extract Recipe"
          )}
        </Button>
      </form>

      {error && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
