/*
  # Create payments table for Stripe payment tracking

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `stripe_session_id` (text, unique)
      - `lesson_id` (uuid, foreign key to lessons)
      - `trainee_id` (uuid, foreign key to users)
      - `amount` (integer, payment amount in cents)
      - `stripe_fee` (integer, Stripe fee in cents)
      - `net_amount` (integer, net amount after fees)
      - `paid_at` (timestamp)
      - `status` (text, payment status)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `payments` table
    - Add policies for trainers to view their lesson payments
    - Add policies for trainees to view their own payments
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  trainee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  stripe_fee integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL,
  paid_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Trainers can view payments for their lessons
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

-- Trainees can view their own payments
CREATE POLICY "Trainees can view own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (trainee_id = auth.uid());

-- Add constraint for status values
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('paid', 'refunded', 'cancelled'));

-- Add constraint for positive amounts
ALTER TABLE payments ADD CONSTRAINT payments_amount_check 
  CHECK (amount > 0);

-- Add constraint for non-negative fees
ALTER TABLE payments ADD CONSTRAINT payments_stripe_fee_check 
  CHECK (stripe_fee >= 0);

-- Add constraint for non-negative net amount
ALTER TABLE payments ADD CONSTRAINT payments_net_amount_check 
  CHECK (net_amount >= 0);