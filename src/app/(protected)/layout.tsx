import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.mfaEnabled && !session.user.mfaVerified) {
    redirect("/verify-mfa");
  }

  return <>{children}</>;
}
