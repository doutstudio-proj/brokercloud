import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const data = await request.json();
    const { id: taskId } = await params;

    const existing = await prisma.task.findFirst({ where: { id: taskId, brokerId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Tarefa não encontrada" }, { status: 404 });
    }

    // Only allow updating specific fields
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type) updateData.type = data.type;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        lead: { select: { name: true, phone: true } },
        property: { select: { title: true } }
      }
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json({ success: false, error: "Falha ao atualizar tarefa" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: taskId } = await params;
    
    const existing = await prisma.task.findFirst({ where: { id: taskId, brokerId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Tarefa não encontrada" }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    return NextResponse.json({ success: false, error: "Falha ao excluir tarefa" }, { status: 500 });
  }
}
