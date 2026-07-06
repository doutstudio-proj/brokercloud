import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EvolutionService } from "@/lib/evolution";

export async function GET() {
  try {
    const { brokerId, error } = await requireAuth();
    if (error) return error;

    const instances = await prisma.whatsAppInstance.findMany({
      where: { brokerId },
      orderBy: { createdAt: 'asc' }
    });

    const enrichedInstances = await Promise.all(instances.map(async (inst) => {
      let connectedPhone = null;
      if (inst.status === 'open' || inst.status === 'CONNECTED') {
        try {
          const res = await fetch(`${process.env.EVOLUTION_API_URL}/instance/connectionState/${inst.instanceName}`, {
            headers: {
              'apikey': inst.instanceToken
            }
          });
          const data = await res.json();
          // Extract phone from jid or owner
          const jid = data?.instance?.owner || data?.instance?.jid;
          if (jid) {
            connectedPhone = jid.split('@')[0];
          }
        } catch (e) {
          console.error("Failed to fetch connection state for", inst.instanceName);
        }
      }
      return { ...inst, connectedPhone };
    }));

    return NextResponse.json({ success: true, instances: enrichedInstances });
  } catch (err: any) {
    console.error("[GET /api/evolution/instances] Error:", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar instâncias" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { brokerId, error } = await requireAuth();
    if (error) return error;

    const { name } = await req.json();
    if (!name || name.trim() === "") {
      return NextResponse.json({ success: false, error: "O nome da instância é obrigatório" }, { status: 400 });
    }

    const broker = await prisma.broker.findUnique({
      where: { id: brokerId },
      include: { whatsappInstances: true }
    });

    if (!broker) {
      return NextResponse.json({ success: false, error: "Corretor não encontrado" }, { status: 404 });
    }

    // Validação de limite pelo plano
    const currentInstancesCount = broker.whatsappInstances.length;
    const maxInstances = broker.planId === "PREMIUM" ? 2 : 1;

    if (currentInstancesCount >= maxInstances) {
      return NextResponse.json({ 
        success: false, 
        error: `Seu plano (${broker.planId}) permite no máximo ${maxInstances} instância(s) do WhatsApp.` 
      }, { status: 403 });
    }

    // Criar a instância no banco
    // Para a Evolution API, precisamos de um nome único global. Vamos usar cuid
    const uniqueHash = Math.random().toString(36).substring(2, 8);
    const instanceName = `broker-${broker.id}-inst-${uniqueHash}`;
    const instanceToken = `token-${instanceName}`;

    // Apenas criamos no banco. O usuário ainda precisa gerar o QR code (que de fato cria na API Evolution).
    const newInstance = await prisma.whatsAppInstance.create({
      data: {
        name,
        instanceName,
        instanceToken,
        status: "DISCONNECTED",
        brokerId
      }
    });

    return NextResponse.json({ success: true, instance: newInstance });

  } catch (err: any) {
    console.error("[POST /api/evolution/instances] Error:", err);
    return NextResponse.json({ success: false, error: "Erro ao criar instância" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { brokerId, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID da instância não informado" }, { status: 400 });
    }

    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id }
    });

    if (!instance || instance.brokerId !== brokerId) {
      return NextResponse.json({ success: false, error: "Instância não encontrada ou não pertence a você" }, { status: 404 });
    }

    // Tenta deletar na API Evolution (best effort)
    try {
      const evo = new EvolutionService(instance.instanceName);
      await fetch(`${process.env.EVOLUTION_API_URL || 'http://localhost:8080'}/instance/delete/${instance.instanceName}`, {
        method: "DELETE",
        headers: { 'apikey': process.env.EVOLUTION_GLOBAL_API_KEY || '' }
      });
    } catch (e) {
      console.warn("Não foi possível excluir a instância na Evolution API:", e);
    }

    // Deleta no banco
    await prisma.whatsAppInstance.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Instância removida com sucesso" });

  } catch (err: any) {
    console.error("[DELETE /api/evolution/instances] Error:", err);
    return NextResponse.json({ success: false, error: "Erro ao excluir instância" }, { status: 500 });
  }
}
