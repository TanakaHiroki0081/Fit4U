import React from 'react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, CreditCard, LogOut, Settings, FileText, Star, DollarSign, Calendar, TrendingUp, Users } from 'lucide-react';

export const MyPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({
    monthlyCompletedLessons: 0,
    monthlySales: 0,
    totalParticipants: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchTrainerStats();
      fetchIdentityVerificationStatus();
    }
  }, [user]);

  const fetchIdentityVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('status')
        .eq('trainer_id', user?.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching identity verification status:', error);
        return;
      }

      if (data) {
        setIdentityVerificationStatus(data.status);
      } else {
        setIdentityVerificationStatus('none');
      }
    } catch (error) {
      console.error('Error fetching identity verification status:', error);
    }
  };

  const getIdentityVerificationDisplay = () => {
    switch (identityVerificationStatus) {
      case 'pending':
        return <p className="text-xs text-yellow-600 mt-1">申請中</p>;
      case 'approved':
        return <p className="text-xs text-green-600 mt-1">承認済</p>;
      case 'rejected':
        return <p className="text-xs text-red-600 mt-1">未申請</p>;
      default:
        return <p className="text-xs text-orange-600 mt-1">未申請</p>;
    }
  };

  const fetchTrainerStats = async () => {
    try {
      // Get current month dates
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Fetch monthly completed lessons
      const { data: monthlyLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('trainer_id', user?.id)
        .eq('status', 'completed')
        .gte('date', currentMonthStart.toISOString().split('T')[0])
        .lte('date', currentMonthEnd.toISOString().split('T')[0]);

      if (lessonsError) throw lessonsError;

      // Fetch monthly sales
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          net_amount,
          lesson:lessons!inner(trainer_id)
        `)
        .eq('lesson.trainer_id', user?.id)
        .eq('status', 'paid')
        .gte('paid_at', currentMonthStart.toISOString())
        .lte('paid_at', currentMonthEnd.toISOString());

      if (paymentsError) throw paymentsError;

      // Calculate trainer's share (80% of net amount)
      const monthlySales = payments?.reduce((sum, payment) => {
        return sum + Math.floor(payment.net_amount * 0.8);
      }, 0) || 0;

      // Fetch total participants (all time)
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          client_id,
          lesson:lessons!inner(trainer_id)
        `)
        .eq('lesson.trainer_id', user?.id)
        .eq('status', 'completed');

      if (bookingsError) throw bookingsError;

      // Count unique participants
      const uniqueParticipants = new Set(allBookings?.map(booking => booking.client_id) || []);
      const totalParticipants = uniqueParticipants.size;

      setStats({
        monthlyCompletedLessons: monthlyLessons?.length || 0,
        monthlySales,
        totalParticipants
      });
    } catch (error) {
      console.error('Error fetching trainer stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('ログアウトしますか？')) {
      await signOut();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-default-text mb-6">マイページ</h1>
        
        {/* User Info */}
        <div className="flex items-center space-x-4 mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-default-text">{user?.name}</h2>
            <p className="text-light-gray">{user?.email}</p>
            <p className="text-sm text-secondary">
              {user?.role === 'trainer' ? 'トレーナー' : '参加者'}
            </p>
            {user?.role === 'trainer' && user?.identity_verified && (
              <div className="flex items-center space-x-1 mt-1">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">本人確認済み</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats for Trainer */}
        {user?.role === 'trainer' && (
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-blue-800 font-medium">今月の実施済みレッスン</p>
              <p className="text-xl font-bold text-blue-800">
                {loadingStats ? '-' : `${stats.monthlyCompletedLessons}件`}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-green-800 font-medium">今月の売上</p>
              <p className="text-xl font-bold text-green-800">
                {loadingStats ? '-' : `¥${stats.monthlySales.toLocaleString()}`}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
              <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-purple-800 font-medium">総参加者数</p>
              <p className="text-xl font-bold text-purple-800">
                {loadingStats ? '-' : `${stats.totalParticipants}名`}
              </p>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="space-y-4">
          <Link
            to="/profile"
            className="flex items-center space-x-4 p-6 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <User className="w-5 h-5 text-primary" />
            <span className="font-semibold text-default-text">プロフィール</span>
          </Link>

          {user?.role === 'trainer' && (
            <>
              <Link
                to="/identity-verification"
                className="flex items-center space-x-4 p-6 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <span className="font-semibold text-default-text">本人確認手続き</span>
                  {getIdentityVerificationDisplay()}
                </div>
              </Link>
              
              <Link
                to="/bank-account"
                className="flex items-center space-x-4 p-6 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="font-semibold text-default-text">振込先口座</span>
              </Link>

              <Link
                to="/payout-requests"
                className="flex items-center space-x-4 p-6 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="font-semibold text-default-text">振込申請</span>
              </Link>
            </>
          )}

          {user?.role === 'trainer' && (
            <Link
              to="/trainer-reviews"
              className="flex items-center space-x-4 p-6 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Star className="w-5 h-5 text-primary" />
              <span className="font-semibold text-default-text">受け取ったレビュー</span>
            </Link>
          )}

          {user?.role === 'client' && (
            <Link
              to="/my-reviews"
              className="flex items-center space-x-4 p-6 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Star className="w-5 h-5 text-primary" />
              <span className="font-semibold text-default-text">投稿レビュー一覧</span>
            </Link>
          )}

          <Link
            to="/terms"
            className="flex items-center space-x-4 p-6 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-semibold text-default-text">利用規約</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-4 p-6 bg-white border border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all duration-200 shadow-sm hover:shadow-md text-left"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-500">ログアウト</span>
          </button>
        </div>
      </div>
    </div>
  );
};