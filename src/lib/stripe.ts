import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing. Please set it in .env');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia', // Use a versão mais recente da API suportada
  typescript: true,
});

export const STRIPE_PLANS = {
  BASIC: process.env.STRIPE_PRICE_BASIC || 'price_basic_id',
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_id',
};
