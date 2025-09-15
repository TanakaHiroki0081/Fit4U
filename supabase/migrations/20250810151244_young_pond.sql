-- === Complete Stripe Integration Schema Update (fixed) ===

-- 1. PAYMENTS: 追加列 / NOT NULL 解除 / CHECK / 一意制約 / トリガ / インデックス
DO $$
BEGIN
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

-- stripe_session_id を NULL 許容に
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'stripe_session_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN stripe_session_id DROP NOT NULL;
  END IF;
END $$;

-- status チェックを拡張
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments 
  ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled', 'failed'));

-- payment_intent_id を UNIQUE（NULLは重複OK）
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

-- updated_at トリガ
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_set_updated_at ON public.payments;
CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 外部キー（booking_id）
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
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_payments_booking_id        ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_trainee_id        ON public.payments(trainee_id);
CREATE INDEX IF NOT EXISTS idx_payments_lesson_id         ON public.payments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_payments_status            ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_charge_id         ON public.payments(charge_id);

-- 2. BOOKINGS: reserved を許可（英米両綴りも許可のまま）
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('reserved', 'pending', 'confirmed', 'completed', 'cancelled', 'canceled'));

-- 3. RLS POLICY（idempotent）
-- 不要な INSERT ポリシーは削除（Edge Functions が挿入するため）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments'
      AND policyname = 'Trainees can insert own payments'
  ) THEN
    DROP POLICY "Trainees can insert own payments" ON public.payments;
  END IF;
END $$;

-- Admins can view all payments
DO $$
BEGIN
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
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Trainees can view own payments
DO $$
BEGIN
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
      USING (trainee_id = auth.uid());
  END IF;
END $$;

-- Trainers can view lesson payments
DO $$
BEGIN
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
      USING (
        EXISTS (
          SELECT 1 FROM public.lessons
          WHERE public.lessons.id = public.payments.lesson_id
            AND public.lessons.trainer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 念のため RLS 有効
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
