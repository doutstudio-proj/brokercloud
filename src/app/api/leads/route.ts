import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { checkLeadLimit } from '@/lib/limits';
import { limiters, applyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const leads = await prisma.lead.findMany({
      where: { brokerId },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        property: {
          select: { title: true, id: true, price: true, commission: true }
        },
        whatsappInstance: {
          select: { id: true, name: true, status: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    leads.sort((a, b) => {
      const timeA = a.messages && a.messages.length > 0 ? new Date(a.messages[0].timestamp).getTime() : new Date(a.updatedAt).getTime();
      const timeB = b.messages && b.messages.length > 0 ? new Date(b.messages[0].timestamp).getTime() : new Date(b.updatedAt).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error("Erro ao buscar leads:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { brokerId, planId, error } = await requireAuth();
  if (error) return error;

  // Rate limit: 100 leads / hora por brokerId (anti-criação em massa)
  const limited = await applyRateLimit(limiters.leadCreate, `lead-create:${brokerId}`);
  if (limited) return limited;

  try {
    const canCreate = await checkLeadLimit(brokerId, planId!);
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'Limite de leads mensais atingido (Plano Básico).' }, { status: 403 });
    }

    const { name, phone, status, notes, propertyId, whatsappInstanceId } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Nome e Telefone são obrigatórios' }, { status: 400 });
    }

    // Format phone to WhatsApp format if necessary (e.g., removing spaces/dashes)
    const formattedPhone = phone.replace(/\D/g, '');

    const newLead = await prisma.lead.create({
      data: {
        name,
        phone: formattedPhone,
        status: status || 'NOVO',
        notes: notes || null,
        propertyId: propertyId || null,
        whatsappInstanceId: whatsappInstanceId || null,
        brokerId,
        unreadCount: 0
      }
    });

    return NextResponse.json({ success: true, lead: newLead });
  } catch (error: any) {
    console.error("[LEAD CREATE ERROR]", error);
    return NextResponse.json({ success: false, error: "Erro ao criar lead" }, { status: 500 });
  }
}
