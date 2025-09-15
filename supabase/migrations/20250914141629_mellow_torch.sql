/*
  # Create payments table for Stripe integration

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `lesson_id` (uuid, foreign key to lessons)
      - `trainee_id` (uuid, foreign key to users)
      - `amount` (integer, payment amount in JPY)
      - `stripe_fee` (integer, Stripe fee)
      - `net_amount` (integer, net amount after fees)
      - `paid_at` (timestamp)
      - `status` (text, payment status)
      - `payment_intent_id` (text, unique)
      - `charge_id` (text)
      - `stripe_session_id` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `payments` table
    - Add policies for trainers and trainees to view relevant payments
    - Add admin access policies
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  trainee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount >= 0),
  stripe_fee integer DEFAULT 0,
  net_amount integer DEFAULT 0,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled', 'failed')),
  payment_intent_id text UNIQUE,
  charge_id text,
  stripe_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Trainees can view their own payments
CREATE POLICY "Trainees can view own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (trainee_id = auth.uid());

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

-- Admins can view all payments
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS payments_lesson_id_idx ON payments(lesson_id);
CREATE INDEX IF NOT EXISTS payments_trainee_id_idx ON payments(trainee_id);
CREATE INDEX IF NOT EXISTS payments_payment_intent_id_idx ON payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();