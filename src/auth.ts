import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { z } from "zod";
import client from "@/lib/db";
import { verifyPassword } from "@/lib/auth-utils";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(client),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const db = client.db();
        const user = await db
          .collection("users")
          .findOne({ email: parsed.data.email });

        if (!user) return null;
        if (!user.emailVerified) return null;

        const valid = await verifyPassword(parsed.data.password, user.password as string);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email as string,
          name: user.name as string,
          image: (user.image as string | undefined) ?? null,
          mfaEnabled: (user.mfaEnabled as boolean) ?? false,
          defaultUnitSystem: (user.defaultUnitSystem as "us" | "metric") ?? "us",
          preferredServings: (user.preferredServings as number | null) ?? null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        const u = user as Record<string, unknown>;
        token.mfaEnabled = (u.mfaEnabled as boolean) ?? false;
        token.mfaVerified = token.mfaEnabled ? false : true;
        token.defaultUnitSystem = (u.defaultUnitSystem as "us" | "metric") ?? "us";
        token.preferredServings = (u.preferredServings as number | null) ?? null;
      }
      if (trigger === "update" && (session as Record<string, unknown>)?.mfaVerified === true) {
        token.mfaVerified = true;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as JWT;
      session.user.id = t.id as string;
      session.user.mfaEnabled = t.mfaEnabled as boolean ?? false;
      session.user.mfaVerified = t.mfaVerified as boolean ?? false;
      session.user.defaultUnitSystem = (t.defaultUnitSystem as "us" | "metric") ?? "us";
      session.user.preferredServings = (t.preferredServings as number | null) ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
