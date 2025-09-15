import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log('Attempting login with email:', email);

    try {
      // Admin専用ログイン導線: /admin/login から以外は admin ロールを拒否
      if (location.pathname !== '/admin/login') {
        try {
          const { data, error: userErr } = await supabase
            .from('users')
            .select('role')
            .eq('email', email)
            .maybeSingle();
          if (!userErr && data?.role === 'admin') {
            setError('管理者は専用ログインページ（/admin/login）からログインしてください。');
            setLoading(false);
            return;
          }
        } catch {}
      }

      const { error } = await signIn(email, password);
      console.log('Login response error:', error);
      if (error) {
        console.error('Login error details:', error);
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      }
      // 成功時の簡易リダイレクト
      if (!error) {
        navigate(location.pathname === '/admin/login' ? '/admin' : '/');
      }
    } catch (err) {
      console.error('Login catch error:', err);
      setError('ログインに失敗しました。');
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
          <h2 className="text-2xl font-bold text-default-text">ログイン</h2>
          <p className="text-secondary mt-2">アカウントにログインしてください</p>
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
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-default-text mb-1">
              パスワード
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-secondary">
            アカウントをお持ちでない方は{' '}
            <button
              onClick={onToggleMode}
              className="text-primary hover:text-primary/80 font-medium"
            >
              新規登録
            </button>
          </p>
          <p className="text-sm text-secondary mt-2">
            パスワードを忘れた方は{' '}
            <Link
              to="/reset-password"
              className="text-primary hover:text-primary/80 font-medium"
            >
              こちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};