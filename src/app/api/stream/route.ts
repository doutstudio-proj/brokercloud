import { eventBus } from '@/lib/events';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Listener para novas mensagens recebidas
      // ⚠️ SEGURANÇA: Filtra pelo brokerId para garantir isolamento entre corretores
      const onNewMessage = (data: any) => {
        // Só envia o evento para o broker dono do lead — sem vazamento cross-tenant
        if (data?.lead?.brokerId !== brokerId) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Adiciona o listener no bus global
      eventBus.on('newMessage', onNewMessage);

      // Listener para quando o cliente fechar a conexão
      req.signal.addEventListener('abort', () => {
        eventBus.off('newMessage', onNewMessage);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
