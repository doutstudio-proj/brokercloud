import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month'); // optional, for filtering (e.g., "2023-10")

    let dateFilter = {};
    if (month) {
      // month is expected to be "YYYY-MM"
      const [yearStr, monthStr] = month.split('-');
      const y = parseInt(yearStr);
      const m = parseInt(monthStr) - 1; // 0-indexed
      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
      
      dateFilter = {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      };

      // Lazy Loading: Check if Fixed Expenses were generated for this month
      const existingFixedTransactions = await prisma.transaction.findFirst({
        where: {
          brokerId: brokerId,
          date: { gte: startOfMonth, lte: endOfMonth },
          description: { contains: '[Fixo]' }
        }
      });

      if (!existingFixedTransactions) {
        // Fetch the master list of fixed expenses
        const fixedExpenses = await prisma.fixedExpense.findMany({
          where: { brokerId: brokerId }
        });

        if (fixedExpenses.length > 0) {
          // Generate them for this month
          const transactionsData = fixedExpenses.map(fe => ({
            type: 'EXPENSE',
            amount: fe.amount,
            description: `${fe.description} [Fixo]`,
            date: startOfMonth,
            status: 'PENDING',
            category: fe.category,
            brokerId: brokerId
          }));

          await prisma.transaction.createMany({ data: transactionsData });
        }
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: { 
        brokerId: brokerId,
        ...dateFilter
      },
      include: {
        property: { select: { title: true, id: true } },
        lead: { select: { name: true, id: true } },
      },
      orderBy: { date: 'desc' }
    });

    // Calculate metrics
    // For now, doing simple total metrics. We can filter by month if needed later.
    let totalIncome = 0;
    let totalExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'INCOME') {
        if (t.status === 'COMPLETED') totalIncome += t.amount;
        if (t.status === 'PENDING') pendingIncome += t.amount;
      } else if (t.type === 'EXPENSE') {
        if (t.status === 'COMPLETED') totalExpense += t.amount;
        if (t.status === 'PENDING') pendingExpense += t.amount;
      }
    });

    const balance = totalIncome - totalExpense;

    // Calculate Portfolio Value (VGV) - sum of all active properties (not sold)
    const availableProperties = await prisma.property.findMany({
      where: { brokerId: brokerId, status: { not: 'SOLD' } },
      select: { price: true }
    });
    
    const portfolioValue = availableProperties.reduce((acc, prop) => acc + prop.price, 0);

    return NextResponse.json({
      success: true,
      transactions,
      metrics: {
        totalIncome,
        totalExpense,
        pendingIncome,
        pendingExpense,
        balance,
        portfolioValue
      }
    });
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const data = await req.json();
    const { type, amount, description, date, status, category, propertyId, leadId, installments } = data;

    if (!type || !amount || !description || !date) {
      return NextResponse.json({ success: false, error: "Dados obrigatórios faltando" }, { status: 400 });
    }

    const instCount = installments ? parseInt(installments) : 1;
    const baseAmount = parseFloat(amount) / instCount;
    const baseDate = new Date(date);

    if (instCount > 1) {
      const transactionsData = [];
      for (let i = 0; i < instCount; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(installmentDate.getMonth() + i);
        
        transactionsData.push({
          type,
          amount: baseAmount,
          description: `${description} [${i + 1}/${instCount}]`,
          date: installmentDate,
          status: status || 'PENDING',
          category: category || 'OUTROS',
          brokerId: brokerId,
          propertyId: propertyId || null,
          leadId: leadId || null,
        });
      }
      
      await prisma.transaction.createMany({ data: transactionsData });
      return NextResponse.json({ success: true, message: `${instCount} transações criadas` });
    } else {
      const transaction = await prisma.transaction.create({
        data: {
          type,
          amount: parseFloat(amount),
          description,
          date: new Date(date),
          status: status || 'PENDING',
          category: category || 'OUTROS',
          brokerId: brokerId,
          propertyId: propertyId || null,
          leadId: leadId || null,
        }
      });
      return NextResponse.json({ success: true, transaction });
    }
  } catch (error) {
    console.error("Erro ao criar transação:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "ID não fornecido" }, { status: 400 });
    }

    await prisma.transaction.delete({
      where: { id: id, brokerId: brokerId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const data = await req.json();
    const { id, type, amount, description, date, status, category, propertyId } = data;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID não fornecido" }, { status: 400 });
    }

    const transaction = await prisma.transaction.update({
      where: { id: id, brokerId: brokerId },
      data: {
        ...(type && { type }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(status && { status }),
        ...(category && { category }),
        ...(propertyId !== undefined && { propertyId: propertyId || null }),
      }
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}
