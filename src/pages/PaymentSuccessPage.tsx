import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Calendar, Home } from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  useEffect(() => {
    // Clear pending booking state
    localStorage.removeItem('pendingBooking');
  }, []);

  return (
    <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-default-text mb-4">
            決済完了
          </h1>

          <p className="text-secondary mb-6 leading-relaxed">
            決済及びレッスンの予約が無事完了しました。予約管理画面で詳細をご確認ください。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <h4 className="font-medium text-blue-800 mb-2">次のステップ</h4>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• 支払い処理完了まで数分お待ちください</li>
              <li>• 予約管理画面で支払い状況を確認</li>
              <li>• レッスン当日は開始時間の5-10分前にお越しください</li>
              <li>• 動きやすい服装と水分補給用の飲み物をご持参ください</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              to="/bookings"
              className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-primary/90 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <Calendar size={16} />
              <span>予約管理画面を確認</span>
            </Link>

            <Link
              to="/"
              className="w-full border border-secondary/30 text-secondary py-3 px-4 rounded-md hover:bg-secondary/10 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <Home size={16} />
              <span>ホームに戻る</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};