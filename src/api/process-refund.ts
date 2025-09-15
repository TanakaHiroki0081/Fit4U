// src/api/process-refund.ts
import { supabase } from '../lib/supabase';

type Action = 'approve' | 'reject';

interface ProcessRefundRequest {
  refundId: string;
  action: Action;
  adminNotes?: string | null;
}

// Edge Function の戻り値が ok/success どちらでも拾えるようにしておく
interface FnResp {
  ok?: boolean;
  success?: boolean;
  status?: 'approved' | 'rejected' | 'refunded' | 'pending' | string;
  refundId?: string;
  stripeRefundId?: string;
  error?: string;
  message?: string;
}

export async function processRefund(
  { refundId, action, adminNotes = null }: ProcessRefundRequest
): Promise<FnResp> {
  const { data, error } = await supabase.functions.invoke<FnResp>('process-refund', {
    body: { refundId, action, adminNotes },
  });

  // ネットワーク/到達前の失敗
  if (error) throw new Error(error.message || 'Edge Function call failed');

  const ok = data?.ok ?? data?.success;
  if (!ok) {
    // 関数内のアプリケーションエラー
    throw new Error(data?.error || data?.message || 'Failed to process refund');
  }

  return data!;
}
