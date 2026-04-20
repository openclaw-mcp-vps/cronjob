import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { ensureDataFiles, findUserById, verifyUserPassword } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await ensureDataFiles();
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await verifyUserPassword(parsed.data.email, parsed.data.password);

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          paid: user.paid
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.paid = user.paid;
      }

      if (token.id) {
        const latest = await findUserById(token.id);
        token.paid = latest?.paid ?? false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.paid = Boolean(token.paid);
      }

      return session;
    }
  }
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function requirePaidUser() {
  const session = await requireUser();
  const cookieStore = await cookies();
  const paidCookie = cookieStore.get("cronjob_paid")?.value;

  if (paidCookie !== "1") {
    redirect("/upgrade");
  }

  return session;
}
