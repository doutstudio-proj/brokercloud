import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const notifications = [];

    // 1. Tarefas Atrasadas ou Para Hoje
    const pendingTasks = await prisma.task.findMany({
      where: { brokerId, status: 'PENDING', dueDate: { lte: endOfToday } },
      include: { lead: true }
    });

    for (const task of pendingTasks) {
      const isOverdue = new Date(task.dueDate) < now;
      notifications.push({
        id: `task-${task.id}`,
        type: 'TASK',
        title: isOverdue ? 'Tarefa Atrasada' : 'Tarefa para Hoje',
        description: `${task.title}${task.lead ? ` com ${task.lead.name}` : ''}`,
        date: task.dueDate,
        isOverdue,
        actionUrl: '/calendar'
      });
    }

    // 2. Leads Abandonados
    const abandonedLeads = await prisma.lead.findMany({
      where: { brokerId, status: { notIn: ['GANHO', 'PERDIDO'] }, updatedAt: { lt: fortyEightHoursAgo } }
    });

    for (const lead of abandonedLeads) {
      notifications.push({
        id: `lead-abandoned-${lead.id}`,
        type: 'LEAD',
        title: 'Lead Abandonado',
        description: `O lead ${lead.name} está sem contato há mais de 2 dias.`,
        date: lead.updatedAt,
        isOverdue: true,
        actionUrl: '/leads?tab=kanban'
      });
    }

    // 3. Novas Mensagens
    const unreadLeads = await prisma.lead.findMany({
      where: { brokerId, unreadCount: { gt: 0 } },
      include: { messages: { orderBy: { timestamp: 'desc' }, take: 1 } }
    });

    for (const lead of unreadLeads) {
      const lastMsgDate = lead.messages[0]?.timestamp || lead.updatedAt;
      notifications.push({
        id: `msg-lead-${lead.id}`,
        type: 'MESSAGE',
        title: `Nova Mensagem (${lead.unreadCount})`,
        description: `Você tem ${lead.unreadCount} mensagem(ns) não lida(s) de ${lead.name}.`,
        date: lastMsgDate,
        isOverdue: false,
        actionUrl: `/chat?leadId=${lead.id}`
      });
    }

    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error("API Notifications Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
