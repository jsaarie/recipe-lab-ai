"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <Card className="border-warm-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-lg text-warm-800">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm text-warm-700">Authenticator app enabled</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warm-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg text-warm-800">
          <svg className="h-5 w-5 text-warm-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Security
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-warm-500">
              Add an extra layer of security with an authenticator app (Google Authenticator, Authy, 1Password).
            </p>
            <Button type="button" variant="outline" onClick={startSetup} disabled={loading} className="">
              {loading ? "Setting up…" : "Enable authenticator app"}
            </Button>
          </div>
        )}

        {step === "qr" && (
          <div className="space-y-4">
            <p className="text-sm text-warm-600">
              Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
            </p>
            {qrDataUrl && (
              <div className="inline-block rounded-xl border border-warm-200 bg-white p-3">
                <Image
                  src={qrDataUrl}
                  alt="MFA QR code"
                  width={180}
                  height={180}
                  className="rounded-lg"
                  unoptimized
                />
              </div>
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
                className="w-36 border-warm-200 text-center font-mono tracking-widest focus-visible:ring-primary"
                required
                autoComplete="one-time-code"
              />
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <Button type="submit" className="" disabled={loading || token.length < 6}>
                {loading ? "Confirming…" : "Confirm"}
              </Button>
            </form>
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm text-warm-700">Authenticator app enabled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
