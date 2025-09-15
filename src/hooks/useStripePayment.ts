import { useState, useCallback } from 'react';
import { stripePromise } from '../lib/stripe';
import { createCheckoutSession } from '../api/create-checkout-session';
import { handleStripeError } from '../lib/stripe';

interface UseStripePaymentOptions {
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export const useStripePayment = (options: UseStripePaymentOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const processPayment = useCallback(async (lessonId: string, traineeId: string) => {
    setLoading(true);
    setError(null);
    setSessionId(null);

    try {
      // Create checkout session
      const { sessionId } = await createCheckoutSession({
        lessonId,
        traineeId
      });

      setSessionId(sessionId);

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripeの初期化に失敗しました。');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message || handleStripeError(stripeError));
      }

      // If we reach here, redirect was successful
      if (options.onSuccess) {
        options.onSuccess(sessionId);
      }

    } catch (error: any) {
      const errorMessage = (error && error.message) ? String(error.message) : handleStripeError(error);
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [options]);

  const retryPayment = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripeの初期化に失敗しました。');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message || handleStripeError(stripeError));
      }
    } catch (error: any) {
      const errorMessage = (error && error.message) ? String(error.message) : handleStripeError(error);
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      }
    }
  }, [sessionId, options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processPayment,
    retryPayment,
    loading,
    error,
    sessionId,
    clearError
  };
};