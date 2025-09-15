/*
  # Create bookings table for lesson reservations

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `lesson_id` (uuid, foreign key to lessons)
      - `client_id` (uuid, foreign key to users)
      - `status` (text) - booking status (confirmed, cancelled, completed)
      - `payment_status` (text) - payment status (pending, paid, refunded)
      - `created_at` (timestamp) - booking creation time

  2. Security
    - Enable RLS on `bookings` table
    - Add policies for users to manage their bookings
    - Add policy for trainers to view bookings for their lessons
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(lesson_id, client_id)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can read their own bookings
CREATE POLICY "Users can read own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Users can create their own bookings
CREATE POLICY "Users can create own bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid());

-- Trainers can view bookings for their lessons
CREATE POLICY "Trainers can view lesson bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons 
      WHERE lessons.id = bookings.lesson_id 
      AND lessons.trainer_id = auth.uid()
    )
  );