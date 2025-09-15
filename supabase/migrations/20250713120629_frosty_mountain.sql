/*
  # Add user profile fields

  1. New Columns
    - `experience` (text) - User's experience and achievements
    - `qualifications` (text) - User's qualifications and certifications
    - `location` (text) - User's main activity location

  2. Changes
    - Add experience column to users table
    - Add qualifications column to users table  
    - Add location column to users table
*/

-- Add experience column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'experience'
  ) THEN
    ALTER TABLE users ADD COLUMN experience text;
  END IF;
END $$;

-- Add qualifications column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'qualifications'
  ) THEN
    ALTER TABLE users ADD COLUMN qualifications text;
  END IF;
END $$;

-- Add location column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'location'
  ) THEN
    ALTER TABLE users ADD COLUMN location text;
  END IF;
END $$;