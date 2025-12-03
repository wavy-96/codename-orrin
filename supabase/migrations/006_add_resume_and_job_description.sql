-- Add candidate_resume_id and job_description to interviews table
-- This migration adds support for storing the candidate's resume and the job description

-- Create candidate_resumes table to store parsed resume PDFs
CREATE TABLE IF NOT EXISTS candidate_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add new columns to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS candidate_resume_id UUID REFERENCES candidate_resumes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS job_description TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_candidate_resumes_user_id ON candidate_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_resume_id ON interviews(candidate_resume_id);

-- Enable Row Level Security
ALTER TABLE candidate_resumes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for candidate_resumes
CREATE POLICY "Users can view their own candidate resumes"
  ON candidate_resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own candidate resumes"
  ON candidate_resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own candidate resumes"
  ON candidate_resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own candidate resumes"
  ON candidate_resumes FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_candidate_resumes_updated_at
  BEFORE UPDATE ON candidate_resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

