import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/stripe/subscription';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getSubscriptionStatus(user.id);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}


