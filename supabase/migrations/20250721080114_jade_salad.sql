/*
  # Create reviews table and related functionality

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, foreign key to users)
      - `trainer_id` (uuid, foreign key to users)
      - `lesson_id` (uuid, foreign key to lessons)
      - `rating` (integer, 1-5)
      - `comment` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `reviews` table
    - Add policies for trainees to create and view own reviews
    - Add policies for trainers to view reviews about them
    - Add unique constraint to prevent duplicate reviews

  3. Indexes
    - Add indexes for performance on trainer_id and lesson_id
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Add unique constraint to prevent duplicate reviews
ALTER TABLE reviews ADD CONSTRAINT reviews_unique_trainee_lesson 
UNIQUE (trainee_id, lesson_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS reviews_trainer_id_idx ON reviews(trainer_id);
CREATE INDEX IF NOT EXISTS reviews_lesson_id_idx ON reviews(lesson_id);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at DESC);

-- RLS Policies
CREATE POLICY "Trainees can create reviews for their completed lessons"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trainee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.lesson_id = reviews.lesson_id 
      AND bookings.client_id = auth.uid() 
      AND bookings.status = 'completed'
    )
  );

CREATE POLICY "Trainees can view their own reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (trainee_id = auth.uid());

CREATE POLICY "Trainers can view reviews about them"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Anyone can view reviews for public display"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (true);