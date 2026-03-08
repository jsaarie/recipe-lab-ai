"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/* Password strength meter                                             */
/* ------------------------------------------------------------------ */

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: "Weak", color: "bg-red-400" };
  if (score <= 3) return { score, label: "Fair", color: "bg-yellow-400" };
  if (score <= 4) return { score, label: "Good", color: "bg-primary/70" };
  return { score, label: "Strong", color: "bg-primary" };
}

function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? color : "bg-warm-200"}`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 2 ? "text-red-500" : score <= 3 ? "text-yellow-600" : "text-primary"}`}>
        {label}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Register form                                                       */
/* ------------------------------------------------------------------ */

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);

  // Inline validation
  const confirmMismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Registration failed. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <Card className="border-warm-200 shadow-md text-center">
        <CardContent className="pt-2 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <h1 className="font-serif text-lg font-semibold text-warm-800">Account created!</h1>
          <p className="text-sm text-warm-500">
            You can now{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              sign in
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-warm-200 shadow-md ${shake ? "animate-shake" : ""}`}>
      <CardHeader>
        <CardTitle className="font-serif text-xl text-warm-800">Create an account</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-warm-700" htmlFor="name">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
              className="border-warm-200 focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-warm-700" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="border-warm-200 focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-warm-700" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, upper, lower, number, special"
              required
              autoComplete="new-password"
              className="border-warm-200 focus-visible:ring-primary"
            />
            <PasswordStrength password={password} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-warm-700" htmlFor="confirm">
              Confirm password
            </label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className={`border-warm-200 focus-visible:ring-primary ${confirmMismatch ? "border-red-300 focus-visible:ring-red-400" : ""}`}
            />
            {confirmMismatch && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-warm-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
