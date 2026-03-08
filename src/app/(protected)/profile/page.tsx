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

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-[#FAF8F5]/95 px-3 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-neutral-700">
            Recipe Lab <span className="text-[#7C9070]">AI</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold text-neutral-800">Profile</h1>
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
