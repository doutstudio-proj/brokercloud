import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(request: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  try {
    let whereClause: any = { brokerId: brokerId };

    if (start && end) {
      whereClause.dueDate = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        lead: { select: { name: true, phone: true } },
        property: { select: { title: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    return NextResponse.json({ success: false, error: "Falha ao buscar tarefas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const data = await request.json();
    
    if (!data.title || !data.dueDate) {
      return NextResponse.json({ success: false, error: "Título e Data são obrigatórios." }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type || "OTHER",
        dueDate: new Date(data.dueDate),
        status: data.status || "PENDING",
        leadId: data.leadId || null,
        propertyId: data.propertyId || null,
        brokerId: brokerId
      },
      include: {
        lead: { select: { name: true, phone: true } },
        property: { select: { title: true } }
      }
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    return NextResponse.json({ success: false, error: "Falha ao criar tarefa" }, { status: 500 });
  }
}
