/*
  # Add payment constraints and booking status updates

  1. Database Changes
    - Add UNIQUE constraint on payments.payment_intent_id
    - Add balance_tx_id column to payments
    - Update booking status enum to include 'reserved'
    - Add updated_at triggers

  2. Security
    - Maintain existing RLS policies
*/

-- Add balance_tx_id column to payments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'balance_tx_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN balance_tx_id text;
  END IF;
END $$;

-- Add currency column to payments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'currency'
  ) THEN
    ALTER TABLE payments ADD COLUMN currency text DEFAULT 'jpy';
  END IF;
END $$;

-- Add amount_total column to payments if not exists (rename from amount)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'amount_total'
  ) THEN
    ALTER TABLE payments ADD COLUMN amount_total integer;
    -- Copy data from amount to amount_total
    UPDATE payments SET amount_total = amount WHERE amount_total IS NULL;
  END IF;
END $$;

-- Update payments status check constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'payments' AND constraint_name = 'payments_status_check'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_status_check;
  END IF;
  
  ALTER TABLE payments ADD CONSTRAINT payments_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'cancelled'::text]));
END $$;

-- Add UNIQUE constraint on payment_intent_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'payments' AND constraint_name = 'payments_payment_intent_id_key'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_payment_intent_id_key UNIQUE (payment_intent_id);
  END IF;
END $$;

-- Update bookings status check constraint to include 'reserved'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bookings' AND constraint_name = 'bookings_status_check'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
  END IF;
  
  ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'reserved'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text]));
END $$;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to payments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE table_name = 'payments' AND trigger_name = 'update_payments_updated_at'
  ) THEN
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add updated_at column to payments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;