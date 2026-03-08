"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
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
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm text-center space-y-3">
        <p className="text-2xl">🎉</p>
        <h1 className="text-lg font-semibold text-neutral-800">Account created!</h1>
        <p className="text-sm text-neutral-500">
          You can now{" "}
          <Link href="/login" className="font-medium text-[#7C9070] hover:underline">
            sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-xl font-semibold text-neutral-800">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700" htmlFor="name">
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
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700" htmlFor="email">
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
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, upper, lower, number"
            required
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700" htmlFor="confirm">
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
          />
        </div>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#7C9070] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
