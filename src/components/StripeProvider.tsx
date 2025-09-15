import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise, STRIPE_CONFIG } from '../lib/stripe';

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const options = {
    // Passing the client secret obtained from the server
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#A60311',
        colorBackground: '#ffffff',
        colorText: '#333333',
        colorDanger: '#df1b41',
        fontFamily: 'Noto Sans JP, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
    locale: 'ja' as const,
  };

  if (!stripePromise) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-800 text-sm">
          Stripeが設定されていません。決済機能は利用できません。
        </p>
        {children}
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};