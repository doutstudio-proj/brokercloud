import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { stripe, STRIPE_PLANS } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { planId } = await req.json(); // "BASIC" ou "PREMIUM"

    if (!planId || !STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS]) {
      return NextResponse.json({ success: false, error: 'Plano inválido' }, { status: 400 });
    }

    const priceId = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];

    const broker = await prisma.broker.findUnique({
      where: { id: brokerId }
    });

    if (!broker) {
      return NextResponse.json({ success: false, error: 'Corretor não encontrado' }, { status: 404 });
    }

    let customerId = broker.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: broker.email,
        name: broker.name,
        metadata: {
          brokerId: broker.id,
        }
      });
      customerId = customer.id;

      await prisma.broker.update({
        where: { id: broker.id },
        data: { stripeCustomerId: customerId }
      });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings?canceled=true`,
      metadata: {
        brokerId: broker.id,
        planId: planId,
      }
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (err: any) {
    console.error("[STRIPE CHECKOUT ERROR]", err);
    return NextResponse.json({ success: false, error: 'Erro ao criar sessão de pagamento' }, { status: 500 });
  }
}
