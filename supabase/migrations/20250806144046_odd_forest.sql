/*
  # Fix RLS policy syntax for payments table

  1. Policy Updates
    - Fix INSERT policy to use WITH CHECK instead of USING
    - Correct syntax for all payment-related policies
  
  2. Security
    - Maintain proper access control for payments
    - Ensure trainee can only insert their own payment records
    - Trainers can view payments for their lessons
    - Admins can view all payments
*/

-- Drop existing policies to recreate with correct syntax
DROP POLICY IF EXISTS "Trainees can insert own payments" ON payments;
DROP POLICY IF EXISTS "Trainees can view own payments" ON payments;
DROP POLICY IF EXISTS "Trainers can view lesson payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

-- Recreate policies with correct syntax
CREATE POLICY "Trainees can insert own payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = auth.uid());

CREATE POLICY "Trainees can view own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (trainee_id = auth.uid());

CREATE POLICY "Trainers can view lesson payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lessons
    WHERE lessons.id = payments.lesson_id
    AND lessons.trainer_id = auth.uid()
  ));

CREATE POLICY "Admins can view all payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));