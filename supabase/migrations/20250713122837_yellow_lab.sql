/*
  # Create trainer bank accounts table

  1. New Tables
    - `trainer_bank_accounts`
      - `id` (uuid, primary key)
      - `trainer_id` (uuid, foreign key to users)
      - `bank_name` (text, bank name)
      - `branch_name` (text, branch name)
      - `account_type` (text, savings or checking)
      - `account_number` (text, account number)
      - `account_holder_name` (text, account holder name)
      - `account_holder_kana` (text, account holder name in katakana)
      - `is_verified` (boolean, verification status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `trainer_bank_accounts` table
    - Add policies for trainers to manage their own bank accounts
*/

CREATE TABLE IF NOT EXISTS trainer_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  branch_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('savings', 'checking')),
  account_number text NOT NULL,
  account_holder_name text NOT NULL,
  account_holder_kana text NOT NULL,
  is_verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE trainer_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own bank accounts"
  ON trainer_bank_accounts
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert their own bank accounts"
  ON trainer_bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their own bank accounts"
  ON trainer_bank_accounts
  FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their own bank accounts"
  ON trainer_bank_accounts
  FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());