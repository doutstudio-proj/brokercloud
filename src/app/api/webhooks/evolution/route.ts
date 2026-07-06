import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadMediaToR2 } from '@/lib/storage';
import { eventBus } from '@/lib/events';
import { checkLeadLimit } from '@/lib/limits';
import { limiters, getClientIp, applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit: 200 req / minuto por IP (picos normais da Evolution GO)
    const ip = getClientIp(request);
    const limited = await applyRateLimit(limiters.webhookEvolution, `webhook-evo:${ip}`);
    if (limited) return limited;

    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const searchParams = new URL(request.url).searchParams;
      const querySecret = searchParams.get('secret');
      const headerSecret = request.headers.get('x-webhook-secret') || request.headers.get('webhook-secret');
      
      if (headerSecret !== webhookSecret && querySecret !== webhookSecret) {
        console.warn('[WEBHOOK] Tentativa não autorizada — secret inválido ou ausente');
        console.warn('Headers recebidos:', Object.fromEntries(request.headers.entries()));
        // Temporariamente desativado até o usuário reconectar as instâncias
        // return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    
    // LOG PARA DEBUG DA EVOLUTION GO
    console.log('[WEBHOOK EVOLUTION GO RAW]', JSON.stringify(body, null, 2));

    // A Evolution GO pode mandar os eventos em lowercase (ex: 'messages.upsert') ou com chaves diferentes.
    // Vamos garantir que pegamos o evento e normalizamos.
    const event = (body.event || body.eventString || "").toUpperCase();
    const instanceName = body.instance || body.instanceName;
    
    // Na Evolution GO, o evento de mensagem recebida é "MESSAGE" ou "SEND_MESSAGE"
    // Na Evolution Clássica, é "MESSAGES_UPSERT"
    const isValidEvent = 
      event.includes('MESSAGE') || // Pega MESSAGE, MESSAGES_UPSERT, SEND_MESSAGE
      event.includes('CONNECTION') || // Pega CONNECTION_UPDATE
      event.includes('QRCODE'); // Pega QRCODE_UPDATED
      
    if (!isValidEvent) {
      return NextResponse.json({ success: true });
    }

    // Handle QR Code Updates
    if (event.includes('QRCODE')) {
      const qrcodeBase64 = body.data?.qrcode?.base64 || body.qrcode?.base64;
      if (qrcodeBase64) {
        await prisma.whatsAppInstance.updateMany({
          where: { instanceName: instanceName },
          data: { qrCode: qrcodeBase64, status: 'QR_READY' }
        });
      }
      return NextResponse.json({ success: true });
    }

    // Handle Connection Updates
    if (event.includes('CONNECTION')) {
      const state = body.data?.state;
      const statusMap: Record<string, string> = {
        'open': 'CONNECTED',
        'close': 'DISCONNECTED',
        'connecting': 'QR_READY'
      };

      if (state && statusMap[state]) {
        await prisma.whatsAppInstance.updateMany({
          where: { instanceName: instanceName },
          data: { status: statusMap[state] }
        });
      }
      return NextResponse.json({ success: true });
    }

    // Handle New Messages
    if (event.includes('MESSAGE')) {
      const info = body.data?.Info;
      const messageData = body.data?.Message;
      
      if (!info || !info.ID) return NextResponse.json({ success: true });

      let remoteJid = info.Chat || info.Sender;
      // Quando a mensagem é enviada por nós (IsFromMe: true), a Evolution GO retorna um @lid.
      // O número de quem recebe (o Lead) fica escondido em RecipientAlt.
      if (remoteJid?.endsWith('@lid')) {
        remoteJid = info.RecipientAlt || info.SenderAlt || remoteJid;
      }

      const fromMe = info.IsFromMe;
      const whatsappId = info.ID;

      // Check if message is valid and comes from a real user (not group/status)
      if (remoteJid?.endsWith('@s.whatsapp.net')) {
        const phone = remoteJid.split('@')[0];
        
        // Ensure Instance exists for this webhook
        const instance = await prisma.whatsAppInstance.findUnique({
          where: { instanceName: instanceName },
          include: { broker: true }
        });

        if (!instance) {
          console.warn(`[WEBHOOK] Instância ${instanceName} não encontrada.`);
          return NextResponse.json({ success: true });
        }
        
        const broker = instance.broker;
        const brokerId = broker.id;

        // Check Lead Limit before processing new Lead
        const canCreate = await checkLeadLimit(broker.id, broker.planId);

        // We should check if the lead already exists first. If it does, we can process.
        // If it doesn't, and canCreate is false, we should probably ignore the message or log a warning.
        let phoneVariants = [phone];
        if (phone.startsWith('55') && phone.length === 12) {
          phoneVariants.push(`55${phone.substring(2, 4)}9${phone.substring(4)}`);
        } else if (phone.startsWith('55') && phone.length === 13) {
          phoneVariants.push(`55${phone.substring(2, 4)}${phone.substring(5)}`);
        }

        const existingLead = await prisma.lead.findFirst({
          where: { 
            brokerId: broker.id,
            phone: { in: phoneVariants }
          }
        });

        if (!existingLead && !canCreate) {
          console.warn(`[WEBHOOK] Limite de leads atingido para o broker ${broker.id}. Ignorando nova mensagem de ${phone}.`);
          return NextResponse.json({ success: true });
        }

        const targetPhone = existingLead ? existingLead.phone : phone;
        // Se a mensagem for enviada por nós (fromMe = true), o PushName que vem no payload é o NOSSO (da instância).
        // Portanto, se for fromMe, usamos o telefone como nome. Se for do lead, tentamos usar o PushName dele.
        const pushName = (!fromMe && info.PushName) ? info.PushName : targetPhone;

        let lead = await prisma.lead.upsert({
          where: {
            phone_brokerId: { phone: targetPhone, brokerId: broker.id }
          },
          update: { 
            whatsappInstanceId: instance.id, // Update the instance ID to the last one used
            ...(!fromMe ? { unreadCount: { increment: 1 } } : {})
          },
          create: {
            name: pushName,
            phone: targetPhone,
            status: 'CONTACT',
            brokerId: broker.id,
            whatsappInstanceId: instance.id,
            unreadCount: !fromMe ? 1 : 0
          }
        });

        // Buscar a foto de perfil do WhatsApp se não tiver (em segundo plano)
        // DESATIVADO: A busca estava travando o webhook na Evolution GO
        /*
        if (!lead.profilePictureUrl && !fromMe) {
            // logic removed
        }
        */

        // Determine message type and extract text/media
        let textBody = messageData?.conversation || "";
        let mediaType = null;
        let mediaUrl = null;

        // Evolution GO MediaType mapping
        if (info.MediaType) {
          if (info.MediaType === 'image') mediaType = 'IMAGE';
          else if (info.MediaType === 'audio' || info.MediaType === 'ptt') mediaType = 'AUDIO';
          else if (info.MediaType === 'video') mediaType = 'VIDEO';
          else if (info.MediaType === 'document') mediaType = 'DOCUMENT';
        }

        // Se for um texto simples ou com citação (fallback para estrutura antiga/clássica se houver)
        if (!mediaType && messageData?.extendedTextMessage) {
          textBody = messageData.extendedTextMessage.text;
        }

        // Handle Base64 Media Upload to R2 if available in webhook payload
        if (messageData?.base64 && mediaType) {
          let mimeType = "application/octet-stream";
          let extension = "bin";

          if (mediaType === "IMAGE") { mimeType = "image/jpeg"; extension = "jpg"; }
          else if (mediaType === "AUDIO") { mimeType = "audio/ogg"; extension = "ogg"; }
          else if (mediaType === "VIDEO") { mimeType = "video/mp4"; extension = "mp4"; }
          else if (mediaType === "DOCUMENT") { mimeType = "application/pdf"; extension = "pdf"; }

          const fileName = `chat_media/${lead.id}/${Date.now()}_${whatsappId}.${extension}`;
          mediaUrl = await uploadMediaToR2(messageData.base64, fileName, mimeType, `${brokerId}/chats/evolution`);
        }

        // Upsert Message (Avoid duplicates if Evolution retries the webhook)
        const uniqueWhatsappId = `${whatsappId}_${lead.id}`;
        
        const messageRecord = await prisma.message.upsert({
          where: { whatsappId: uniqueWhatsappId },
          update: {}, // if exists, do nothing (prevent duplicates)
          create: {
            whatsappId: uniqueWhatsappId,
            body: textBody,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            fromMe: fromMe,
            leadId: lead.id,
            timestamp: new Date(info.Timestamp)
          }
        });

        // Fire Server-Sent Event (SSE) here so the frontend updates instantly!
        eventBus.emit('newMessage', {
          event: 'MESSAGES_UPSERT',
          lead: lead,
          message: messageRecord
        });
        
        console.log(`[WEBHOOK] Mensagem salva no BD: ${whatsappId}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EVOLUTION WEBHOOK] Erro ao processar:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
