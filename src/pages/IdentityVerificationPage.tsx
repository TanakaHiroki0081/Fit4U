import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { IdentityVerification } from '../types';
import { Upload, FileText, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

export const IdentityVerificationPage: React.FC = () => {
  const { user } = useAuth();
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    document_type: 'drivers_license',
    document_image_url: ''
  });

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchVerification();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchVerification = async () => {
    try {
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('*')
        .eq('trainer_id', user?.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setVerification(data);
    } catch (error) {
      console.error('Error fetching verification:', error);
      setError('本人確認情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください。');
      return;
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // 画像をBase64に変換して保存（簡易実装）
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({
          ...prev,
          document_image_url: result
        }));
        setUploading(false);
      };
      reader.onerror = () => {
        setError('画像の読み込みに失敗しました。');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('画像のアップロードに失敗しました。');
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      document_image_url: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.document_image_url) {
      setError('本人確認書類の画像をアップロードしてください。');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('identity_verifications')
        .insert([{
          trainer_id: user?.id,
          document_type: formData.document_type,
          document_image_url: formData.document_image_url
        }]);

      if (error) throw error;

      setSuccess('本人確認書類を提出しました。管理者による確認をお待ちください。');
      await fetchVerification();
      
      // Reset form
      setFormData({
        document_type: 'drivers_license',
        document_image_url: ''
      });
    } catch (err) {
      setError('本人確認書類の提出に失敗しました。');
      console.error('Error submitting verification:', err);
    } finally {
      setUploading(false);
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
        return <AlertCircle className="w-4 h-4" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'trainer') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-default-text mb-4">アクセス拒否</h1>
        <p className="text-secondary">この機能はトレーナーのみ利用可能です。</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-6">本人確認手続き</h1>

        {/* Current Status */}
        {verification && (
          <div className={`rounded-md p-4 mb-6 ${
            verification.status === 'approved' 
              ? 'bg-green-50 border border-green-200' 
              : verification.status === 'rejected'
              ? 'bg-red-50 border border-red-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              {getStatusIcon(verification.status)}
              <p className={`text-sm font-medium ${
                verification.status === 'approved' ? 'text-green-800' : 
                verification.status === 'rejected' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                本人確認ステータス: {getStatusLabel(verification.status)}
              </p>
            </div>
            {verification.status === 'approved' && (
              <p className="text-sm text-green-600 mt-1">
                本人確認が完了しています。プロフィールに「本人確認済み」と表示されます。
              </p>
            )}
            {verification.status === 'rejected' && verification.notes && (
              <p className="text-sm text-red-600 mt-1">
                却下理由: {verification.notes}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Upload Form */}
        {(!verification || verification.status === 'rejected') && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="font-medium text-blue-800 mb-2">提出書類について</h3>
              <p className="text-sm text-blue-700 mb-2">
                顔写真と住所が確認できる本人確認書類の写真をアップロードしてください。
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 運転免許証</li>
                <li>• マイナンバーカード</li>
                <li>• パスポート</li>
                <li>• 在留カード・特別永住者証明書</li>
              </ul>
              <p className="text-sm text-blue-700 mt-2">
                ※ 本人確認書類提出が済み、管理者による確認が済んだ場合は、「本人確認済み」とトレーナープロフィール画面に表示されます。
              </p>
            </div>

            <div>
              <label htmlFor="document_type" className="block text-sm font-medium text-default-text mb-1">
                書類の種類 *
              </label>
              <select
                id="document_type"
                name="document_type"
                value={formData.document_type}
                onChange={(e) => setFormData(prev => ({ ...prev, document_type: e.target.value }))}
                className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="drivers_license">運転免許証</option>
                <option value="mynumber_card">マイナンバーカード</option>
                <option value="passport">パスポート</option>
                <option value="residence_card">在留カード・特別永住者証明書</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-default-text mb-1">
                <FileText className="inline w-4 h-4 mr-1" />
                本人確認書類の画像 *
              </label>
              
              {formData.document_image_url ? (
                <div className="relative">
                  <img
                    src={formData.document_image_url}
                    alt="本人確認書類"
                    className="w-full max-w-md rounded-md border border-secondary/30 mb-2"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-secondary/30 rounded-md p-8 text-center">
                  <Upload className="w-12 h-12 text-secondary mx-auto mb-4" />
                  <p className="text-sm text-secondary mb-2">画像をアップロード</p>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {uploading && (
                <p className="text-sm text-primary mt-1">アップロード中...</p>
              )}
              <p className="text-xs text-secondary mt-1">JPG, PNG形式、10MB以下</p>
            </div>

            <button
              type="submit"
              disabled={uploading || !formData.document_image_url}
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? '提出中...' : '本人確認書類を提出'}
            </button>
          </form>
        )}

        {/* Verification History */}
        {verification && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-default-text mb-4">提出履歴</h3>
            <div className="border border-secondary/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-default-text">
                  {getDocumentTypeLabel(verification.document_type)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(verification.status)}`}>
                  {getStatusIcon(verification.status)}
                  <span>{getStatusLabel(verification.status)}</span>
                </span>
              </div>
              <p className="text-sm text-secondary">
                提出日: {format(new Date(verification.submitted_at), 'yyyy年M月d日 HH:mm', { locale: ja })}
              </p>
              {verification.reviewed_at && (
                <p className="text-sm text-secondary">
                  確認日: {format(new Date(verification.reviewed_at), 'yyyy年M月d日 HH:mm', { locale: ja })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};