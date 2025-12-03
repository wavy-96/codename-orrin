import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
  typescript: true,
});

// Subscription plan configuration
export const PLANS = {
  FREE: {
    name: 'Free',
    interviews_per_month: 3,
    price: 0,
  },
  PRO: {
    name: 'Pro',
    interviews_per_month: Infinity,
    price_id: process.env.STRIPE_PRO_PRICE_ID || '',
    price: 19.99, // Update this to your actual price
  },
} as const;

export const FREE_INTERVIEW_LIMIT = 3;


