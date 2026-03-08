import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { ProfileForm } from "@/components/auth/profile-form";
import { MfaSetup } from "@/components/auth/mfa-setup";
import client from "@/lib/db";
import { ObjectId } from "mongodb";

export const metadata = { title: "Profile — Recipe Lab AI" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!ObjectId.isValid(session.user.id)) redirect("/login");

  const db = client.db();
  const user = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { password: 0, mfaSecret: 0, mfaPendingSecret: 0 } }
    );

  if (!user) redirect("/login");

  const initials = ((user.name as string) || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur-sm">
        <div className="h-0.5 bg-gradient-to-r from-sage-300/0 via-primary/40 to-sage-300/0" />
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-serif text-lg font-bold text-warm-700">
            Recipe Lab <span className="text-primary">AI</span>
          </Link>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back to kitchen
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Profile header with avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {initials}
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-warm-800">
              {user.name as string}
            </h1>
            <p className="text-sm text-warm-500">{user.email as string}</p>
          </div>
        </div>

        <ProfileForm
          initialName={user.name as string}
          initialUnitSystem={(user.defaultUnitSystem as "us" | "metric") ?? "us"}
          email={user.email as string}
        />
        <MfaSetup mfaEnabled={(user.mfaEnabled as boolean) ?? false} />
      </main>
    </div>
  );
}
