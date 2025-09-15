/*
  # Update lesson categories

  1. Changes
    - Update lessons table category constraint to include all requested categories
    - Add new category options: stretch, strength, dance, boxing, hiit
    - Keep existing: yoga, pilates, other

  2. Security
    - No changes to RLS policies
*/

-- Drop the existing check constraint
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_category_check;

-- Add the new check constraint with all requested categories
ALTER TABLE lessons ADD CONSTRAINT lessons_category_check 
CHECK (category = ANY (ARRAY['yoga'::text, 'pilates'::text, 'stretch'::text, 'strength'::text, 'dance'::text, 'boxing'::text, 'hiit'::text, 'other'::text]));