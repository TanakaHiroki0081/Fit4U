/*
  # Create identity verifications table

  1. New Tables
    - `identity_verifications`
      - `id` (uuid, primary key)
      - `trainer_id` (uuid, foreign key to users)
      - `document_type` (text)
      - `document_image_url` (text)
      - `status` (text: pending, approved, rejected)
      - `submitted_at` (timestamp)
      - `reviewed_at` (timestamp)
      - `reviewed_by` (uuid, foreign key to users)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `identity_verifications` table
    - Add policies for trainers to manage their own verifications
    - Add policies for admins to view and manage all verifications
*/

CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_image_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own identity verifications
CREATE POLICY "Trainers can view own identity verifications"
  ON identity_verifications
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own identity verifications"
  ON identity_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own identity verifications"
  ON identity_verifications
  FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Admins can view and manage all identity verifications
CREATE POLICY "Admins can view all identity verifications"
  ON identity_verifications
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

CREATE POLICY "Admins can update all identity verifications"
  ON identity_verifications
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Add identity verification status to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'identity_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN identity_verified boolean DEFAULT false;
  END IF;
END $$;