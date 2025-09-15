/*
  # Fix payments table INSERT policy syntax

  1. Policy Changes
    - Remove existing INSERT policy with incorrect USING syntax
    - Add new INSERT policy with correct WITH CHECK syntax
  
  2. Security
    - Ensure only authenticated users can insert their own payment records
    - Maintain existing SELECT policies for proper access control
*/

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow trainee insert their payments" ON payments;
DROP POLICY IF EXISTS "Trainees can insert own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;

-- 正しいポリシーを追加
CREATE POLICY "Allow trainee insert their payments"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = trainee_id);