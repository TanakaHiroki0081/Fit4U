import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PayoutRequest } from '../types';
import { DollarSign, Calendar, Clock, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PayoutSummary {
  totalSales: number;
  paidOutSales: number;
  eligibleSales: number;
  fit4uFee: number;
  payoutAmount: number;
}

interface BankAccount {
  id: string;
  bank_name: string;
  is_verified: boolean;
}

export const PayoutRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary>({
    totalSales: 0,
    paidOutSales: 0,
    eligibleSales: 0,
    fit4uFee: 0,
    payoutAmount: 0
  });
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchPayoutRequests(),
        fetchPayoutSummary(),
        fetchBankAccount()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutRequests = async () => {
    const { data, error } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('trainer_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setPayoutRequests(data || []);
  };

  const fetchPayoutSummary = async () => {
    // 総売上（支払済み = paid）
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        amount,
        status,
        lesson:lessons!inner(trainer_id, status)
      `)
      .eq('lesson.trainer_id', user?.id)
      .eq('lesson.status', 'completed')
      .in('status', ['paid']);
    if (paymentsError) throw paymentsError;
    const totalSales = (allPayments ?? []).reduce((sum, p: any) => sum + Number(p.amount ?? 0), 0);

    // 前月末までを対象に 80% 支払
    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);

    const { data: eligiblePayments, error: eligibleErr } = await supabase
      .from('payments')
      .select(`amount, status, paid_at, lesson:lessons!inner(trainer_id, status)`) 
      .eq('lesson.trainer_id', user?.id)
      .eq('lesson.status', 'completed')
      .in('status', ['paid'])
      .lte('paid_at', lastOfPrevMonth.toISOString());
    if (eligibleErr) throw eligibleErr;
    const eligibleSales = (eligiblePayments ?? []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);

    // 既に支払済みの申請を控除（保守的に total_sales ベース）
    const { data: paidRequests, error: paidError } = await supabase
      .from('payout_requests')
      .select('total_sales')
      .eq('trainer_id', user?.id)
      .eq('status', 'paid');
    if (paidError) throw paidError;
    const paidOutSales = (paidRequests ?? []).reduce((sum: number, r: any) => sum + Number(r.total_sales ?? 0), 0);

    const eligibleAfterPaid = Math.max(0, eligibleSales - paidOutSales);
    const fit4uFee = Math.floor(eligibleAfterPaid * 0.2);
    const payoutAmount = eligibleAfterPaid - fit4uFee;

    setPayoutSummary({ totalSales, paidOutSales, eligibleSales: eligibleAfterPaid, fit4uFee, payoutAmount });
  };

  const fetchBankAccount = async () => {
    const { data, error } = await supabase
      .from('trainer_bank_accounts')
      .select('id, bank_name, is_verified')
      .eq('trainer_id', user?.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    setBankAccount(data);
  };

  const handleCreateRequest = async () => {
    if (!confirm('振込申請を作成しますか？')) return;

    setCreating(true);
    setError('');

    try {
      // 翌月の10営業日目以降を算定
      const now = new Date();
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const payoutEligibleDate = new Date(firstOfThisMonth);
      let businessDays = 0;
      while (businessDays < 10) {
        payoutEligibleDate.setDate(payoutEligibleDate.getDate() + 1);
        const dow = payoutEligibleDate.getDay();
        if (dow !== 0 && dow !== 6) businessDays++;
      }

      const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);

      const { data, error } = await supabase
        .from('payout_requests')
        .insert({
          trainer_id: user?.id,
          period_start: '1970-01-01',
          period_end: format(lastOfPrevMonth, 'yyyy-MM-dd'),
          total_sales: payoutSummary.eligibleSales,
          payout_amount: payoutSummary.payoutAmount,
          transfer_fee: 250,
          net_payout: payoutSummary.payoutAmount - 250,
          payout_eligible_date: format(payoutEligibleDate, 'yyyy-MM-dd')
        })
        .select()
        .single();

      if (error) throw error;

      // 成功ページに遷移
      window.location.href = '/payout-request-success';
    } catch (error: any) {
      setError(`振込申請の作成に失敗しました: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '承認待ち',
      approved: '承認済み',
      paid: '振込完了',
      rejected: '却下'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (user?.role !== 'trainer') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-default-text mb-4">アクセス拒否</h1>
        <p className="text-secondary">この機能はトレーナーのみ利用可能です。</p>
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

  const canCreateRequest = payoutSummary.eligibleSales > 0 && bankAccount?.is_verified;
  const hasEligibleSales = payoutSummary.eligibleSales > 0;
  const hasBankAccount = bankAccount?.is_verified;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-6">振込申請</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Payout Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-6 mb-6">
          <h3 className="font-medium text-blue-800 mb-4">振込対象売上</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-blue-700">総売上:</span>
              <span className="font-medium text-blue-800">¥{payoutSummary.totalSales.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-blue-700">振込済み売上:</span>
              <span className="font-medium text-blue-800">-¥{payoutSummary.paidOutSales.toLocaleString()}</span>
            </div>
            
            <hr className="border-blue-200" />
            
            <div className="flex justify-between items-center">
              <span className="text-blue-700 font-medium">振込対象売上:</span>
              <span className="font-bold text-blue-800 text-lg">¥{payoutSummary.eligibleSales.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-blue-700">FIT4U手数料 (20%):</span>
              <span className="font-medium text-blue-800">-¥{payoutSummary.fit4uFee.toLocaleString()}</span>
            </div>
            
            <hr className="border-blue-200" />
            
            <div className="flex justify-between items-center">
              <span className="text-blue-700 font-medium">振込対象額:</span>
              <span className="font-bold text-blue-800 text-xl">¥{payoutSummary.payoutAmount.toLocaleString()}</span>
            </div>
            
            <p className="text-xs text-blue-600 mt-2">
              ※ 実際の振込金額は上記から振込手数料控除後の金額となります
            </p>
          </div>
        </div>

        {/* Bank Account Status */}
        <div className={`rounded-md p-4 mb-6 ${
          hasBankAccount 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2">
            <CreditCard className={`w-5 h-5 ${hasBankAccount ? 'text-green-600' : 'text-yellow-600'}`} />
            <p className={`font-medium ${hasBankAccount ? 'text-green-800' : 'text-yellow-800'}`}>
              {hasBankAccount 
                ? `振込先口座: ${bankAccount?.bank_name}（確認済み）`
                : '振込先口座情報の登録が必要です'}
            </p>
          </div>
          {!hasBankAccount && (
            <p className="text-yellow-700 text-sm mt-2">
              振込申請を行うには、振込先口座情報の登録を済ませてください。
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="mb-6">
          {!hasEligibleSales ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-secondary mx-auto mb-4" />
              <p className="text-secondary">現在振込対象の売上はありません</p>
              <p className="text-sm text-secondary mt-2">
                レッスンを完了すると振込対象売上が発生します
              </p>
            </div>
          ) : !hasBankAccount ? (
            <div className="text-center">
              <button
                disabled
                className="bg-gray-400 text-white px-6 py-3 rounded-md cursor-not-allowed mb-3"
              >
                振込申請（口座情報登録が必要）
              </button>
              <div>
                <a
                  href="/bank-account"
                  className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90"
                >
                  振込先口座を登録
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={handleCreateRequest}
                disabled={creating}
                className="bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
              >
                {creating ? '申請作成中...' : '振込申請'}
              </button>
            </div>
          )}
        </div>

        {/* Important Notes */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h4 className="font-medium text-gray-800 mb-2">振込について</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• 振込申請後、管理者による承認が必要です</li>
            <li>• 承認後、通常10営業日以内に指定口座へ振込されます</li>
            <li>• 振込手数料が差し引かれます</li>
            <li>• 振込は月1回まで申請可能です</li>
          </ul>
        </div>
      </div>

      {/* Payout Requests History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-default-text mb-4">振込申請履歴</h2>
        
        {payoutRequests.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">振込申請履歴はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payoutRequests.map((request) => (
              <div
                key={request.id}
                className="border border-secondary/20 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-default-text mb-1">
                      振込申請 #{request.id.slice(0, 8)}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-secondary">
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>
                          申請日: {format(new Date(request.request_date), 'M月d日', { locale: ja })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span>{getStatusLabel(request.status)}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-secondary">対象売上</p>
                    <p className="font-medium text-default-text">¥{request.total_sales.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-secondary">報酬額（80%）</p>
                    <p className="font-medium text-default-text">¥{request.payout_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-secondary">振込手数料</p>
                    <p className="font-medium text-default-text">¥{request.transfer_fee.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-secondary">実振込額</p>
                    <p className="font-medium text-primary text-lg">¥{request.net_payout.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-secondary">
                  <span>
                    振込可能日: {format(new Date(request.payout_eligible_date), 'M月d日', { locale: ja })}
                  </span>
                  {request.status === 'paid' && request.payout_date && (
                    <span className="text-green-600 font-medium">
                      振込完了: {format(new Date(request.payout_date), 'M月d日', { locale: ja })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};