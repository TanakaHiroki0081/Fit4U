import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, User, LogOut, Plus, CreditCard, Shield } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();

  // 便利な小変数（表示文言や分岐を一元化）
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isTrainer = role === 'trainer';
  const isClient = role === 'client';
  const roleLabel = isAdmin ? '管理者' : isTrainer ? 'トレーナー' : '参加者';

  // Router フックを使わずに現在のパスを判定（useLocation廃止）
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isActive = (...paths: string[]) => paths.some((p) => pathname === p);

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/FIT4U copy.png" alt="FIT4U" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-default-text">FIT4U</span>
            </Link>

            <div className="flex items-center space-x-4">
              {isClient && <NotificationBell />}
              <span className="text-sm text-light-gray">
                {user.name}（{roleLabel}）
              </span>
              {isAdmin && (
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center space-x-1 text-sm text-light-gray hover:text-red-500 transition-colors"
                >
                  <LogOut size={16} />
                  <span>ログアウト</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`${isAdmin ? 'grid grid-cols-6' : 'flex justify-around'} py-2`}>
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className={`flex flex-col items-center py-3 px-3 rounded-lg transition-all duration-200 ${
                    isActive('/admin', '/') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <Shield size={20} />
                  <span className="text-xs mt-1">管理</span>
                </Link>
                <Link
                  to="/admin/payments"
                  className={`flex flex-col items-center py-3 px-3 rounded-lg transition-all duration-200 ${
                    isActive('/admin/payments') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <CreditCard size={20} />
                  <span className="text-xs mt-1">決済</span>
                </Link>
                <Link
                  to="/admin/refunds"
                  className={`flex flex-col items-center py-3 px-3 rounded-lg transition-all duration-200 ${
                    isActive('/admin/refunds') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <CreditCard size={20} />
                  <span className="text-xs mt-1">返金</span>
                </Link>
                <Link
                  to="/admin/payouts"
                  className={`flex flex-col items-center py-3 px-3 rounded-lg transition-all duration-200 ${
                    isActive('/admin/payouts') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <CreditCard size={20} />
                  <span className="text-xs mt-1">振込</span>
                </Link>
                <Link
                  to="/admin/identity-verifications"
                  className={`flex flex-col items-center py-3 px-3 rounded-lg transition-all duration-200 ${
                    isActive('/admin/identity-verifications') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <Shield size={20} />
                  <span className="text-xs mt-1">本人確認</span>
                </Link>
                <Link
                  to="/admin/users"
                  className={`flex flex-col items-center py-3 px-3 rounded-lg transition-all duration-200 ${
                    isActive('/admin/users') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <User size={20} />
                  <span className="text-xs mt-1">ユーザー</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={`flex flex-col items-center py-3 px-2 rounded-lg transition-all duration-200 ${
                    isActive('/') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <Home size={20} />
                  <span className="text-xs mt-1 whitespace-nowrap">ホーム</span>
                </Link>

                <Link
                  to="/lessons"
                  className={`flex flex-col items-center py-3 px-2 rounded-lg transition-all duration-200 ${
                    isActive('/lessons') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <Calendar size={20} />
                  <span className="text-xs mt-1 whitespace-nowrap">レッスン</span>
                </Link>

                {isTrainer && (
                  <Link
                    to="/create-lesson"
                    className={`flex flex-col items-center py-3 px-2 rounded-lg transition-all duration-200 ${
                      isActive('/create-lesson') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                    }`}
                  >
                    <Plus size={20} />
                    <span className="text-xs mt-1 whitespace-nowrap">作成</span>
                  </Link>
                )}

                <Link
                  to="/bookings"
                  className={`flex flex-col items-center py-3 px-2 rounded-lg transition-all duration-200 ${
                    isActive('/bookings') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <Calendar size={20} />
                  <span className="text-xs mt-1 whitespace-nowrap">{isTrainer ? '予約管理' : '予約'}</span>
                </Link>

                <Link
                  to="/mypage"
                  className={`flex flex-col items-center py-3 px-2 rounded-lg transition-all duration-200 ${
                    isActive('/mypage', '/profile', '/bank-account') ? 'text-primary bg-primary/10' : 'text-light-gray hover:text-primary'
                  }`}
                >
                  <User size={20} />
                  <span className="text-xs mt-1 whitespace-nowrap">マイページ</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-24"></div>
    </div>
  );
};
