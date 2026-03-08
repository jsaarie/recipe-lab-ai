"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getTierForXp } from "@/lib/xp";

export function useCulinaryTitle(): string | null {
  const { data: session } = useSession();
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) { setTitle(null); return; }
    fetch("/api/user/progress")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setTitle(data?.currentTitle ?? getTierForXp(0).title))
      .catch(() => setTitle(getTierForXp(0).title));
  }, [session?.user]);

  return title;
}
