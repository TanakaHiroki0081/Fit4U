import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react';

export const PaymentCancelPage: React.FC = () => {
  React.useEffect(() => {
    // Clear any pending booking state on cancel
    localStorage.removeItem('pendingBooking');
  }, []);

  return (
    <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-default-text mb-4">
            決済がキャンセルされました
          </h1>
          
          <p className="text-secondary mb-6">
            決済に失敗しました。もう一度お試しください。<br />
            レッスンの予約は完了していません。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>決済エラーの原因：</strong><br />
              • カード情報の入力ミス<br />
              • カードの利用限度額超過<br />
              • カードの有効期限切れ<br />
              • その他のカード会社による制限<br /><br />
              人気のレッスンは満席になる可能性があります。<br />
              お早めに再度お申し込みください。
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/lessons"
              className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-primary/90 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <RotateCcw size={16} />
              <span>再度決済を試す</span>
            </Link>
            
            <Link
              to="/"
              className="w-full border border-secondary/30 text-secondary py-3 px-4 rounded-md hover:bg-secondary/10 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>ホームに戻る</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};