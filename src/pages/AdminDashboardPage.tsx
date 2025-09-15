import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DollarSign, Users, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type DashboardStats = {
  allTimeLessons: number;
  monthlyRevenue: number;
  totalRevenue: number;
  monthlyFeeRevenue: number;
  totalFeeRevenue: number;
  monthlyRefunds: number;         // 今月の返金額
  monthlyPayouts: number;         // 今月の振込額
  activeTrainers: number;
  activeClients: number;
  pendingRefunds: number;         // 全期間の承認待ち件数
  pendingPayouts: number;         // 全期間の承認待ち件数
  pendingIdentityVerifications: number; // 全期間の承認待ち件数
};

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    allTimeLessons: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    monthlyFeeRevenue: 0,
    totalFeeRevenue: 0,
    monthlyRefunds: 0,
    monthlyPayouts: 0,
    activeTrainers: 0,
    activeClients: 0,
    pendingRefunds: 0,
    pendingPayouts: 0,
    pendingIdentityVerifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError('');
    try {
      // 当月の境界（[start, nextMonth)）
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const paidStatuses = ['paid', 'succeeded', 'completed', 'paid_out'] as const;

      // 並列取得
      const [
        // 当月 payments
        paymentsThisMonthRes,
        // 全期間 payments
        paymentsAllTimeRes,
        // 当月 refunds（返金額の集計用）
        refundsThisMonthRes,
        // 当月 payout_requests（振込額の集計用）
        payoutThisMonthRes,
        // 全ユーザー（アクティブ人数算出用の簡易集計）
        usersRes,
        // 承認待ち（全期間）
        pendingRefundsCountRes,
        pendingPayoutsCountRes,
        pendingIdentityVerificationsRes,
      ] = await Promise.all([
        supabase
          .from('payments')
          .select('amount, status, net_amount, created_at')
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', nextMonth.toISOString())
          .in('status', paidStatuses as unknown as string[]),

        supabase
          .from('payments')
          .select('amount, status, net_amount')
          .in('status', paidStatuses as unknown as string[]),

        supabase
          .from('refunds')
          .select('refund_amount, refund_status, created_at')
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', nextMonth.toISOString()),

        supabase
          .from('payout_requests')
          .select('net_payout, status, created_at')
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', nextMonth.toISOString()),

        supabase.from('users').select('role'),

        // 承認待ちは「全期間」でカウントする（ダッシュボードの0問題の修正）
        supabase.from('refunds').select('id', { count: 'exact', head: true }).eq('refund_status', 'pending'),
        supabase.from('payout_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('identity_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const paymentsThisMonth = paymentsThisMonthRes.data ?? [];
      const paymentsAllTime = paymentsAllTimeRes.data ?? [];
      const refundsThisMonth = refundsThisMonthRes.data ?? [];
      const payoutThisMonth = payoutThisMonthRes.data ?? [];
      const users = usersRes.data ?? [];

      // 予約数（= 決済成立件数）
      const monthlyLessons = paymentsThisMonth.length;
      const allTimeLessons = paymentsAllTime.length;

      // 売上（手数料控除前の合計）
      const monthlyRevenue = paymentsThisMonth.reduce((s, p: any) => s + (p.amount ?? 0), 0);
      const totalRevenue = paymentsAllTime.reduce((s, p: any) => s + (p.amount ?? 0), 0);

      // 手数料収入 = amount*20% - Stripe手数料（Stripe手数料 = amount - net_amount）
      const calcFee = (p: any) => {
        const amount = Number(p.amount ?? 0);
        const net = Number(p.net_amount ?? 0);
        const stripeFee = amount - net;
        return Math.floor(amount * 0.2) - stripeFee;
      };
      const monthlyFeeRevenue = paymentsThisMonth.reduce((s, p) => s + calcFee(p), 0);
      const totalFeeRevenue = paymentsAllTime.reduce((s, p) => s + calcFee(p), 0);

      // 今月の返金額（返金済みのみ）
      const monthlyRefunds = refundsThisMonth
        .filter((r: any) => r.refund_status === 'refunded')
        .reduce((s: number, r: any) => s + Number(r.refund_amount ?? 0), 0);

      // 今月の振込額（支払済みのみ）
      const monthlyPayouts = payoutThisMonth
        .filter((r: any) => r.status === 'paid')
        .reduce((s: number, r: any) => s + Number(r.net_payout ?? 0), 0);

      // ユーザー種別
      const activeTrainers = users.filter((u: any) => u.role === 'trainer').length;
      const activeClients = users.filter((u: any) => u.role === 'client').length;

      // 承認待ちカウント（全期間）
      const pendingRefunds = pendingRefundsCountRes.count ?? 0;
      const pendingPayouts = pendingPayoutsCountRes.count ?? 0;
      const pendingIdentityVerifications = pendingIdentityVerificationsRes.count ?? 0;

      setStats({
        allTimeLessons,
        monthlyRevenue,
        totalRevenue,
        monthlyFeeRevenue,
        totalFeeRevenue,
        monthlyRefunds,
        monthlyPayouts,
        activeTrainers,
        activeClients,
        pendingRefunds,
        pendingPayouts,
        pendingIdentityVerifications,
      });
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
      setError('ダッシュボードデータの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // アクセス制御
  if (user?.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-default-text mb-4">アクセス拒否</h1>
        <p className="text-secondary">この機能は管理者のみ利用可能です。</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-1">管理者ダッシュボード</h1>
        <p className="text-secondary">
          {format(new Date(), 'yyyy年M月', { locale: ja })}の概要
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 指標カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
        {/* 今月の売上 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-secondary">今月の売上</p>
              <p className="text-2xl font-bold text-default-text">¥{stats.monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-secondary mt-1">手数料控除前</p>
            </div>
          </div>
        </div>

        {/* 累計売上 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-secondary">累計売上（全期間）</p>
              <p className="text-2xl font-bold text-default-text">¥{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-secondary mt-1">手数料控除前</p>
            </div>
          </div>
        </div>

        {/* 今月の手数料収入 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-secondary">今月の手数料収入</p>
              <p className="text-2xl font-bold text-default-text">¥{stats.monthlyFeeRevenue.toLocaleString()}</p>
              <p className="text-xs text-secondary mt-1">20% - Stripe手数料</p>
            </div>
          </div>
        </div>

        {/* 累計手数料収入 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-secondary">累計手数料収入</p>
              <p className="text-2xl font-bold text-default-text">¥{stats.totalFeeRevenue.toLocaleString()}</p>
              <p className="text-xs text-secondary mt-1">20% - Stripe手数料</p>
            </div>
          </div>
        </div>

        {/* 今月の返金 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-secondary">今月の返金</p>
              <p className="text-2xl font-bold text-default-text">¥{stats.monthlyRefunds.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 今月の振込 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-secondary">今月の振込</p>
              <p className="text-2xl font-bold text-default-text">¥{stats.monthlyPayouts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* アクティブユーザー */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-secondary">アクティブユーザー</p>
              <p className="text-2xl font-bold text-default-text">
                {stats.activeTrainers + stats.activeClients}
              </p>
              <p className="text-xs text-secondary">
                トレーナー: {stats.activeTrainers} / 参加者: {stats.activeClients}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 承認待ち & クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 承認待ち */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-default-text mb-4">承認待ち</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="font-medium text-yellow-800">返金申請</p>
                <p className="text-sm text-yellow-600">{stats.pendingRefunds}件の承認待ち</p>
              </div>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-blue-800">振込申請</p>
                <p className="text-sm text-blue-600">{stats.pendingPayouts}件の承認待ち</p>
              </div>
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="font-medium text-purple-800">本人確認申請</p>
                <p className="text-sm text-purple-600">{stats.pendingIdentityVerifications}件の承認待ち</p>
              </div>
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-default-text mb-4">クイックアクション</h2>
          <div className="space-y-2">
            <Link to="/admin/refunds" className="block w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              返金管理
            </Link>
            <Link to="/admin/payouts" className="block w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              振込管理
            </Link>
            <Link to="/admin/users" className="block w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              ユーザー管理
            </Link>
            <Link to="/admin/payments" className="block w-full text左 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              決済履歴
            </Link>
            <Link to="/admin/identity-verifications" className="block w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              本人確認管理
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
