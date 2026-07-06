import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const broker = await prisma.broker.findUnique({
          where: { email: credentials.email as string },
        });

        if (!broker?.passwordHash) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          broker.passwordHash
        );

        if (!passwordValid) return null;

        return {
          id: broker.id,
          name: broker.name,
          email: broker.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Na primeira autenticação, 'user' vem preenchido
      if (user) {
        token.brokerId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Expõe o brokerId nos dados da sessão
      if (session.user) {
        session.user.id = token.brokerId as string;
      }
      return session;
    },
  },
});
