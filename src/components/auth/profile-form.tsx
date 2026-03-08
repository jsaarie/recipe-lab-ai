"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileFormProps {
  initialName: string;
  initialUnitSystem: "us" | "metric";
  email: string;
}

export function ProfileForm({
  initialName,
  initialUnitSystem,
  email,
}: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [unitSystem, setUnitSystem] = useState(initialUnitSystem);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        defaultUnitSystem: unitSystem,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Failed to save. Please try again.");
    } else {
      setSaved(true);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Account */}
      <Card className="border-warm-200">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-warm-800">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-warm-700" htmlFor="name">
              Display name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-warm-200 focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-warm-500">Email</label>
            <p className="text-sm text-warm-700">{email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-warm-200">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-warm-800">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-warm-700">Default unit system</label>
            <div className="flex gap-2">
              {(["us", "metric"] as const).map((sys) => (
                <button
                  key={sys}
                  type="button"
                  onClick={() => setUnitSystem(sys)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                    unitSystem === sys
                      ? "bg-primary border-primary text-white"
                      : "border-warm-300 text-warm-600 hover:border-warm-400"
                  }`}
                >
                  {sys === "us" ? "US" : "Metric"}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
