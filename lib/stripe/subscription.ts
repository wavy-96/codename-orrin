import { createClient } from '@/lib/supabase/server';
import { FREE_INTERVIEW_LIMIT } from './client';
import type { SubscriptionStatus } from '@/types/user';

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('subscription_plan, subscription_status, interviews_used_this_month, subscription_current_period_end, usage_reset_date')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {
    // Return default free status if no profile exists
    return {
      plan: 'free',
      status: 'free',
      interviewsUsed: 0,
      interviewsLimit: FREE_INTERVIEW_LIMIT,
      canCreateInterview: true,
      currentPeriodEnd: null,
    };
  }

  // Check if usage needs to be reset (monthly)
  const usageResetDate = profile.usage_reset_date ? new Date(profile.usage_reset_date) : null;
  const now = new Date();
  let interviewsUsed = profile.interviews_used_this_month || 0;

  if (usageResetDate && usageResetDate < now) {
    // Reset usage count - this will be persisted on next interaction
    interviewsUsed = 0;
  }

  const isPro = profile.subscription_plan === 'pro' && profile.subscription_status === 'active';
  const interviewsLimit = isPro ? Infinity : FREE_INTERVIEW_LIMIT;
  const canCreateInterview = isPro || interviewsUsed < FREE_INTERVIEW_LIMIT;

  return {
    plan: (profile.subscription_plan as 'free' | 'pro') || 'free',
    status: (profile.subscription_status as SubscriptionStatus['status']) || 'free',
    interviewsUsed,
    interviewsLimit,
    canCreateInterview,
    currentPeriodEnd: profile.subscription_current_period_end,
  };
}

export async function incrementInterviewUsage(userId: string): Promise<void> {
  const supabase = await createClient();

  // First check if usage needs reset
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('usage_reset_date, interviews_used_this_month')
    .eq('user_id', userId)
    .single();

  const now = new Date();
  const usageResetDate = profile?.usage_reset_date ? new Date(profile.usage_reset_date) : null;

  if (usageResetDate && usageResetDate < now) {
    // Reset and set to 1
    await supabase
      .from('user_profiles')
      .update({
        interviews_used_this_month: 1,
        usage_reset_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('user_id', userId);
  } else {
    // Increment
    await supabase.rpc('increment_interview_usage', { user_id_param: userId });
  }
}

export async function canUserCreateInterview(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const status = await getSubscriptionStatus(userId);

  if (status.canCreateInterview) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `You've used all ${FREE_INTERVIEW_LIMIT} free interviews this month. Upgrade to Pro for unlimited interviews.`,
  };
}


