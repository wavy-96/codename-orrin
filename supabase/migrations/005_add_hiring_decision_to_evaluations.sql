-- Add hiring decision fields to evaluations table
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS would_pass_to_next_round BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_round_reasoning TEXT DEFAULT '';

-- Add comment for documentation
COMMENT ON COLUMN evaluations.would_pass_to_next_round IS 'Whether the interviewer would pass this candidate to the next round';
COMMENT ON COLUMN evaluations.next_round_reasoning IS 'Detailed reasoning for the hiring decision from interviewer perspective';

