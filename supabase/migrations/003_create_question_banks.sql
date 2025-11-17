-- Create interview_question_banks table
CREATE TABLE IF NOT EXISTS interview_question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL,
  interview_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  focus_areas TEXT[] NOT NULL,
  questions JSONB NOT NULL, -- Array of question objects: {question: string, category: string, difficulty: string}
  source_urls TEXT[], -- URLs that were scraped to generate questions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(job_title, interview_type, difficulty) -- One question bank per role+type+difficulty combination
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_question_banks_lookup ON interview_question_banks(job_title, interview_type, difficulty);

-- Enable Row Level Security
ALTER TABLE interview_question_banks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - question banks are shared across all users
CREATE POLICY "Anyone can view question banks"
  ON interview_question_banks FOR SELECT
  USING (true);

CREATE POLICY "Only authenticated users can create question banks"
  ON interview_question_banks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_question_banks_updated_at
  BEFORE UPDATE ON interview_question_banks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

