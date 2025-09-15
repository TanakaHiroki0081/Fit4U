/*
  # Create lessons table for fitness classes

  1. New Tables
    - `lessons`
      - `id` (uuid, primary key)
      - `trainer_id` (uuid, foreign key to users)
      - `title` (text) - lesson title
      - `description` (text) - lesson description
      - `category` (text) - lesson category (yoga, pilates, fitness, other)
      - `duration` (integer) - lesson duration in minutes
      - `max_participants` (integer) - maximum number of participants
      - `price` (integer) - lesson price in yen
      - `date` (date) - lesson date
      - `time` (text) - lesson time
      - `location` (text) - lesson location
      - `is_online` (boolean) - whether lesson is online
      - `status` (text) - lesson status (scheduled, cancelled, completed)
      - `created_at` (timestamp) - lesson creation time

  2. Security
    - Enable RLS on `lessons` table
    - Add policies for trainers to manage their lessons
    - Add policy for public read access to scheduled lessons
*/

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('yoga', 'pilates', 'fitness', 'other')),
  duration integer NOT NULL CHECK (duration > 0),
  max_participants integer NOT NULL CHECK (max_participants > 0),
  price integer NOT NULL CHECK (price >= 0),
  date date NOT NULL,
  time text NOT NULL,
  location text NOT NULL,
  is_online boolean DEFAULT false,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Anyone can read scheduled lessons
CREATE POLICY "Anyone can read scheduled lessons"
  ON lessons
  FOR SELECT
  TO authenticated
  USING (status = 'scheduled');

-- Trainers can manage their own lessons
CREATE POLICY "Trainers can manage own lessons"
  ON lessons
  FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());