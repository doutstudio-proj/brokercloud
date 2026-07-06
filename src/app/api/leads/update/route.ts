import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';

export async function PUT(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { leadId, data } = await req.json();
    const { name, phone, status, notes, aiSummary, propertyId } = data || {};

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID é obrigatório' }, { status: 400 });
    }

    // Garante que o lead pertence ao broker autenticado (IDOR protection)
    const existingLead = await prisma.lead.findFirst({ where: { id: leadId, brokerId } });
    if (!existingLead) {
      return NextResponse.json({ success: false, error: 'Lead não encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (aiSummary !== undefined) updateData.aiSummary = aiSummary;
    if (propertyId !== undefined) updateData.propertyId = propertyId || null;

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData
    });

    if (status === 'GANHO' && updatedLead.propertyId) {
      await prisma.property.update({
        where: { id: updatedLead.propertyId },
        data: { status: 'SOLD' }
      });
    }

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error("[LEAD UPDATE ERROR]", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar lead" }, { status: 500 });
  }
}
