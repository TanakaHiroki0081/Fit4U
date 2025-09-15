/*
  # Add payment_intent fields to payments table

  1. New Columns
    - `payment_intent_id` (text, unique) - Stripe PaymentIntent ID for upsert operations
    - `charge_id` (text) - Stripe Charge ID for reference

  2. Security
    - Add unique constraint on payment_intent_id to prevent duplicates
    - Maintain existing RLS policies

  3. Changes
    - Modify existing payments table structure
    - Add indexes for performance
*/

-- Add new columns to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_intent_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_intent_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'charge_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN charge_id text;
  END IF;
END $$;

-- Add unique constraint on payment_intent_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'payments' AND constraint_name = 'payments_payment_intent_id_key'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_payment_intent_id_key UNIQUE (payment_intent_id);
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS payments_charge_id_idx ON payments(charge_id);
CREATE INDEX IF NOT EXISTS payments_payment_intent_id_idx ON payments(payment_intent_id);