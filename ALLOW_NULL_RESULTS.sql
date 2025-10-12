-- Migration: Allow NULL values in results.actual_score
-- This allows admins to clear results for inactive or unconfigured candidates

-- Drop the old constraint that doesn't allow NULL
ALTER TABLE results DROP CONSTRAINT IF EXISTS results_actual_score_check;

-- Add new constraint that allows NULL but validates non-NULL values
ALTER TABLE results ADD CONSTRAINT results_actual_score_check
  CHECK (actual_score IS NULL OR (actual_score >= 1 AND actual_score <= 10.5));

-- This allows:
-- 1. NULL values (for inactive or empty candidates)
-- 2. Valid scores between 1 and 10.5
