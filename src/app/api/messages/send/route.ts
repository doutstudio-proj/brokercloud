// Trigger IDE TS Server Refresh
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventBus } from '@/lib/events';
import { requireAuth } from '@/lib/session';
import { limiters, applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  // Rate limit: 60 mensagens / minuto por brokerId (anti-spam WhatsApp)
  const limited = await applyRateLimit(limiters.messageSend, `msg-send:${brokerId}`);
  if (limited) return limited;

  try {
    const { leadId, text, mediaUrl, mediaType, instanceId } = await request.json();

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    }

    // Verifica que o lead pertence ao broker autenticado (IDOR protection)
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, brokerId },
      include: { 
        broker: {
          include: { whatsappInstances: true }
        }
      }
    });

    if (!lead || !lead.broker) {
      return NextResponse.json({ success: false, error: 'Lead or Broker not found' }, { status: 404 });
    }

    // Identificar qual instância usar
    let targetInstance = null;
    
    // 1. Instância solicitada pelo frontend
    if (instanceId) {
      targetInstance = lead.broker.whatsappInstances.find(i => i.id === instanceId);
    }
    
    // 2. Instância que o lead mandou mensagem por último
    if (!targetInstance && lead.whatsappInstanceId) {
      targetInstance = lead.broker.whatsappInstances.find(i => i.id === lead.whatsappInstanceId);
    }
    
    // 3. Fallback para a primeira instância conectada
    if (!targetInstance) {
      targetInstance = lead.broker.whatsappInstances.find(i => i.status === 'open' || i.status === 'CONNECTED');
    }

    if (!targetInstance) {
      return NextResponse.json({ success: false, error: 'Nenhuma instância WhatsApp conectada para enviar a mensagem.' }, { status: 400 });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = targetInstance.instanceName;
    const instanceToken = targetInstance.instanceToken;
    let phone = lead.phone.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone;
    }
    if (!apiUrl || !apiKey) {
      return NextResponse.json({ success: false, error: 'Evolution API not configured' }, { status: 500 });
    }

    let endpoint = `${apiUrl}/send/text`;
    let payload: any = {
      number: phone,
      text: text || ""
    };

    if (mediaUrl) {
      endpoint = `${apiUrl}/send/media`;
      let mappedType = "document";
      if (mediaType === 'IMAGE') mappedType = "image";
      if (mediaType === 'VIDEO') mappedType = "video";
      if (mediaType === 'AUDIO') mappedType = "audio";
      
      payload = {
        number: phone,
        type: mappedType,
        url: mediaUrl,
        caption: text || ""
      };

      if (mappedType === "document") {
        payload.fileName = "Apresentacao_Imovel.pdf";
        payload.mimetype = "application/pdf";
      }
    }

    // Disparar para Evolution GO (usando token da instância na key)
    const evoRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instanceToken
      },
      body: JSON.stringify(payload)
    });

    let finalEvoRes = evoRes;
    let finalPayload = payload;
    
    if (!evoRes.ok) {
      const evoErrorText = await evoRes.text();
      console.error("[EVOLUTION SEND ERROR 1]", evoErrorText);
      
      // Dynamic 9-digit retry logic for Brazilian numbers
      if (evoErrorText.includes('not registered') && phone.startsWith('55')) {
        let retryPhone = null;
        if (phone.length === 13) {
          // Remove the 9 (55DD9XXXX -> 55DDXXXX)
          retryPhone = phone.substring(0, 4) + phone.substring(5);
        } else if (phone.length === 12) {
          // Add the 9 (55DDXXXX -> 55DD9XXXX)
          retryPhone = phone.substring(0, 4) + '9' + phone.substring(4);
        }

        if (retryPhone) {
          console.log(`[EVOLUTION RETRY] Retrying with alternative phone variant: ${retryPhone}`);
          finalPayload.number = retryPhone;
          
          finalEvoRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instanceToken
            },
            body: JSON.stringify(finalPayload)
          });
          
          if (finalEvoRes.ok) {
            try {
              const existingDuplicate = await prisma.lead.findUnique({
                where: { phone_brokerId: { phone: retryPhone, brokerId } }
              });
              if (!existingDuplicate) {
                await prisma.lead.update({
                  where: { id: lead.id },
                  data: { phone: retryPhone }
                });
              }
            } catch (e) {
              console.error('Error updating lead phone after retry', e);
            }
          }
        }
      }

      if (!finalEvoRes.ok) {
        const finalErrorText = finalEvoRes === evoRes ? evoErrorText : await finalEvoRes.text();
        console.error("[EVOLUTION SEND ERROR FINAL]", finalErrorText);
        return NextResponse.json({ success: false, error: 'O número não está registrado no WhatsApp.' }, { status: 400 });
      }
    }

    const evoData = await finalEvoRes.json();
    
    // Pegar o ID da mensagem retornado pela Evolution GO
    let whatsappId = evoData?.data?.Info?.ID || evoData?.key?.id || `out_${Date.now()}`;
    
    // Append lead.id to ensure global uniqueness even if sent to another instance of same broker
    whatsappId = `${whatsappId}_${lead.id}`;

    // Salvar a mensagem no Prisma
    const messageRecord = await prisma.message.create({
      data: {
        whatsappId,
        body: text,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        fromMe: true,
        leadId: lead.id,
      }
    });

    // Disparar o evento SSE para o próprio remetente atualizar a tela instantaneamente
    eventBus.emit('newMessage', {
      event: 'MESSAGES_UPSERT',
      lead: lead,
      message: messageRecord
    });

    return NextResponse.json({ success: true, message: messageRecord });

  } catch (error) {
    console.error("[API/MESSAGES/SEND] Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
