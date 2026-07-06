import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { Providers } from "@/components/Providers";
import { requireAuth } from "@/lib/session";
import { LockScreen } from "@/components/LockScreen";
import { TrialBanner } from "@/components/TrialBanner";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Brokercloud - Dashboard de Corretor",
  description: "Premium Real Estate CRM",
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { planId, isTrialExpired, trialEndsAt } = await requireAuth();
  return (
    <html lang="pt-BR" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-surface text-on-surface overflow-hidden" suppressHydrationWarning>
        <Providers>
          <div className="flex h-screen w-full">
            {/* Navegação Lateral Global */}
            <Sidebar planId={planId || undefined} trialEndsAt={trialEndsAt?.toISOString() || undefined} />

            {/* Área Principal */}
            <main className="flex-1 flex flex-col min-w-0 bg-surface relative">
              {planId === "TRIAL" && !isTrialExpired && (
                <TrialBanner trialEndsAt={trialEndsAt} />
              )}
              {/* Barra Superior Global */}
              <TopNav />

              {/* Se o trial expirar, mostra o LockScreen bloqueando tudo, senão mostra os filhos */}
              {isTrialExpired ? (
                <LockScreen />
              ) : (
                <div className="flex-1 overflow-y-auto">{children}</div>
              )}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
