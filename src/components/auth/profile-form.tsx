"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-800">Account</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700" htmlFor="name">
            Display name
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-500 text-sm">Email</label>
          <p className="text-sm text-neutral-700">{email}</p>
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-800">Preferences</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700">Default unit system</label>
          <div className="flex gap-2">
            {(["us", "metric"] as const).map((sys) => (
              <button
                key={sys}
                type="button"
                onClick={() => setUnitSystem(sys)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  unitSystem === sys
                    ? "bg-[#7C9070] border-[#7C9070] text-white"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {sys === "us" ? "US" : "Metric"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="text-sm text-[#7C9070] font-medium">Saved!</span>}
      </div>
    </form>
  );
}
