import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { EvolutionService } from "@/lib/evolution";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { instanceId } = await req.json();

    if (!instanceId) {
      return NextResponse.json({ success: false, error: "ID da instância não informado" }, { status: 400 });
    }

    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: instanceId }
    });

    if (!instance || instance.brokerId !== brokerId) {
      return NextResponse.json({ success: false, error: "Instância não encontrada" }, { status: 404 });
    }

    // Tentar fazer logout na Evolution API (best effort)
    try {
      const evo = new EvolutionService(instance.instanceName);
      await fetch(`${process.env.EVOLUTION_API_URL || 'http://localhost:8080'}/instance/logout/${instance.instanceName}`, {
        method: "DELETE",
        headers: { 'apikey': instance.instanceToken }
      });
    } catch (e) {
      console.warn("Aviso: Falha ao fazer logout na API Evolution", e);
    }

    await prisma.whatsAppInstance.update({
      where: { id: instanceId },
      data: { status: 'DISCONNECTED', qrCode: null }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[EVOLUTION] Erro ao desconectar:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
