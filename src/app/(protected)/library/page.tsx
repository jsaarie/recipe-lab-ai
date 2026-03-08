"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { CookbookUpload } from "@/components/cookbook-upload";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LibraryEntry {
  _id: string;
  title: string;
  source: string;
  totalTime: string;
  servings: number;
  ingredientCount?: number;
  savedAt: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSiteName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Generate a warm color from recipe title for the placeholder thumbnail
function getTitleColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [25, 35, 45, 80, 90, 120, 140, 160]; // warm + sage hues
  const hue = hues[Math.abs(hash) % hues.length];
  return `hsl(${hue}, 35%, 88%)`;
}

type SortOption = "newest" | "alphabetical" | "cookTime";

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recipes, setRecipes] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/library");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/library")
        .then((r) => r.json())
        .then((data) => {
          setRecipes(data);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load recipes");
          setLoading(false);
        });
    }
  }, [status, router]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r._id !== id));
    }
    setDeleting(null);
    setDeleteConfirm(null);
  };

  const handleOpen = (id: string) => {
    router.push(`/?saved=${id}`);
  };

  // Filtered + sorted recipes
  const displayedRecipes = useMemo(() => {
    let result = recipes;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        getSiteName(r.source).toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "alphabetical":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "cookTime":
        result = [...result].sort((a, b) => (a.totalTime || "").localeCompare(b.totalTime || ""));
        break;
      case "newest":
      default:
        // Already sorted by savedAt desc from API
        break;
    }
    return result;
  }, [recipes, search, sort]);

  const userName = session?.user?.name?.split(" ")[0] || "My";

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-background">
        <header className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur-sm"><div className="h-0.5 bg-gradient-to-r from-sage-300/0 via-primary/40 to-sage-300/0" /><div className="border-b border-warm-200 px-3 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link href="/" className="font-serif text-lg font-bold text-warm-700">
              Recipe Lab <span className="text-primary">AI</span>
            </Link>
            <UserNav />
          </div>
        </div>
        </header>
        <main className="w-full max-w-3xl px-4 py-8 space-y-4">
          {/* Skeleton loading */}
          <div className="skeleton-shimmer h-8 w-48 rounded" />
          <div className="skeleton-shimmer h-10 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer h-40 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background">
      <header className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur-sm"><div className="h-0.5 bg-gradient-to-r from-sage-300/0 via-primary/40 to-sage-300/0" /><div className="border-b border-warm-200 px-3 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-serif text-lg font-bold text-warm-700">
            Recipe Lab <span className="text-primary">AI</span>
          </Link>
          <UserNav />
        </div>
      </div>
      </header>

      {showUpload && <CookbookUpload onClose={() => setShowUpload(false)} />}

      <main className="w-full max-w-3xl px-4 py-8 space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-warm-800">
              {userName}&apos;s Library
            </h1>
            {recipes.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
              </Badge>
            )}
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-sage-500 active:scale-[0.97] transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Add from Cookbook
          </button>
        </div>

        {/* Search & Sort bar */}
        {recipes.length > 0 && (
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search recipes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-warm-200 bg-white py-2.5 pl-9 pr-3 text-sm text-warm-700 placeholder:text-warm-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="shrink-0 rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-warm-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="newest">Newest</option>
              <option value="alphabetical">A–Z</option>
              <option value="cookTime">Cook time</option>
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Empty state */}
        {recipes.length === 0 && !error && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-warm-300 bg-warm-50/50 p-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                <line x1="12" y1="8" x2="12" y2="14" />
                <line x1="9" y1="11" x2="15" y2="11" />
              </svg>
            </div>
            <p className="text-lg font-medium text-warm-700">Your library is empty</p>
            <p className="mt-1 max-w-xs text-sm text-warm-500">
              Parse a recipe and tap &quot;Save&quot; to start building your personal cookbook.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-sage-500 active:scale-[0.97] transition-all"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Parse your first recipe
            </Link>
          </div>
        )}

        {/* No search results */}
        {recipes.length > 0 && displayedRecipes.length === 0 && search.trim() && (
          <p className="py-8 text-center text-sm text-warm-500">
            No recipes match &quot;{search}&quot;
          </p>
        )}

        {/* Recipe grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {displayedRecipes.map((r) => (
            <Card
              key={r._id}
              className="group card-hover cursor-pointer overflow-hidden border-warm-200 bg-white"
            >
              {/* Color thumbnail placeholder */}
              <div
                className="flex h-20 items-end px-4 pb-2"
                style={{ backgroundColor: getTitleColor(r.title) }}
                onClick={() => handleOpen(r._id)}
              >
                <span className="text-xs font-medium text-warm-700/60">
                  {getSiteName(r.source)}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => handleOpen(r._id)}
                  className="text-left"
                >
                  <h3 className="font-serif font-semibold text-warm-800 group-hover:text-primary transition-colors line-clamp-2">
                    {r.title}
                  </h3>
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  {r.totalTime && (
                    <Badge variant="secondary" className="gap-1 text-xs font-normal">
                      <svg className="h-3 w-3 text-sage-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {r.totalTime}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1 text-xs font-normal">
                    <svg className="h-3 w-3 text-sage-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    {r.servings}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-warm-400">
                    Saved {formatDate(r.savedAt)}
                  </span>
                  {/* Delete — two-tap confirm */}
                  {deleteConfirm === r._id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(r._id)}
                        disabled={deleting === r._id}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        {deleting === r._id ? "..." : "Delete"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded px-2 py-1 text-xs text-warm-500 hover:bg-warm-100 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(r._id); }}
                      className="rounded p-1.5 text-warm-300 cursor-pointer transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Delete recipe"
                      aria-label="Delete recipe"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M6.67 7.33v4M9.33 7.33v4M3.33 4l.67 9.33a1.33 1.33 0 001.33 1.34h5.34a1.33 1.33 0 001.33-1.34L12.67 4" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
