import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`[STRIPE WEBHOOK ERROR] Webhook signature verification failed.`, err.message);
    return NextResponse.json({ success: false, error: 'Webhook Error' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Se a assinatura for criada
        if (session.subscription) {
          const subscriptionId = session.subscription as string;
          const brokerId = session.metadata?.brokerId;
          const planId = session.metadata?.planId;

          if (brokerId && planId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
            
            await prisma.broker.update({
              where: { id: brokerId },
              data: {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                planId: planId, // BASIC ou PREMIUM
              },
            });
            console.log(`[STRIPE WEBHOOK] Plano atualizado com sucesso para Broker: ${brokerId} -> ${planId}`);
          }
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          
          await prisma.broker.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await prisma.broker.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            planId: 'TRIAL', // Volta para trial expirado para bloquear o acesso
            trialEndsAt: new Date(0), // Data no passado para garantir o bloqueio
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
        break;
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error(`[STRIPE WEBHOOK HANDLER ERROR]`, err);
    return NextResponse.json({ success: false, error: 'Webhook handler failed' }, { status: 500 });
  }
}
