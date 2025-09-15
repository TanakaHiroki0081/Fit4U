/*
  # Add admin role to users table constraint

  1. Changes
    - Update users_role_check constraint to include 'admin' role
    - Allow admin users in the system

  2. Security
    - Maintains existing RLS policies
    - Admin role will be handled by application logic
*/

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint that includes 'admin' role
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['trainer'::text, 'client'::text, 'admin'::text]));