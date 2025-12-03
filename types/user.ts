/**
 * User profile data stored in the `user_profiles` table.
 * Created during onboarding and updated throughout the user's session.
 */
export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  current_job_title: string | null;
  desired_job_title: string | null;
  resume_id: string | null;
  onboarding_completed: boolean;
  // Subscription fields
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionPlanStatus;
  subscription_plan: SubscriptionPlan;
  subscription_current_period_end: string | null;
  interviews_used_this_month: number;
  usage_reset_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Extended UserProfile when fetched with resume join.
 * Use when querying: `.select('*, candidate_resumes(id, file_name)')`
 */
export interface UserProfileWithResume extends UserProfile {
  candidate_resumes?: {
    id: string;
    file_name: string;
  } | null;
}

/** Subscription plan type */
export type SubscriptionPlan = 'free' | 'pro';

/** Subscription status from Stripe */
export type SubscriptionPlanStatus = 'free' | 'active' | 'canceled' | 'past_due' | 'trialing';

/**
 * Computed subscription status returned by `/api/stripe/subscription`.
 * Contains both raw status and computed fields like `canCreateInterview`.
 */
export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  status: SubscriptionPlanStatus;
  interviewsUsed: number;
  interviewsLimit: number;
  canCreateInterview: boolean;
  currentPeriodEnd: string | null;
}
