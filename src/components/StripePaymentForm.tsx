import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { handleStripeError } from '../lib/stripe';

interface StripePaymentFormProps {
  amount: number;
  lessonTitle: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  lessonTitle,
  onSuccess,
  onError,
  loading = false
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripeが初期化されていません。');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('カード情報が入力されていません。');
      return;
    }

    setProcessing(true);
    setCardError('');

    try {
      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentMethodError) {
        throw paymentMethodError;
      }

      // Confirm payment (this would typically be done on your backend)
      // For now, we'll simulate success
      onSuccess(paymentMethod.id);

    } catch (error: any) {
      const errorMessage = handleStripeError(error);
      setCardError(errorMessage);
      onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Lock className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">安全な決済</span>
        </div>
        <p className="text-sm text-blue-700">
          {lessonTitle} - ¥{amount.toLocaleString()}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-default-text mb-2">
          <CreditCard className="inline w-4 h-4 mr-1" />
          カード情報
        </label>
        <div className="border border-secondary/30 rounded-md p-3 bg-white">
          <CardElement 
            options={cardElementOptions}
            onChange={(event) => {
              if (event.error) {
                setCardError(handleStripeError(event.error));
              } else {
                setCardError('');
              }
            }}
          />
        </div>
        {cardError && (
          <div className="mt-2 flex items-center space-x-2 text-red-600">
            <AlertCircle size={16} />
            <span className="text-sm">{cardError}</span>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs text-secondary">
          • SSL暗号化通信でカード情報を安全に処理<br />
          • カード情報は当社サーバーに保存されません<br />
          • 決済はStripeにより安全に処理されます
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || loading}
        className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-md"
      >
        {processing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>決済処理中...</span>
          </div>
        ) : (
          `¥${amount.toLocaleString()}を決済`
        )}
      </button>
    </form>
  );
};