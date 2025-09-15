/*
  # Create refunds table for managing cancellations and refunds

  1. New Tables
    - `refunds`
      - `id` (uuid, primary key)
      - `lesson_id` (uuid, foreign key to lessons)
      - `trainee_id` (uuid, foreign key to users)
      - `payment_id` (uuid, foreign key to payments)
      - `refund_amount` (integer, amount to be refunded)
      - `refund_reason` (text, reason for refund)
      - `refund_status` (text, pending/approved/refunded/rejected)
      - `refund_date` (timestamp, when refund was processed)
      - `stripe_refund_id` (text, Stripe refund ID)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `refunds` table
    - Add policies for trainees to view their own refunds
    - Add policies for trainers to view refunds for their lessons
    - Add policies for admin operations
*/

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  trainee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  refund_amount integer NOT NULL CHECK (refund_amount >= 0),
  refund_reason text NOT NULL,
  refund_status text NOT NULL DEFAULT 'pending' CHECK (refund_status IN ('pending', 'approved', 'refunded', 'rejected')),
  refund_date timestamptz,
  stripe_refund_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Trainees can view their own refunds
CREATE POLICY "Trainees can view own refunds"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (trainee_id = auth.uid());

-- Trainers can view refunds for their lessons
CREATE POLICY "Trainers can view refunds for their lessons"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = refunds.lesson_id
      AND lessons.trainer_id = auth.uid()
    )
  );

-- Users can create refund requests
CREATE POLICY "Users can create refund requests"
  ON refunds
  FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = auth.uid());

-- Admins can view and manage all refunds
CREATE POLICY "Admins can view all refunds"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update refunds"
  ON refunds
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS refunds_lesson_id_idx ON refunds(lesson_id);
CREATE INDEX IF NOT EXISTS refunds_trainee_id_idx ON refunds(trainee_id);
CREATE INDEX IF NOT EXISTS refunds_payment_id_idx ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS refunds_status_idx ON refunds(refund_status);

-- Add updated_at trigger
CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();