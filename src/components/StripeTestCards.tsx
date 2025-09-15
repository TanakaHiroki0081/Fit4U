import React, { useState } from 'react';
import { CreditCard, Copy, CheckCircle } from 'lucide-react';

interface TestCard {
  number: string;
  description: string;
  cvc: string;
  expiry: string;
}

const testCards: TestCard[] = [
  {
    number: '4242 4242 4242 4242',
    description: '成功（Visa）',
    cvc: '123',
    expiry: '12/34'
  },
  {
    number: '5555 5555 5555 4444',
    description: '成功（Mastercard）',
    cvc: '123',
    expiry: '12/34'
  },
  {
    number: '4000 0000 0000 0002',
    description: 'カード拒否',
    cvc: '123',
    expiry: '12/34'
  },
  {
    number: '4000 0000 0000 9995',
    description: '残高不足',
    cvc: '123',
    expiry: '12/34'
  },
  {
    number: '4000 0000 0000 9987',
    description: 'CVC確認失敗',
    cvc: '123',
    expiry: '12/34'
  },
  {
    number: '4000 0000 0000 0069',
    description: '有効期限切れ',
    cvc: '123',
    expiry: '12/34'
  }
];

export const StripeTestCards: React.FC = () => {
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  const copyToClipboard = async (text: string, cardNumber: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCard(cardNumber);
      setTimeout(() => setCopiedCard(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (import.meta.env.PROD) {
    return null; // Don't show in production
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <CreditCard className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium text-blue-800">テスト用カード番号</h3>
      </div>
      
      <div className="grid gap-2">
        {testCards.map((card) => (
          <div
            key={card.number}
            className="flex items-center justify-between bg-white rounded-md p-2 text-sm"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-blue-800">{card.number}</span>
                <span className="text-blue-600">({card.description})</span>
              </div>
              <div className="text-xs text-blue-600">
                CVC: {card.cvc} | 有効期限: {card.expiry}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(card.number.replace(/\s/g, ''), card.number)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 p-1"
            >
              {copiedCard === card.number ? (
                <CheckCircle size={16} />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-blue-600 mt-2">
        ※ 開発環境でのみ表示されます。本番環境では実際のカード情報を使用してください。
      </p>
    </div>
  );
};