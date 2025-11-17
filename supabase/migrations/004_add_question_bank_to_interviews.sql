-- Add question_bank_id column to interviews table
ALTER TABLE interviews
ADD COLUMN question_bank_id UUID REFERENCES interview_question_banks(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_interviews_question_bank_id ON interviews(question_bank_id);

