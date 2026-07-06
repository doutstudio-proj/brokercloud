import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: { brokerId: brokerId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, fixedExpenses });
  } catch (error) {
    console.error("Erro ao buscar fixed expenses:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { description, amount, category } = await req.json();

    if (!description || !amount) {
      return NextResponse.json({ success: false, error: "Dados obrigatórios faltando" }, { status: 400 });
    }

    const fixedExpense = await prisma.fixedExpense.create({
      data: {
        description,
        amount: parseFloat(amount),
        category: category || "OUTROS",
        brokerId: brokerId
      }
    });

    return NextResponse.json({ success: true, fixedExpense });
  } catch (error) {
    console.error("Erro ao criar fixed expense:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID não fornecido" }, { status: 400 });

    await prisma.fixedExpense.delete({ where: { id, brokerId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar fixed expense:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
