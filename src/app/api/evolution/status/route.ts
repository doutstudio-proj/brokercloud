import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { brokerId, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get("instanceId");

    if (!instanceId) {
      return NextResponse.json({ success: false, error: "ID da instância não informado" }, { status: 400 });
    }

    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance || instance.brokerId !== brokerId) {
      return NextResponse.json({ success: false, error: "Instância não encontrada" }, { status: 404 });
    }

    if (instance.status === 'DISCONNECTED' || !instance.status) {
      return NextResponse.json({ success: true, status: 'DISCONNECTED' });
    }

    const instanceName = instance.instanceName;

    // Na Evolution GO, usamos GET /instance/status com o Token da Instância
    const evoUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    const response = await fetch(`${evoUrl}/instance/status`, {
      method: 'GET',
      headers: {
        'apikey': instance.instanceToken
      },
    });

    if (response.status === 404 || response.status === 401) {
      // Se a instância não existe na Evolution GO (401/404), reflete no banco
      if (instance.status !== 'DISCONNECTED') {
        await prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: { status: 'DISCONNECTED', qrCode: null }
        });
      }
      return NextResponse.json({ success: true, status: 'DISCONNECTED' });
    }

    const result = await response.json();
    const data = result?.data || result; // Lidar com diferentes formatos de resposta

    if (data?.LoggedIn === true) {
      if (instance.status !== 'CONNECTED') {
        await prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: { status: 'CONNECTED', qrCode: null }
        });
      }
      return NextResponse.json({ success: true, status: 'CONNECTED' });
    }

    // Se connected é false mas existe, ou apenas loggedIn é false, está pendente
    if (data?.LoggedIn === false) {
       // Se o status era CONNECTED e deslogou, atualiza para DISCONNECTED
       if (instance.status === 'CONNECTED') {
         await prisma.whatsAppInstance.update({
            where: { id: instance.id },
            data: { status: 'DISCONNECTED', qrCode: null }
         });
         return NextResponse.json({ success: true, status: 'DISCONNECTED' });
       }
       return NextResponse.json({ success: true, status: instance.status });
    }

    return NextResponse.json({ success: true, status: instance.status });

  } catch (error: any) {
    console.error("[EVOLUTION_STATUS_ERROR]", error);
    return NextResponse.json({ success: false, error: "Erro ao verificar status" }, { status: 500 });
  }
}
