-- Add subscription fields to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due', 'trialing')),
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS interviews_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Create index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_interview_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset usage if the reset date has passed
  IF NEW.usage_reset_date < TIMEZONE('utc', NOW()) THEN
    NEW.interviews_used_this_month := 0;
    NEW.usage_reset_date := TIMEZONE('utc', NOW()) + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-reset usage on profile access/update
CREATE TRIGGER check_usage_reset
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_monthly_interview_usage();

-- Create a view for easy subscription status checks
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
  user_id,
  subscription_plan,
  subscription_status,
  interviews_used_this_month,
  CASE 
    WHEN subscription_plan = 'pro' AND subscription_status = 'active' THEN 999999
    ELSE 3  -- Free tier gets 3 interviews per month
  END as interviews_limit,
  CASE 
    WHEN subscription_plan = 'pro' AND subscription_status = 'active' THEN TRUE
    WHEN interviews_used_this_month < 3 THEN TRUE
    ELSE FALSE
  END as can_create_interview
FROM user_profiles;

-- Grant access to the view
GRANT SELECT ON user_subscription_status TO authenticated;

-- Function to increment interview usage (called from API)
CREATE OR REPLACE FUNCTION increment_interview_usage(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET interviews_used_this_month = interviews_used_this_month + 1
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

