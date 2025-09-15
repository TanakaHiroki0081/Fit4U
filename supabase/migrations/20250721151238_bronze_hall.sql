/*
  # Remove online lesson support

  1. Changes
    - Remove is_online column from lessons table
    - Update existing lessons to remove is_online references
    - This migration makes all lessons in-person only

  2. Notes
    - All existing lessons will be treated as in-person
    - Location field will be used for physical addresses only
*/

-- Remove the is_online column from lessons table
ALTER TABLE lessons DROP COLUMN IF EXISTS is_online;