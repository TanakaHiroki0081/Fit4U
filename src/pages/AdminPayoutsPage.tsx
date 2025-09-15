import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { approvePayoutRequest, generatePayoutCSV } from '../api/payout-requests';
import { PayoutRequest } from '../types';
import { DollarSign, Calendar, User, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const AdminPayoutsPage: React.FC = () => {
  const { user } = useAuth();
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPayoutRequests();
    }
  }, [user]);

  const fetchPayoutRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select(`
          *,
          trainer:users(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayoutRequests(data || []);
    } catch (error) {
      console.error('Error fetching payout requests:', error);
      setError('振込申請の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payoutRequestId: string) => {
    setProcessing(payoutRequestId);
    setError('');

    try {
      const { error } = await approvePayoutRequest(payoutRequestId);
      if (error) throw error;

      await fetchPayoutRequests();
      alert('振込申請を承認しました。');
    } catch (error: any) {
      setError(`承認に失敗しました: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleGenerateCSV = async () => {
    if (selectedRequests.length === 0) {
      alert('CSV出力する振込申請を選択してください。');
      return;
    }

    setProcessing('csv');
    setError('');

    try {
      const { csvContent, error } = await generatePayoutCSV(selectedRequests);
      if (error) throw error;

      // Download CSV file
      const blob = new Blob([csvContent || ''], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payout_${format(new Date(), 'yyyyMMdd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSelectedRequests([]);
      await fetchPayoutRequests();
      alert('CSV出力が完了しました。');
    } catch (error: any) {
      setError(`CSV出力に失敗しました: ${error.message}`);
    } finally {
      setProcessing(null);
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
        return <CheckCircle className="w-4 h-4" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
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

  const approvedRequests = payoutRequests.filter(r => r.status === 'approved');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-default-text">振込管理</h1>
          {approvedRequests.length > 0 && (
            <button
              onClick={handleGenerateCSV}
              disabled={processing === 'csv' || selectedRequests.length === 0}
              className="inline-flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              <span>{processing === 'csv' ? 'CSV出力中...' : 'CSV出力'}</span>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">承認待ち</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800 mt-2">
              {payoutRequests.filter(r => r.status === 'pending').length}
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">承認済み</span>
            </div>
            <p className="text-2xl font-bold text-blue-800 mt-2">
              {approvedRequests.length}
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">振込完了</span>
            </div>
            <p className="text-2xl font-bold text-green-800 mt-2">
              {payoutRequests.filter(r => r.status === 'paid').length}
            </p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">総振込額</span>
            </div>
            <p className="text-2xl font-bold text-purple-800 mt-2">
              ¥{payoutRequests
                .filter(r => r.status === 'paid')
                .reduce((sum, r) => sum + r.net_payout, 0)
                .toLocaleString()}
            </p>
          </div>
        </div>

        {/* CSV Selection for Approved Requests */}
        {approvedRequests.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-2">CSV出力対象選択</h3>
            <div className="space-y-2">
              {approvedRequests.map(request => (
                <label key={request.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedRequests.includes(request.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRequests([...selectedRequests, request.id]);
                      } else {
                        setSelectedRequests(selectedRequests.filter(id => id !== request.id));
                      }
                    }}
                    className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-700">
                    {request.trainer?.name} - ¥{request.net_payout.toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payout Requests List */}
      <div className="space-y-4">
        {payoutRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <DollarSign className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">振込申請はありません</p>
          </div>
        ) : (
          payoutRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-default-text mb-1">
                    {request.trainer?.name}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-secondary">
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>{request.trainer?.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>
                        {format(new Date(request.period_start), 'M月d日', { locale: ja })} - 
                        {format(new Date(request.period_end), 'M月d日', { locale: ja })}
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
                  <p className="text-secondary">総売上</p>
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

              <div className="flex items-center justify-between text-sm text-secondary mb-4">
                <span>
                  申請日: {format(new Date(request.request_date), 'M月d日 HH:mm', { locale: ja })}
                </span>
                <span>
                  振込可能日: {format(new Date(request.payout_eligible_date), 'M月d日', { locale: ja })}
                </span>
              </div>

              {request.status === 'pending' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={processing === request.id}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === request.id ? '承認中...' : '振込承認'}
                  </button>
                </div>
              )}

              {request.status === 'paid' && request.payout_date && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-600">
                    <strong>振込完了:</strong> {format(new Date(request.payout_date), 'M月d日 HH:mm', { locale: ja })}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};