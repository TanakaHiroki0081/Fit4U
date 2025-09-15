import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Home, Star } from 'lucide-react';

export const ReviewSuccessPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-default-text mb-4">
            レビューありがとうございました！
          </h1>
          
          <p className="text-secondary mb-6">
            あなたのレビューが投稿されました。<br />
            トレーナーの品質向上に役立てさせていただきます。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="text-blue-800 font-medium">レビューのお願い</span>
            </div>
            <p className="text-blue-700 text-sm">
              今後もレッスンを受講された際は、<br />
              ぜひレビューをお聞かせください。
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/review-selection"
              className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-primary/90 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <Star size={16} />
              <span>他のレビューを書く</span>
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