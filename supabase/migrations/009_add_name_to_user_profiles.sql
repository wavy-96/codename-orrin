-- Add first and last name to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;


