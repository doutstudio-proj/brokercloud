import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EvolutionService } from "@/lib/evolution";
import { requireAuth } from "@/lib/session";
import { limiters, applyRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  // Rate limit: 5 req / 10 min por brokerId (operação pesada)
  const limited = await applyRateLimit(limiters.evolutionQrCode, `qrcode:${brokerId}`);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");

    if (!instanceId) {
      return NextResponse.json({ success: false, error: "ID da instância não informado" }, { status: 400 });
    }

    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: instanceId }
    });

    if (!instance || instance.brokerId !== brokerId) {
      return NextResponse.json({ success: false, error: "Instância não encontrada" }, { status: 404 });
    }

    const webhookUrl = process.env.APP_URL;
    if (!webhookUrl) {
      return NextResponse.json({ success: false, error: "Configure a variável APP_URL no arquivo .env" }, { status: 400 });
    }

    const baseUrl = webhookUrl.replace(/\/$/, "");
    let fullWebhookUrl = `${baseUrl}/api/webhooks/evolution`;
    
    const webhookHeaders: Record<string, string> = {};
    if (process.env.WEBHOOK_SECRET) {
      webhookHeaders['x-webhook-secret'] = process.env.WEBHOOK_SECRET;
      fullWebhookUrl += `?secret=${process.env.WEBHOOK_SECRET}`;
    }

    const instanceName = instance.instanceName;
    const evo = new EvolutionService(instanceName);

    await evo.createInstance();
    const connectRes = await evo.connectInstance(fullWebhookUrl, webhookHeaders);

    if (connectRes?.error && connectRes.error.toLowerCase().includes('already logged in')) {
      await prisma.whatsAppInstance.update({ where: { id: instance.id }, data: { status: 'CONNECTED', qrCode: null } });
      return NextResponse.json({ success: true, data: { connected: true } });
    }

    // A Evolution GO demora um pouco para gerar o QR Code após o connect.
    let qrRes;
    let attempts = 0;
    while (attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      qrRes = await evo.getQRCode();
      const b64 = qrRes?.data?.Qrcode || qrRes?.Qrcode || qrRes?.base64 || qrRes?.qrcode?.base64;
      if (b64) break;
      attempts++;
    }

    if (qrRes?.error && qrRes.error.toLowerCase().includes('already logged in')) {
      await prisma.whatsAppInstance.update({ where: { id: instance.id }, data: { status: 'CONNECTED', qrCode: null } });
      return NextResponse.json({ success: true, data: { connected: true } });
    }

    const qrcodeBase64 = qrRes?.data?.Qrcode || qrRes?.Qrcode || qrRes?.base64 || qrRes?.qrcode?.base64;

    if (!qrcodeBase64) {
       return NextResponse.json({ success: false, error: "Falha ao obter QR Code da Evolution após várias tentativas." }, { status: 500 });
    }

    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: 'QR_READY', qrCode: qrcodeBase64 }
    });

    return NextResponse.json({ success: true, data: { base64: qrcodeBase64 } });
  } catch (error: any) {
    console.error("[EVOLUTION] Erro na rota de QRCode:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
