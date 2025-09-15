// src/api/resolvePayment.ts
import { supabase } from '../lib/supabase';
// ↑ もし共通クライアントのパスが違う場合はここだけ合わせてください。
// 例: '../lib/supabaseClient' など

export type PaymentRow = {
  id: string;
  lesson_id: string;
  trainee_id: string;
  amount: number;
  stripe_fee: number | null;
  net_amount: number | null;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled' | 'failed';
  payment_intent_id: string | null;
  charge_id: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
};

/** payment_intent_id が分かっている時の取得（1件想定のため single） */
export async function getPaymentByIntent(paymentIntentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_intent_id', paymentIntentId)
    .single<PaymentRow>(); // 同一Intentで複数作らない前提

  if (error) throw error;
  return data;
}

/**
 * session_id しか無い時に使う関数。
 * 1) Edge Function 'verify-payment' に sessionId を渡して Intent を解決
 * 2) 返ってきた payment_intent_id で payments を取得
 */
export async function getPaymentBySession(sessionId: string) {
  // verify-payment は Edge Functions 側にデプロイ済み前提
  const { data: verify, error: vErr } = await supabase.functions.invoke('verify-payment', {
    body: { sessionId },
  });
  if (vErr) throw vErr;

  const paymentIntentId: string | undefined =
    verify?.payment_intent_id ||
    verify?.payment_intent ||
    verify?.paymentIntentId ||
    verify?.pi;

  if (!paymentIntentId) {
    throw new Error('verify-payment から payment_intent_id を取得できませんでした');
  }

  const payment = await getPaymentByIntent(paymentIntentId);
  return {
    payment,
    paymentIntentId,
    chargeId: verify?.charge_id ?? null,
  };
}

/** Stripe ダッシュボードへのリンク（テスト/本番は引数で指定） */
export function stripePaymentLinkByIntent(paymentIntentId: string, mode: 'test' | 'live' = 'test') {
  const base = mode === 'live' ? 'https://dashboard.stripe.com' : 'https://dashboard.stripe.com/test';
  return `${base}/payments/${paymentIntentId}`;
}
