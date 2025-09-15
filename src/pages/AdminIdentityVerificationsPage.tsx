import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { IdentityVerification } from '../types';
import { FileText, CheckCircle, XCircle, Clock, AlertCircle, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const AdminIdentityVerificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchVerifications();
    }
  }, [user]);

  const fetchVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('*, trainer:users!identity_verifications_trainer_id_fkey(name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      setError('本人確認申請の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (verificationId: string, trainerId: string) => {
    setProcessing(verificationId);
    setError('');

    try {
      // Update verification status
      const { error: verificationError } = await supabase
        .from('identity_verifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', verificationId);

      if (verificationError) throw verificationError;

      // Update user's identity_verified status
      const { error: userError } = await supabase
        .from('users')
        .update({ identity_verified: true })
        .eq('id', trainerId);

      if (userError) throw userError;

      await fetchVerifications();
      alert('本人確認を承認しました。');
    } catch (error: any) {
      setError(`承認に失敗しました: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (verificationId: string, trainerId: string) => {
    const notes = prompt('却下理由を入力してください:');
    if (!notes || !notes.trim()) return;

    setProcessing(verificationId);
    setError('');

    try {
      // Update verification status
      const { error: verificationError } = await supabase
        .from('identity_verifications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          notes: notes.trim()
        })
        .eq('id', verificationId);

      if (verificationError) throw verificationError;

      // Update user's identity_verified status
      const { error: userError } = await supabase
        .from('users')
        .update({ identity_verified: false })
        .eq('id', trainerId);

      if (userError) throw userError;

      await fetchVerifications();
      alert('本人確認を却下しました。');
    } catch (error: any) {
      setError(`却下に失敗しました: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '確認中',
      approved: '承認済み',
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
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      drivers_license: '運転免許証',
      mynumber_card: 'マイナンバーカード',
      passport: 'パスポート',
      residence_card: '在留カード・特別永住者証明書'
    };
    return labels[type as keyof typeof labels] || type;
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-4">本人確認管理</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">確認中</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800 mt-2">
              {verifications.filter(v => v.status === 'pending').length}
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">承認済み</span>
            </div>
            <p className="text-2xl font-bold text-green-800 mt-2">
              {verifications.filter(v => v.status === 'approved').length}
            </p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">却下</span>
            </div>
            <p className="text-2xl font-bold text-red-800 mt-2">
              {verifications.filter(v => v.status === 'rejected').length}
            </p>
          </div>
        </div>
      </div>

      {/* Verifications List */}
      <div className="space-y-4">
        {verifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FileText className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">本人確認申請はありません</p>
          </div>
        ) : (
          verifications.map((verification) => (
            <div
              key={verification.id}
              className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-default-text mb-1">
                    {verification.trainer?.name}
                  </h3>
                  <p className="text-secondary text-sm mb-2">{verification.trainer?.email}</p>
                  <div className="flex items-center space-x-4 text-sm text-secondary">
                    <span>書類: {getDocumentTypeLabel(verification.document_type)}</span>
                    <span>提出日: {format(new Date(verification.submitted_at), 'M月d日 HH:mm', { locale: ja })}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(verification.status)}`}>
                    {getStatusIcon(verification.status)}
                    <span>{getStatusLabel(verification.status)}</span>
                  </span>
                </div>
              </div>

              {/* Document Image */}
              <div className="mb-4">
                <div className="relative inline-block">
                  <img
                    src={verification.document_image_url}
                    alt="本人確認書類"
                    className="max-w-xs rounded-md border border-secondary/30 cursor-pointer hover:opacity-80"
                    onClick={() => setSelectedImage(verification.document_image_url)}
                  />
                  <button
                    onClick={() => setSelectedImage(verification.document_image_url)}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    <Eye size={12} />
                  </button>
                </div>
              </div>

              {verification.status === 'pending' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleApprove(verification.id, verification.trainer_id)}
                    disabled={processing === verification.id}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === verification.id ? '処理中...' : '承認'}
                  </button>
                  <button
                    onClick={() => handleReject(verification.id, verification.trainer_id)}
                    disabled={processing === verification.id}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === verification.id ? '処理中...' : '却下'}
                  </button>
                </div>
              )}

              {verification.status === 'rejected' && verification.notes && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">
                    <strong>却下理由:</strong> {verification.notes}
                  </p>
                </div>
              )}

              {verification.status === 'approved' && verification.reviewed_at && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-600">
                    <strong>承認日:</strong> {format(new Date(verification.reviewed_at), 'M月d日 HH:mm', { locale: ja })}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">本人確認書類</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-secondary hover:text-default-text"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage}
                alt="本人確認書類（拡大）"
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
