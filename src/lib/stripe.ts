import { loadStripe } from '@stripe/stripe-js';

// Client-side Stripe instance
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('VITE_STRIPE_PUBLISHABLE_KEY is not defined. Stripe functionality will be disabled.');
}

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: 'jpy',
  apiVersion: '2024-12-18.acacia' as const,
  webhookEndpointSecret: import.meta.env.STRIPE_WEBHOOK_SECRET,
};

// Format amount for Stripe (JPY doesn't use decimal places)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount);
};

// Format amount for display
export const formatAmountForDisplay = (amount: number): string => {
  return `¥${amount.toLocaleString()}`;
};

// Stripe error handling
export const handleStripeError = (error: any): string => {
  if (error.type === 'card_error') {
    switch (error.code) {
      case 'card_declined':
        return 'カードが拒否されました。別のカードをお試しください。';
      case 'insufficient_funds':
        return '残高不足です。';
      case 'expired_card':
        return 'カードの有効期限が切れています。';
      case 'incorrect_cvc':
        return 'セキュリティコードが正しくありません。';
      case 'processing_error':
        return '決済処理中にエラーが発生しました。もう一度お試しください。';
      default:
        return 'カードエラーが発生しました。カード情報を確認してください。';
    }
  } else if (error.type === 'rate_limit_error') {
    return 'リクエストが多すぎます。しばらく待ってからお試しください。';
  } else if (error.type === 'invalid_request_error') {
    return '無効なリクエストです。';
  } else if (error.type === 'api_connection_error') {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
  } else if (error.type === 'api_error') {
    return 'サーバーエラーが発生しました。しばらく待ってからお試しください。';
  } else if (error.type === 'authentication_error') {
    return '認証エラーが発生しました。';
  } else {
    return error.message || '決済処理中にエラーが発生しました。';
  }
};