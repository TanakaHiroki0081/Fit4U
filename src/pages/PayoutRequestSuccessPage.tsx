import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Home, DollarSign, Calendar } from 'lucide-react';

export const PayoutRequestSuccessPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-default-text mb-4">
            振込申請が完了しました
          </h1>
          
          <p className="text-secondary mb-6">
            振込申請を受け付けました。<br />
            管理者による承認後、指定の口座へ振込いたします。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-medium">振込スケジュール</span>
            </div>
            <div className="text-blue-700 text-sm space-y-1">
              <p>• 管理者による承認: 1-3営業日</p>
              <p>• 承認後の振込: 10営業日以内</p>
              <p>• 振込手数料: ¥250（振込額から控除）</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>ご注意:</strong><br />
              振込申請の進捗状況は振込申請ページで確認できます。<br />
              承認・振込完了時にはお知らせでご連絡いたします。
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/payout-requests"
              className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-primary/90 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <Calendar size={16} />
              <span>振込申請履歴を確認</span>
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