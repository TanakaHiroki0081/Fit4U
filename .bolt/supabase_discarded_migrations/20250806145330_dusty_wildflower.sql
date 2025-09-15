/*
  # Fix existing payments RLS policies

  1. Problem
    - Existing INSERT policies may have incorrect USING syntax
    - PostgreSQL requires WITH CHECK for INSERT policies
    
  2. Solution
    - Drop all existing policies on payments table
    - Recreate with correct syntax
    - Ensure proper access control
*/

-- Drop all existing policies on payments table
DROP POLICY IF EXISTS "Trainees can view own payments" ON payments;
DROP POLICY IF EXISTS "Trainers can view lesson payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Trainees can insert own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
DROP POLICY IF EXISTS "System can insert payments" ON payments;

-- Recreate policies with correct syntax
CREATE POLICY "Trainees can view own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (trainee_id = auth.uid());

CREATE POLICY "Trainers can view lesson payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = payments.lesson_id
      AND lessons.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Trainees can insert own payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = auth.uid());