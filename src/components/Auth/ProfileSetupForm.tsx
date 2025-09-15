import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Camera, User, Award, FileText, MessageSquare, Upload, X, MapPin } from 'lucide-react';

interface ProfileSetupFormProps {
  onComplete: () => void;
}

export const ProfileSetupForm: React.FC<ProfileSetupFormProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    avatar_url: '',
    bio: '',
    experience: '',
    qualifications: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください。');
      return;
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      return;
    }

    setImageUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        avatar_url: data.publicUrl
      }));
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('画像のアップロードに失敗しました。');
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      avatar_url: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // トレーナーの場合はニックネームが必須
    if (user?.role === 'trainer' && !formData.nickname.trim()) {
      setError('ニックネームは必須です。');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updateData: any = {};
      
      if (formData.nickname) updateData.name = formData.nickname;
      if (formData.avatar_url) updateData.avatar_url = formData.avatar_url;
      if (formData.bio) updateData.bio = formData.bio;
      if (formData.experience) updateData.experience = formData.experience;
      if (formData.qualifications) updateData.qualifications = formData.qualifications;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user?.id);

        if (error) throw error;
      }

      onComplete();
    } catch (err) {
      setError('プロフィール設定に失敗しました。');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // クライアントの場合はスキップ可能、トレーナーの場合はニックネームが必要
    if (user?.role === 'trainer' && !formData.nickname.trim()) {
      setError('トレーナーの場合、ニックネームの設定が必要です。');
      return;
    }
    onComplete();
  };

  const isTrainer = user?.role === 'trainer';

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/FIT4U copy.png" 
            alt="FIT4U" 
            className="w-16 h-16 rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-default-text">プロフィール設定</h2>
          <p className="text-secondary mt-2">My Pageより後から変更できます</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-default-text mb-1">
              <User className="inline w-4 h-4 mr-1" />
              ニックネーム{isTrainer ? '（必須）' : '（任意）'}
            </label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="表示名を入力してください"
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required={isTrainer}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-default-text mb-1">
              <Camera className="inline w-4 h-4 mr-1" />
              アイコン写真（任意）
            </label>
            
            {formData.avatar_url ? (
              <div className="relative">
                <img
                  src={formData.avatar_url}
                  alt="プロフィール画像"
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-2"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-0 right-1/2 transform translate-x-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-secondary/30 rounded-md p-4 text-center">
                <Upload className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-sm text-secondary mb-2">画像をアップロード</p>
              </div>
            )}
            
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={imageUploading}
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {imageUploading && (
              <p className="text-sm text-primary mt-1">アップロード中...</p>
            )}
            <p className="text-xs text-secondary mt-1">JPG, PNG形式、5MB以下</p>
          </div>

          {isTrainer && (
            <>
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-default-text mb-1">
                  <MessageSquare className="inline w-4 h-4 mr-1" />
                  自己紹介（任意）
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="自己紹介を入力してください"
                  className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-default-text mb-1">
                  <FileText className="inline w-4 h-4 mr-1" />
                  経歴・実績（任意）
                </label>
                <textarea
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={4}
                  placeholder="これまでの経歴や実績を入力してください"
                  className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="qualifications" className="block text-sm font-medium text-default-text mb-1">
                  <Award className="inline w-4 h-4 mr-1" />
                  保有資格（任意）
                </label>
                <textarea
                  id="qualifications"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  rows={3}
                  placeholder="保有している資格を入力してください"
                  className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-2 border border-secondary/30 text-secondary rounded-md hover:bg-secondary/10 transition-colors"
            >
              {isTrainer && !formData.nickname ? '後で設定' : 'スキップ'}
            </button>
            <button
              type="submit"
              disabled={loading || imageUploading}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '設定中...' : '完了'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-secondary">
            {isTrainer 
              ? 'ニックネーム以外の項目は任意です。My Pageからいつでも変更できます。'
              : 'すべての項目は任意です。My Pageからいつでも変更できます。'
            }
          </p>
        </div>
      </div>
    </div>
  );
};