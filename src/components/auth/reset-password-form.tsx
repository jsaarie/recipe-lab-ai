"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!token || !email) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 font-serif text-xl font-semibold text-warm-800">Password reset</h1>
        <p className="mb-6 text-sm text-warm-600">
          Your password has been updated successfully. You can now sign in with your new password.
        </p>
        <Link href="/login">
          <Button className="w-full">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
      <h1 className="mb-2 font-serif text-xl font-semibold text-warm-800">Reset your password</h1>
      <p className="mb-6 text-sm text-warm-600">
        Enter a new password for <strong>{email || "your account"}</strong>.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-warm-700" htmlFor="password">
            New password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, upper, lower, number, special"
            required
            autoComplete="new-password"
            minLength={8}
          />
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
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-warm-500">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
