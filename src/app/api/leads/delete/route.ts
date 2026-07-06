import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';

export async function DELETE(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ success: false, error: "Lead ID obrigatório" }, { status: 400 });
    }

    // Garante que o lead pertence ao broker autenticado (IDOR protection)
    const existingLead = await prisma.lead.findFirst({ where: { id: leadId, brokerId } });
    if (!existingLead) {
      return NextResponse.json({ success: false, error: 'Lead não encontrado' }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id: leadId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[LEAD DELETE ERROR]", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir lead" }, { status: 500 });
  }
}
