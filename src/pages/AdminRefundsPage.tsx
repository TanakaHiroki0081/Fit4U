import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { processRefund } from '../api/process-refund';
import { Refund } from '../types';
import { Calendar, Clock, DollarSign, User, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const AdminRefundsPage: React.FC = () => {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRefunds();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRefunds = async () => {
    try {
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          lesson:lessons!refunds_lesson_id_fkey(
            *,
            trainer:users!lessons_trainer_id_fkey(name)
          ),
          trainee:users!refunds_trainee_id_fkey(name),
          payment:payments!refunds_payment_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRefunds(data || []);
    } catch (err) {
      console.error('Error fetching refunds:', err);
      setError('返金リストの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async (refundId: string, action: 'approve' | 'reject') => {
    setProcessing(refundId);
    setError('');

    try {
      const res = await processRefund({ refundId, action });
      console.log('process-refund result:', res); // 最小確認ログ
      await fetchRefunds();                       // 最新化
      alert(action === 'approve' ? '返金処理を受け付けました（Webhookで最終確定されます）。' : '返金申請を却下しました。');
    } catch (err: any) {
      console.error('process-refund failed:', err);
      setError(`処理に失敗しました: ${err?.message ?? String(err)}`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',    // 承認済み（最終確定前）
      refunded: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '承認待ち',
      approved: '承認済み',
      refunded: '返金完了',
      rejected: '却下'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':  return <AlertCircle className="w-4 h-4" />;
      case 'approved': return <Info className="w-4 h-4" />;
      case 'refunded': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default:         return <AlertCircle className="w-4 h-4" />;
    }
  };

  // ▼ “固定定義”の集計（上部タイルはこの値のみを使用）
  const stats = useMemo(() => {
    const pending  = refunds.filter(r => r.refund_status === 'pending').length;
    const refunded = refunds.filter(r => r.refund_status === 'refunded').length;
    const rejected = refunds.filter(r => r.refund_status === 'rejected').length;
    const totalRefundedAmount = refunds
      .filter(r => r.refund_status === 'refunded')
      .reduce((sum, r) => sum + r.refund_amount, 0);
    return { pending, refunded, rejected, totalRefundedAmount };
  }, [refunds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ロールで判定（メール固定は廃止）
  if (user?.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-default-text mb-4">アクセス拒否</h1>
        <p className="text-secondary">この機能は管理者のみ利用可能です。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-4">返金管理</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* 上部タイル：集計は固定定義（pending / refunded / rejected と総返金額） */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">承認待ち</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800 mt-2">{stats.pending}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">返金完了</span>
            </div>
            <p className="text-2xl font-bold text-green-800 mt-2">{stats.refunded}</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">却下</span>
            </div>
            <p className="text-2xl font-bold text-red-800 mt-2">{stats.rejected}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">総返金額（確定）</span>
            </div>
            <p className="text-2xl font-bold text-blue-800 mt-2">
              ¥{stats.totalRefundedAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 補足：approved は中間状態 */}
        <p className="text-xs text-secondary">
          ※「承認済み（approved）」は Stripe 返金申請後、Webhook により「返金完了（refunded）」へ最終確定されます。
        </p>
      </div>

      <div className="space-y-4">
        {refunds.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">返金申請はありません</p>
          </div>
        ) : (
          refunds.map((refund) => (
            <div
              key={refund.id}
              className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-default-text mb-1">
                    {refund.lesson?.title}
                  </h3>
                  <div className="flex items-center space-x-2 mb-2">
                    {(refund as any)?.refund_reason?.includes('トレーナー都合') && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">トレーナー都合によるキャンセル</span>
                    )}
                    {refund.refund_amount === 0 && (
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">返金額 0 円</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-secondary">
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>トレーニー: {refund.trainee?.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>トレーナー: {refund.lesson?.trainer?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(
                      refund.refund_status
                    )}`}
                  >
                    {getStatusIcon(refund.refund_status)}
                    <span>{getStatusLabel(refund.refund_status)}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-secondary">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>
                    {refund.lesson && format(new Date(refund.lesson.date), 'M月d日(E)', { locale: ja })}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{refund.lesson?.time}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign size={14} />
                  <span>返金額: ¥{refund.refund_amount.toLocaleString()}</span>
                </div>
                <div className="text-xs">
                  申請日: {format(new Date(refund.created_at), 'M月d日 HH:mm', { locale: ja })}
                </div>
              </div>

              {refund.refund_status === 'pending' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleProcessRefund(refund.id, 'approve')}
                    disabled={processing === refund.id}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === refund.id ? '処理中...' : '返金承認'}
                  </button>
                  <button
                    onClick={() => handleProcessRefund(refund.id, 'reject')}
                    disabled={processing === refund.id}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === refund.id ? '処理中...' : '却下'}
                  </button>
                </div>
              )}

              {refund.refund_status === 'refunded' && refund.stripe_refund_id && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-600">
                    <strong>返金完了:</strong>{' '}
                    {refund.refund_date &&
                      format(new Date(refund.refund_date), 'M月d日 HH:mm', { locale: ja })}
                  </p>
                  <p className="text-xs text-green-600 font-mono">Stripe ID: {refund.stripe_refund_id}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
