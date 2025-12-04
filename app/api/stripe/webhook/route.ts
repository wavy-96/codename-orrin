import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use service role client for webhook (no user session)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to safely convert Stripe timestamp to ISO string
function safeTimestampToISO(timestamp: number | undefined | null): string | null {
  if (!timestamp || typeof timestamp !== 'number') {
    return null;
  }
  try {
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No user ID in checkout session metadata');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  console.log('[Stripe Webhook] Subscription details:', {
    id: subscription.id,
    status: subscription.status,
    current_period_end: (subscription as any).current_period_end,
  });

  const periodEnd = safeTimestampToISO((subscription as any).current_period_end);

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      subscription_plan: 'pro',
      subscription_current_period_end: periodEnd,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }

  console.log(`User ${userId} upgraded to Pro`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  const customerId = subscription.customer as string;

  // Try to find user by metadata first, then by customer ID
  let userIdToUpdate = userId;

  if (!userIdToUpdate) {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    userIdToUpdate = profile?.user_id;
  }

  if (!userIdToUpdate) {
    console.error('Could not find user for subscription update');
    return;
  }

  // Map Stripe status to our status
  let subscriptionStatus: string;
  switch (subscription.status) {
    case 'active':
      subscriptionStatus = 'active';
      break;
    case 'past_due':
      subscriptionStatus = 'past_due';
      break;
    case 'canceled':
      subscriptionStatus = 'canceled';
      break;
    case 'trialing':
      subscriptionStatus = 'trialing';
      break;
    default:
      subscriptionStatus = 'free';
  }

  const subscriptionPlan = subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free';
  
  console.log('[Stripe Webhook] Updating subscription:', {
    userId: userIdToUpdate,
    status: subscriptionStatus,
    plan: subscriptionPlan,
    current_period_end: (subscription as any).current_period_end,
  });

  const periodEnd = safeTimestampToISO((subscription as any).current_period_end);

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscriptionStatus,
      subscription_plan: subscriptionPlan,
      subscription_current_period_end: periodEnd,
    })
    .eq('user_id', userIdToUpdate);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Subscription updated for user ${userIdToUpdate}: ${subscriptionStatus}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Could not find user for subscription deletion');
    return;
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      subscription_status: 'canceled',
      subscription_plan: 'free',
      stripe_subscription_id: null,
    })
    .eq('user_id', profile.user_id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }

  console.log(`Subscription canceled for user ${profile.user_id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Could not find user for payment failure');
    return;
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('user_id', profile.user_id);

  if (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }

  console.log(`Payment failed for user ${profile.user_id}`);
}


