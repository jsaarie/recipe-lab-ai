"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyMfaPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // MED-4: Guard — redirect if no session or already verified
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (session?.user?.mfaVerified) {
      router.replace("/");
    }
  }, [status, session, router]);

  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  if (session?.user?.mfaVerified) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/user/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, mode: "login" }),
    });

    if (!res.ok) {
      setLoading(false);
      setError("Invalid code. Please try again.");
      return;
    }

    // Update session to mark mfaVerified = true
    await update({ mfaVerified: true });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="mb-2 text-xl font-semibold text-neutral-800">Two-factor auth</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Open your authenticator app and enter the 6-digit code.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="text-center text-xl tracking-[0.5em] font-mono"
          required
          autoFocus
          autoComplete="one-time-code"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || token.length < 6}>
          {loading ? "Verifying…" : "Verify"}
        </Button>
      </form>
    </div>
  );
}
