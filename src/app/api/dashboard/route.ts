import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const broker = await prisma.broker.findUnique({ where: { id: brokerId } });
    if (!broker) return NextResponse.json({ success: false, error: "Broker não encontrado" }, { status: 400 });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Financeiro
    const transactions = await prisma.transaction.findMany({
      where: { brokerId, type: 'INCOME' }
    });

    let realizedIncome = 0;
    let pendingIncome = 0;

    transactions.forEach(t => {
      if (t.status === 'COMPLETED' && new Date(t.date) >= firstDayOfMonth) {
        realizedIncome += t.amount;
      }
      if (t.status === 'PENDING') {
        pendingIncome += t.amount;
      }
    });

    // 2. Leads & Funnel
    const allLeads = await prisma.lead.findMany({
      where: { brokerId },
      include: { property: true }
    });

    let activeLeadsCount = 0;
    let newLeadsCount = 0;
    let vgvInNegotiation = 0;

    const funnelCounts = { NOVO: 0, ATENDIMENTO: 0, VISITA: 0, PROPOSTA: 0, GANHO: 0, PERDIDO: 0 };

    allLeads.forEach(lead => {
      // Ignora o status CONTACT para não poluir o funil
      if (lead.status === 'CONTACT') return;

      if (funnelCounts[lead.status as keyof typeof funnelCounts] !== undefined) {
        funnelCounts[lead.status as keyof typeof funnelCounts]++;
      }
      if (lead.status !== 'GANHO' && lead.status !== 'PERDIDO') activeLeadsCount++;
      if (new Date(lead.createdAt) >= thirtyDaysAgo) newLeadsCount++;
      if (lead.status === 'PROPOSTA' && lead.property) vgvInNegotiation += lead.property.price;
    });

    const wonLast30Days = allLeads.filter(l => l.status === 'GANHO' && new Date(l.updatedAt) >= thirtyDaysAgo).length;
    const conversionRate = newLeadsCount > 0 ? ((wonLast30Days / newLeadsCount) * 100).toFixed(1) : "0.0";

    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const abandonedLeadsCount = allLeads.filter(l =>
      l.status !== 'GANHO' && l.status !== 'PERDIDO' && l.status !== 'NOVO' && new Date(l.updatedAt) < fortyEightHoursAgo
    ).length;

    // 3. Imóveis
    const activeProperties = await prisma.property.findMany({
      where: { brokerId, status: { not: 'SOLD' } },
    });

    let totalVgv = 0;
    activeProperties.forEach(p => { totalVgv += p.price; });

    // 4. Tarefas
    const tasks = await prisma.task.findMany({
      where: { brokerId, status: 'PENDING' },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: { lead: { select: { name: true } } }
    });

    const tasksToday = tasks.filter(t => {
      const taskDate = new Date(t.dueDate);
      return taskDate >= startOfToday && taskDate <= endOfToday;
    });

    return NextResponse.json({
      success: true,
      data: {
        finance: { realizedIncome, pendingIncome, monthlyGoal: broker.monthlyGoal || 100000, vgvInNegotiation },
        leads: { activeCount: activeLeadsCount, newCount30Days: newLeadsCount, conversionRate, abandonedCount: abandonedLeadsCount, funnel: funnelCounts },
        properties: { totalVgv },
        tasks: { today: tasksToday, upcoming: tasks }
      }
    });
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}
