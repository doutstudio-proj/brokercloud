import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isAuthRoute = isOnLogin || nextUrl.pathname.startsWith("/forgot-password") || nextUrl.pathname.startsWith("/reset-password");

      // Se está logado e tenta acessar login/recuperação → redireciona para dashboard
      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      // Rotas de API públicas (register, webhooks)
      const isPublicApi = nextUrl.pathname.startsWith("/api/auth") || nextUrl.pathname.startsWith("/api/webhooks");
      if (isPublicApi) return true;

      // Landing page e arquivos públicos são permitidos
      if (nextUrl.pathname === "/") return true;
      if (nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i)) return true;

      // Tudo o mais requer autenticação
      return isLoggedIn;
    },
  },
  providers: [], // providers completos ficam em auth.ts
};
