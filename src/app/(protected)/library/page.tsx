"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserNav } from "@/components/auth/user-nav";

interface LibraryEntry {
  _id: string;
  title: string;
  source: string;
  totalTime: string;
  servings: number;
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

export default function LibraryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [recipes, setRecipes] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

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
    if (!confirm("Delete this saved recipe?")) return;
    setDeleting(id);
    const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r._id !== id));
    }
    setDeleting(null);
  };

  const handleOpen = (id: string) => {
    router.push(`/?saved=${id}`);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-[#FAF8F5]">
        <header className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-[#FAF8F5]/95 px-3 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <a href="/" className="text-lg font-bold text-neutral-700">
              Recipe Lab <span className="text-[#7C9070]">AI</span>
            </a>
            <UserNav />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center text-neutral-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FAF8F5]">
      <header className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-[#FAF8F5]/95 px-3 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <a href="/" className="text-lg font-bold text-neutral-700">
            Recipe Lab <span className="text-[#7C9070]">AI</span>
          </a>
          <UserNav />
        </div>
      </header>

      <main className="w-full max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-neutral-800">My Library</h1>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {recipes.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
            <p className="text-lg font-medium">No saved recipes yet</p>
            <p className="mt-1 text-sm">
              Parse a recipe and tap &quot;Save&quot; to add it to your library.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {recipes.map((r) => (
            <div
              key={r._id}
              className="group flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                onClick={() => handleOpen(r._id)}
                className="flex-1 text-left"
              >
                <h3 className="font-semibold text-neutral-800 group-hover:text-[#7C9070] transition-colors">
                  {r.title}
                </h3>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
                  <span>{getSiteName(r.source)}</span>
                  {r.totalTime && <span>{r.totalTime}</span>}
                  <span>{r.servings} servings</span>
                  <span>Saved {formatDate(r.savedAt)}</span>
                </div>
              </button>
              <button
                onClick={() => handleDelete(r._id)}
                disabled={deleting === r._id}
                className="ml-3 shrink-0 rounded p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Delete recipe"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M6.67 7.33v4M9.33 7.33v4M3.33 4l.67 9.33a1.33 1.33 0 001.33 1.34h5.34a1.33 1.33 0 001.33-1.34L12.67 4" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
