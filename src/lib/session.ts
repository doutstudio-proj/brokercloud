import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

/**
 * Utilitário central de autenticação para rotas de API.
 * Verifica a sessão NextAuth e retorna o brokerId e planId do usuário logado.
 */
export async function requireAuth(): Promise<
  { brokerId: string; planId: string; isTrialExpired: boolean; trialEndsAt: Date | null; error: null } | { brokerId: null; planId: null; isTrialExpired: boolean; trialEndsAt: null; error: NextResponse }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      brokerId: null,
      planId: null,
      isTrialExpired: false,
      trialEndsAt: null,
      error: NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para continuar." },
        { status: 401 }
      ),
    };
  }

  // Buscar o plano no banco para ter o dado sempre atualizado
  const broker = await prisma.broker.findUnique({
    where: { id: session.user.id },
    select: { planId: true, trialEndsAt: true }
  });

  if (!broker) {
    return {
      brokerId: null,
      planId: null,
      isTrialExpired: false,
      trialEndsAt: null,
      error: NextResponse.json(
        { success: false, error: "Conta não encontrada. Faça login novamente." },
        { status: 401 }
      ),
    };
  }

  const isTrialExpired = broker?.planId === "TRIAL" && broker?.trialEndsAt ? broker.trialEndsAt.getTime() < Date.now() : false;

  return { brokerId: session.user.id, planId: broker?.planId || "TRIAL", isTrialExpired, trialEndsAt: broker?.trialEndsAt || null, error: null };
}
