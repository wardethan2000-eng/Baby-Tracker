import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type UserDesignation = "PARENT" | "CARETAKER" | "BABYSITTER";

async function getUserDesignation(userId: string): Promise<UserDesignation> {
  const [row] = await prisma.$queryRaw<{ designation: UserDesignation }[]>(Prisma.sql`
    SELECT designation::text AS designation FROM "User" WHERE id = ${userId}
  `);
  return row?.designation || "PARENT";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  logger: {
    error(error) {
      if (error.name === "JWTSessionError") return;
      console.error(error);
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          onboardingDone: user.onboardingDone,
          designation: await getUserDesignation(user.id),
          paidAt: user.paidAt?.toISOString() || null,
          trialEndsAt: user.trialEndsAt?.toISOString() || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.onboardingDone = (user as any).onboardingDone;
        token.designation = (user as any).designation;
        token.paidAt = (user as any).paidAt;
        token.trialEndsAt = (user as any).trialEndsAt;
      }
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) {
          token.onboardingDone = dbUser.onboardingDone;
          token.designation = await getUserDesignation(dbUser.id);
          token.paidAt = dbUser.paidAt?.toISOString() || null;
          token.trialEndsAt = dbUser.trialEndsAt?.toISOString() || null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.onboardingDone = token.onboardingDone as boolean;
        session.user.designation = token.designation as any;
        session.user.paidAt = (token.paidAt as string | null) || null;
        session.user.trialEndsAt = (token.trialEndsAt as string | null) || null;
      }
      return session;
    },
  },
});
