import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      mfaEnabled: boolean;
      mfaVerified: boolean;
      defaultUnitSystem: "us" | "metric";
      preferredServings: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    mfaEnabled: boolean;
    mfaVerified: boolean;
    defaultUnitSystem: "us" | "metric";
    preferredServings: number | null;
  }
}
