import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Mail } from 'lucide-react';

export const PasswordResetForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // パスワードリセットメールを送信
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password-confirm`,
      });

      if (resetError) {
        if (resetError.message?.includes('User not found')) {
          setError('ご入力頂いたメールアドレスは登録されておりません。再度、メールアドレスをご確認の上、ご入力ください');
        } else {
          setError('パスワードリセットメールの送信に失敗しました。');
        }
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-default-text">メール送信完了</h2>
          </div>

          <div className="text-center space-y-4">
            <p className="text-secondary">
              登録済みのメールアドレス（{email}）にパスワード再設定のリンクを送付しました。
            </p>
            <p className="text-secondary">
              メールに記載されたリンクからパスワードを再設定の上、ログインしなおしてください。
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-blue-600 text-sm">
                ※ メールが届かない場合は、迷惑メールフォルダもご確認ください。
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/auth"
              className="text-primary hover:text-primary/80 font-medium"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/FIT4U copy.png" 
            alt="FIT4U" 
            className="w-16 h-16 rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-default-text">パスワードリセット</h2>
          <p className="text-secondary mt-2">登録済みのメールアドレスを入力してください</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-default-text mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              placeholder="example@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'メール送信中...' : 'パスワードリセット'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/auth"
            className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} />
            <span>ログイン画面に戻る</span>
          </Link>
        </div>
      </div>
    </div>
  );
};