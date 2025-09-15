import { supabase } from '../lib/supabase';
import { handleStripeError } from '../lib/stripe';

export interface PaymentIntentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, string>;
}

export interface RefundData {
  id: string;
  amount: number;
  status: string;
  reason: string;
}

// Verify payment status
export const verifyPaymentStatus = async (sessionId: string) => {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '決済状況の確認に失敗しました。');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying payment status:', error);
    throw error;
  }
};

// Get payment details
export const getPaymentDetails = async (paymentIntentId: string) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        lesson:lessons(
          title,
          date,
          time,
          trainer:users!lessons_trainer_id_fkey(name)
        )
      `)
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
};

// Handle payment recovery (for interrupted sessions)
export const recoverPendingPayment = async () => {
  try {
    const pendingBookingStr = localStorage.getItem('pendingBooking');
    if (!pendingBookingStr) return null;

    const pendingBooking = JSON.parse(pendingBookingStr);
    const { sessionId, timestamp } = pendingBooking;

    // Check if session is too old (30 minutes)
    if (Date.now() - timestamp > 30 * 60 * 1000) {
      localStorage.removeItem('pendingBooking');
      return null;
    }

    // Verify payment status
    const paymentStatus = await verifyPaymentStatus(sessionId);
    
    if (paymentStatus.status === 'paid') {
      localStorage.removeItem('pendingBooking');
      return {
        success: true,
        message: '決済が完了しています。',
        booking: paymentStatus.booking
      };
    }

    return null;
  } catch (error) {
    console.error('Error recovering pending payment:', error);
    localStorage.removeItem('pendingBooking');
    return null;
  }
};

// Create refund
export const createRefund = async (paymentId: string, amount: number, reason: string) => {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-refund`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentId,
        amount,
        reason
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(handleStripeError(errorData) || '返金処理に失敗しました。');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
};

// Get Stripe dashboard URL for payments
export const getStripeDashboardUrl = (paymentIntentId?: string) => {
  const baseUrl = 'https://dashboard.stripe.com';
  if (paymentIntentId) {
    return `${baseUrl}/payments/${paymentIntentId}`;
  }
  return `${baseUrl}/payments`;
};