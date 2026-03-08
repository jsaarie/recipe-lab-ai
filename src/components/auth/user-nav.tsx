"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Settings, BookOpen } from "lucide-react";

export function UserNav() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (status === "loading") {
    return <div className="h-8 w-16 rounded-full bg-neutral-200 animate-pulse" />;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-[#7C9070] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6a7d60] transition-colors"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : session.user.email?.[0].toUpperCase() ?? "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C9070] text-white text-xs font-semibold hover:bg-[#6a7d60] transition-colors"
        aria-label="User menu"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? ""}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-2 border-b border-neutral-100">
            <p className="text-sm font-medium text-neutral-800 truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-neutral-400 truncate">{session.user.email}</p>
          </div>
          <Link
            href="/library"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            My Library
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Profile
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// Shown in the hero landing state header (no compact input, just nav)
export function UserNavPlaceholder() {
  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-neutral-400" />
    </div>
  );
}
