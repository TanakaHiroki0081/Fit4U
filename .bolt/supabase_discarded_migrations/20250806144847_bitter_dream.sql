/*
  # Add INSERT policy for payments table

  1. Security
    - Add policy for authenticated users to insert their own payment records
    - Uses WITH CHECK clause (required for INSERT policies)
    - Ensures trainee_id matches the authenticated user's ID

  2. Policy Details
    - Policy name: "Trainees can insert own payments"
    - Target: payments table
    - Operation: INSERT
    - Users: authenticated
    - Condition: trainee_id must match auth.uid()
*/

-- Create INSERT policy for payments table
CREATE POLICY "Trainees can insert own payments"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (trainee_id = auth.uid());