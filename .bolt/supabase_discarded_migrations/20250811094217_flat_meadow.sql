/*
  # Complete Stripe Integration Schema Update

  1. Payments Table Schema Updates
    - Add new columns: balance_tx_id, booking_id, updated_at
    - Remove NOT NULL constraint from stripe_session_id
    - Update status CHECK constraint for 2-phase operation
    - Add unique constraint on payment_intent_id
    - Add automatic updated_at trigger
    - Add performance indexes

  2. Bookings Table Schema Updates
    - Update status CHECK constraint to allow 'reserved' state

  3. RLS Policy Management
    - Remove unnecessary "Trainees can insert own payments" policy if exists
    - Ensure required SELECT policies exist
    - Service role handles all INSERT/UPDATE operations

  4. Performance and Safety
    - All operations are idempotent using IF NOT EXISTS/DROP IF EXISTS
    - Proper error handling and rollback safety
    - Performance indexes for common queries
*/

-- 1. Payments table schema updates
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'balance_tx_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN balance_tx_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN booking_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Remove NOT NULL constraint from stripe_session_id
DO $$
BEGIN
  -- Check if the column has NOT NULL constraint and remove it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' 
    AND column_name = 'stripe_session_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN stripe_session_id DROP NOT NULL;
  END IF;
END $$;

-- Update status CHECK constraint for 2-phase operation
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));

-- Add unique constraint on payment_intent_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
    AND contype = 'u' 
    AND conname = 'payments_payment_intent_id_key'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_payment_intent_id_key UNIQUE (payment_intent_id);
  END IF;
END $$;

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS payments_set_updated_at ON public.payments;
CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_trainee_id ON public.payments(trainee_id);
CREATE INDEX IF NOT EXISTS idx_payments_lesson_id ON public.payments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 2. Bookings table schema updates
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('reserved', 'pending', 'confirmed', 'completed', 'cancelled', 'canceled'));

-- 3. RLS Policy management

-- Remove unnecessary INSERT policy if it exists
DROP POLICY IF EXISTS "Trainees can insert own payments" ON public.payments;

-- Ensure required SELECT policies exist
DO $$
BEGIN
  -- Admins can view all payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Admins can view all payments'
  ) THEN
    CREATE POLICY "Admins can view all payments"
      ON public.payments
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = uid() AND users.role = 'admin'
      ));
  END IF;

  -- Trainees can view own payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Trainees can view own payments'
  ) THEN
    CREATE POLICY "Trainees can view own payments"
      ON public.payments
      FOR SELECT
      TO authenticated
      USING (uid() = trainee_id);
  END IF;

  -- Trainers can view lesson payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Trainers can view lesson payments'
  ) THEN
    CREATE POLICY "Trainers can view lesson payments"
      ON public.payments
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM lessons
        WHERE lessons.id = payments.lesson_id AND lessons.trainer_id = uid()
      ));
  END IF;

  -- Service role can manage payments (ALL operations)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Service role can manage payments'
  ) THEN
    CREATE POLICY "Service role can manage payments"
      ON public.payments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add foreign key constraint for booking_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
    AND contype = 'f'
    AND conname = 'payments_booking_id_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;