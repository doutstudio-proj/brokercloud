import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET() {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const broker = await prisma.broker.findUnique({ 
      where: { id: brokerId },
      include: {
        whatsappInstances: true
      }
    });
    if (!broker) {
      return NextResponse.json({ success: false, error: "Broker não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      broker: {
        id: broker.id,
        name: broker.name,
        email: broker.email,
        phone: broker.phone,
        monthlyGoal: broker.monthlyGoal,
        planId: broker.planId,
        whatsappInstances: broker.whatsappInstances
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar broker:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const data = await req.json();
    const { name, phone, monthlyGoal } = data;

    const updatedBroker = await prisma.broker.update({
      where: { id: brokerId },
      data: {
        name,
        phone,
        monthlyGoal: monthlyGoal ? parseFloat(monthlyGoal) : null
      }
    });

    return NextResponse.json({
      success: true,
      broker: {
        id: updatedBroker.id,
        name: updatedBroker.name,
        email: updatedBroker.email,
        phone: updatedBroker.phone,
        monthlyGoal: updatedBroker.monthlyGoal,
        planId: updatedBroker.planId
      }
    });
  } catch (error: any) {
    console.error("Erro ao atualizar broker:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
