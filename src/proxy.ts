import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Next.js 16 requer export nomeado "proxy" (equivalente ao middleware.ts do Next.js 15)
export const proxy = auth((req) => {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host') || '';

  // Se for o subdomínio do App (ex: app.seudominio.com) e acessar a raiz, redireciona pro dashboard
  if (hostname.startsWith('app.')) {
    if (url.pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Protege todas as rotas exceto:
     * - /login
     * - /api/auth/* (rotas do NextAuth)
     * - arquivos estáticos do Next.js (_next/static, _next/image, favicon.ico)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
