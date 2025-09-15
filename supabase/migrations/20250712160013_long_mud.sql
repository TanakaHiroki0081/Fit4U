/*
  # Create users table for fitness trainers and clients

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches auth.users id
      - `email` (text, unique) - user email
      - `name` (text) - user display name
      - `role` (text) - either 'trainer' or 'client'
      - `avatar_url` (text, optional) - profile picture URL
      - `bio` (text, optional) - user biography
      - `specialties` (text array, optional) - trainer specialties
      - `hourly_rate` (integer, optional) - trainer hourly rate in yen
      - `created_at` (timestamp) - account creation time

  2. Security
    - Enable RLS on `users` table
    - Add policies for users to read/update their own data
    - Add policy for public read access to trainer profiles
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('trainer', 'client')),
  avatar_url text,
  bio text,
  specialties text[],
  hourly_rate integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Anyone can read trainer profiles (for lesson browsing)
CREATE POLICY "Anyone can read trainer profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (role = 'trainer');

-- Users can insert their own data (for signup)
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);