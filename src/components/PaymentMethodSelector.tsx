import React, { useState } from 'react';
import { CreditCard, Smartphone, Building } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onMethodChange: (methodId: string) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange
}) => {
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: 'クレジットカード',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Visa, Mastercard, JCB, American Express',
      enabled: true
    }
  ];

  return (
    <div className="space-y-3">
      {/* 有効な決済手段のみ表示（カードのみ） */}
      {paymentMethods
        .filter((m) => m.enabled)
        .map((method) => (
          <div
            key={method.id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors flex items-center space-x-3 ${
              selectedMethod === method.id
                ? 'border-primary bg-primary/5'
                : method.enabled
                ? 'border-gray-200 hover:border-primary/50'
                : 'border-gray-200 opacity-50 cursor-not-allowed'
            }`}
            onClick={() => method.enabled && onMethodChange(method.id)}
          >
            <div className={`${
              selectedMethod === method.id ? 'text-primary' : 'text-secondary'
            }`}>
              {method.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${
                  selectedMethod === method.id ? 'text-primary' : 'text-default-text'
                }`}>
                  {method.name}
                </span>
              </div>
              <p className="text-sm text-secondary">{method.description}</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 ${
              selectedMethod === method.id
                ? 'border-primary bg-primary'
                : 'border-gray-300'
            }`}>
              {selectedMethod === method.id && (
                <div className="w-full h-full rounded-full bg-white scale-50"></div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
};