// src/pages/AdminPaymentsPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Payment } from '../types';
import { PaymentStatus } from '../components/PaymentStatus';
import { getStripeDashboardUrl } from '../api/stripe-utils';
import { DollarSign, Calendar, User, CreditCard, AlertCircle, ExternalLink, Link as LinkIcon, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type AdminPayment = Payment & {
  lesson?: {
    title?: string | null;
    date?: string | null;
    trainer?: { name?: string | null } | null;
  } | null;
  trainee?: { name?: string | null } | null;
  // DB 側で null になり得るものは optional/null 許容
  stripe_session_id?: string | null;
  payment_intent_id?: string | null;
  charge_id?: string | null;
  paid_at?: string | null;
  stripe_fee?: number | null;
  net_amount?: number | null;
};

export const AdminPaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'refunded'>('all');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          lesson:lessons(
            title,
            date,
            trainer:users!lessons_trainer_id_fkey(name)
          ),
          trainee:users!payments_trainee_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data as AdminPayment[]) || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('決済履歴の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  /** payment_intent_id / charge_id が未保存のレコードを、session_id から解決して保存 */
  const resolveIdentifiers = async (p: AdminPayment) => {
    if (!p?.stripe_session_id) return;
    setResolvingId(p.id);
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId: p.stripe_session_id },
      });
      if (error) throw error;

      const payment_intent_id: string | undefined =
        data?.payment_intent_id || data?.payment_intent || data?.paymentIntentId || data?.pi;
      const charge_id: string | undefined =
        data?.charge_id || data?.charge || data?.chargeId;

      if (!payment_intent_id && !charge_id) {
        throw new Error('verify-payment から識別子を取得できませんでした');
      }

      // 管理者は更新できる前提の RLS にしている想定
      const { data: updated, error: upErr } = await supabase
        .from('payments')
        .update({
          ...(payment_intent_id ? { payment_intent_id } : {}),
          ...(charge_id ? { charge_id } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id)
        .select()
        .single();

      if (upErr) throw upErr;

      // 画面の state も同期
      setPayments((prev) => prev.map((row) => (row.id === p.id ? { ...row, ...updated } : row)));
    } catch (e) {
      console.warn('Resolve failed:', e);
      alert('Stripe識別子の解決に失敗しました。時間を置いて再試行してください。');
    } finally {
      setResolvingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      paid: '支払い済み',
      refunded: '返金済み',
      cancelled: 'キャンセル',
    };
    return labels[status as keyof typeof labels] || status;
  };

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

  const filteredPayments = payments.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-default-text">決済履歴</h1>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">すべての決済</option>
            <option value="paid">支払い済み</option>
            <option value="refunded">返金済み</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-800">総決済数</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">{payments.length}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">総売上</span>
            </div>
            <p className="text-2xl font-bold text-green-800 mt-2">
              ¥
              {payments
                .filter((p) => p.status === 'paid')
                .reduce((sum, p) => sum + (p.amount || 0), 0)
                .toLocaleString()}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">総返金額</span>
            </div>
            <p className="text-2xl font-bold text-red-800 mt-2">
              ¥
              {payments
                .filter((p) => p.status === 'refunded')
                .reduce((sum, p) => sum + (p.amount || 0), 0)
                .toLocaleString()}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Stripe手数料</span>
            </div>
            <p className="text-2xl font-bold text-blue-800 mt-2">
              ¥{payments.reduce((sum, p) => sum + (p.stripe_fee ?? 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <CreditCard className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">決済履歴がありません</p>
          </div>
        ) : (
          filteredPayments.map((payment) => {
            const stripeLink =
              payment.payment_intent_id ? getStripeDashboardUrl(payment.payment_intent_id) : null;

            return (
              <div key={payment.id} className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-default-text mb-1">
                      {payment.lesson?.title ?? '（タイトル未設定）'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                      <div className="flex items-center space-x-1">
                        <User size={14} />
                        <span>トレーニー: {payment.trainee?.name ?? '—'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User size={14} />
                        <span>トレーナー: {payment.lesson?.trainer?.name ?? '—'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>
                          {payment.lesson?.date
                            ? format(new Date(payment.lesson.date), 'M月d日(E)', { locale: ja })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <PaymentStatus
                      status={payment.status as any}
                      paymentIntentId={payment.payment_intent_id || undefined}
                      amount={payment.amount}
                      showDetails={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-secondary">支払い金額</p>
                    <p className="font-medium text-default-text text-lg">¥{(payment.amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-secondary">Stripe手数料</p>
                    <p className="font-medium text-red-600">¥{(payment.stripe_fee ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-secondary">実入金額</p>
                    <p className="font-medium text-green-600">¥{(payment.net_amount ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-secondary">決済日時</p>
                    <p className="font-medium text-default-text">
                      {payment.paid_at
                        ? format(new Date(payment.paid_at), 'M月d日 HH:mm', { locale: ja })
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                  {payment.stripe_session_id && (
                    <p className="text-secondary">
                      <strong>Stripe Session ID:</strong>
                      <span className="font-mono text-xs ml-2">{payment.stripe_session_id}</span>
                    </p>
                  )}
                  {payment.payment_intent_id && (
                    <p className="text-secondary">
                      <strong>Payment Intent ID:</strong>
                      <span className="font-mono text-xs ml-2">{payment.payment_intent_id}</span>
                    </p>
                  )}
                  {payment.charge_id && (
                    <p className="text-secondary">
                      <strong>Charge ID:</strong>
                      <span className="font-mono text-xs ml-2">{payment.charge_id}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {stripeLink ? (
                      <a
                        href={stripeLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        title="Stripe ダッシュボードで確認"
                      >
                        <ExternalLink size={16} />
                        Stripeで確認
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-secondary">
                        <LinkIcon size={16} />
                        Stripeリンクなし
                      </span>
                    )}

                    {/* Intent/Charge が未保存の場合のワンクリック解決 */}
                    {!payment.payment_intent_id && payment.stripe_session_id && (
                      <button
                        onClick={() => resolveIdentifiers(payment)}
                        disabled={resolvingId === payment.id}
                        className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-60"
                        title="session_id から Intent/Charge を解決して保存"
                      >
                        <RefreshCcw size={16} className={resolvingId === payment.id ? 'animate-spin' : ''} />
                        識別子を解決
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
