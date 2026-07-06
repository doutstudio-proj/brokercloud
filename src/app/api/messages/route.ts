import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId');

  if (!leadId) {
    return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
  }

  try {
    // Verifica que o lead pertence ao broker autenticado (IDOR protection)
    const lead = await prisma.lead.findFirst({ where: { id: leadId, brokerId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead não encontrado' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { leadId },
      orderBy: { timestamp: 'asc' }
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
