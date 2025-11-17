-- Add meta_prompt column to interviews table to store the generated system prompt
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS meta_prompt TEXT;

-- Note: No index on meta_prompt as it can be very large and we query by id, not by meta_prompt content
-- If indexing is needed in the future, consider using a functional index with MD5 hash or full text indexing

