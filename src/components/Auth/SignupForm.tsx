import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

interface SignupFormProps {
  onToggleMode: () => void;
  onSignupComplete?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onToggleMode, onSignupComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
    role: 'client' as 'trainer' | 'client',
    agreeToTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.email !== formData.confirmEmail) {
      setError('メールアドレスが一致しません。');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません。');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください。');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('お名前を入力してください。');
      setLoading(false);
      return;
    }

    if (!formData.agreeToTerms) {
      setError('利用規約に同意してください。');
      setLoading(false);
      return;
    }

    try {
      const userData = {
        name: formData.name,
        role: formData.role
      };

      const { error } = await signUp(formData.email, formData.password, userData);
      if (error) {
        console.error('Signup error:', error);
        
        // より具体的なエラーメッセージを表示
        if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
          setError('このメールアドレスは既に登録されています。');
        } else if (error.message?.includes('Email rate limit exceeded')) {
          setError('メール送信の制限に達しました。しばらく時間をおいてから再度お試しください。');
        } else if (error.message?.includes('invalid email')) {
          setError('有効なメールアドレスを入力してください。');
        } else if (error.message?.includes('password')) {
          setError('パスワードは6文字以上で入力してください。');
        } else if (error.message?.includes('rate limit')) {
          setError('しばらく時間をおいてから再度お試しください。');
        } else if (error.message?.includes('signup_disabled')) {
          setError('現在新規登録を停止しています。しばらく時間をおいてから再度お試しください。');
        } else {
          setError('アカウント作成に失敗しました。入力内容を確認してください。');
        }
      } else {
        // サインアップ直後にセッションが発行される設定の場合は自動ログイン扱いでホームへ
        navigate('/');
      }
    } catch (err) {
      console.error('Signup catch error:', err);
      setError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/FIT4U copy.png" 
            alt="FIT4U" 
            className="w-16 h-16 rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-default-text">新規登録</h2>
          <p className="text-secondary mt-2">アカウントを作成してください</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-default-text mb-1">
              お名前 *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="山田太郎"
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-default-text mb-1">
              メールアドレス *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@email.com"
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmEmail" className="block text-sm font-medium text-default-text mb-1">
              メールアドレス確認用 *
            </label>
            <input
              type="email"
              id="confirmEmail"
              name="confirmEmail"
              value={formData.confirmEmail}
              onChange={handleChange}
              placeholder="上記と同じメールアドレスを入力"
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-default-text mb-1">
              アカウントタイプ *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="client">レッスン参加者</option>
              <option value="trainer">トレーナー（レッスン提供者）</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-default-text mb-1">
              パスワード *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="6文字以上で入力"
                className="w-full px-3 py-2 pr-10 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-secondary" />
                ) : (
                  <Eye className="h-4 w-4 text-secondary" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
              className="mt-1 h-4 w-4 text-primary focus:ring-primary border-secondary/30 rounded"
              required
            />
            <label htmlFor="agreeToTerms" className="text-sm text-default-text">
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline"
              >
                利用規約
              </a>
              に同意します *
            </label>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-default-text mb-1">
              パスワード確認 *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="上記と同じパスワードを入力"
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !formData.agreeToTerms}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'アカウント作成中...' : 'アカウント作成'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-secondary">
            すでにアカウントをお持ちの方は{' '}
            <button
              onClick={onToggleMode}
              className="text-primary hover:text-primary/80 font-medium"
            >
              ログイン
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};