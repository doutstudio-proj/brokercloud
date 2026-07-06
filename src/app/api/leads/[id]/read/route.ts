import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;

    const lead = await prisma.lead.update({
      where: { id },
      data: { unreadCount: 0 }
    });

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Erro ao marcar lead como lido:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
