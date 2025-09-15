/*
  # Create payout requests table

  1. New Tables
    - `payout_requests`
      - `id` (uuid, primary key)
      - `trainer_id` (uuid, foreign key to users)
      - `period_start` (date)
      - `period_end` (date)
      - `total_sales` (integer)
      - `payout_amount` (integer) - 80% of total_sales
      - `transfer_fee` (integer) - bank transfer fee
      - `net_payout` (integer) - payout_amount - transfer_fee
      - `payout_eligible_date` (date)
      - `status` (text) - pending/approved/paid/rejected
      - `request_date` (timestamp)
      - `approval_date` (timestamp)
      - `payout_date` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `payout_requests` table
    - Add policies for trainers and admins
*/

CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_sales integer NOT NULL DEFAULT 0,
  payout_amount integer NOT NULL DEFAULT 0,
  transfer_fee integer NOT NULL DEFAULT 250,
  net_payout integer NOT NULL DEFAULT 0,
  payout_eligible_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  request_date timestamptz DEFAULT now(),
  approval_date timestamptz,
  payout_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT payout_requests_status_check 
    CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  CONSTRAINT payout_requests_amounts_check 
    CHECK (total_sales >= 0 AND payout_amount >= 0 AND net_payout >= 0)
);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Trainers can view and create their own payout requests
CREATE POLICY "Trainers can view own payout requests"
  ON payout_requests
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can create own payout requests"
  ON payout_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Admins can view and update all payout requests
CREATE POLICY "Admins can view all payout requests"
  ON payout_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payout requests"
  ON payout_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add role column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'client';
    ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'trainer', 'client'));
  END IF;
END $$;