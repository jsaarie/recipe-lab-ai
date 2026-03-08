"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MfaSetupProps {
  mfaEnabled: boolean;
}

export function MfaSetup({ mfaEnabled: initialEnabled }: MfaSetupProps) {
  const [mfaEnabled, setMfaEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<"idle" | "qr" | "done">("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/user/mfa/setup", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError("Failed to start MFA setup.");
      return;
    }
    setQrDataUrl(data.qrDataUrl);
    setStep("qr");
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/user/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, mode: "setup" }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid code. Scan the QR again and retry.");
      return;
    }
    setMfaEnabled(true);
    setStep("done");
  }

  if (mfaEnabled && step !== "done") {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
        <h2 className="text-base font-semibold text-neutral-800">Security</h2>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#7C9070]" />
          <p className="text-sm text-neutral-700">Authenticator app enabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">Security</h2>

      {step === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-500">
            Add an extra layer of security with an authenticator app (Google Authenticator, Authy, 1Password).
          </p>
          <Button type="button" variant="outline" onClick={startSetup} disabled={loading}>
            {loading ? "Setting up…" : "Enable authenticator app"}
          </Button>
        </div>
      )}

      {step === "qr" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
          </p>
          {qrDataUrl && (
            <Image
              src={qrDataUrl}
              alt="MFA QR code"
              width={180}
              height={180}
              className="rounded-lg border border-neutral-200"
              unoptimized
            />
          )}
          <form onSubmit={confirmSetup} className="space-y-3">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-36 text-center font-mono tracking-widest"
              required
              autoComplete="one-time-code"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading || token.length < 6}>
              {loading ? "Confirming…" : "Confirm"}
            </Button>
          </form>
        </div>
      )}

      {step === "done" && (
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#7C9070]" />
          <p className="text-sm text-neutral-700">Authenticator app enabled</p>
        </div>
      )}
    </div>
  );
}
