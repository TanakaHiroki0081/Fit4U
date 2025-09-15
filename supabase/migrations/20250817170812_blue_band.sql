/*
  # Fix RLS policies for BookingsPage participant view

  1. Security Updates
    - Add policy for clients to read lessons for their own bookings
    - Ensure proper RLS coverage for participant booking views
  
  2. Policy Changes
    - Enable clients to read lesson details when they have bookings
    - Maintain security while allowing necessary data access
*/

-- Add policy for clients to read lessons for their own bookings
CREATE POLICY "clients can read lessons for own bookings"
  ON public.lessons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.lesson_id = lessons.id AND b.client_id = auth.uid()
    )
  );

-- Ensure clients can read trainer info for lessons they've booked
CREATE POLICY "clients can read trainer info for booked lessons"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    role = 'trainer' AND EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.lessons l ON l.id = b.lesson_id
      WHERE l.trainer_id = users.id AND b.client_id = auth.uid()
    )
  );