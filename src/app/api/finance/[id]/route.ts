import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.transaction.findFirst({ where: { id, brokerId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Transação não encontrada" }, { status: 404 });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.amount !== undefined && { amount: parseFloat(data.amount) }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.description && { description: data.description }),
        ...(data.category && { category: data.category }),
      }
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    
    const existing = await prisma.transaction.findFirst({ where: { id, brokerId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Transação não encontrada" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}
