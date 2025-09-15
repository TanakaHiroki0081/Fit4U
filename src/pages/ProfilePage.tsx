import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Camera, Award, FileText, MessageSquare, Upload, X, Edit, Save, Ambulance as Cancel } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    avatar_url: '',
    bio: '',
    specialties: [] as string[],
    location: '',
    experience: '',
    qualifications: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        name: data.name || '',
        avatar_url: data.avatar_url || '',
        bio: data.bio || '',
        specialties: data.specialties || [],
        location: profile?.location || '',
        experience: data.experience || '',
        qualifications: data.qualifications || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('プロフィール情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const specialties = e.target.value.split(',').map(s => s.trim()).filter(s => s);
    setFormData(prev => ({
      ...prev,
      specialties
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください。');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      return;
    }

    setImageUploading(true);
    setError('');

    try {
      // 画像をBase64に変換して保存（簡易実装）
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({
          ...prev,
          avatar_url: result
        }));
        setImageUploading(false);
      };
      reader.onerror = () => {
        setError('画像の読み込みに失敗しました。');
        setImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('画像のアップロードに失敗しました。');
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      avatar_url: ''
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const updateData = {
        name: formData.name,
        avatar_url: formData.avatar_url,
        bio: formData.bio,
        specialties: formData.specialties,
        location: formData.location,
        experience: formData.experience,
        qualifications: formData.qualifications
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;

      await fetchProfile();
      setEditing(false);
      alert('プロフィールを更新しました！');
    } catch (err) {
      setError('プロフィールの更新に失敗しました。');
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      avatar_url: profile?.avatar_url || '',
      bio: profile?.bio || '',
      specialties: profile?.specialties || [],
      hourly_rate: profile?.hourly_rate || 0,
      experience: profile?.experience || '',
      qualifications: profile?.qualifications || ''
    });
    setEditing(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">プロフィールが見つかりません</h1>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-default-text">プロフィール</h1>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Edit size={16} />
              <span>編集</span>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Image */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="プロフィール画像"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                )}
              </div>
              
              {editing && (
                <div className="space-y-2">
                  {formData.avatar_url && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="block mx-auto bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                    className="block mx-auto text-sm"
                  />
                  {imageUploading && (
                    <p className="text-sm text-primary">アップロード中...</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-default-text mb-1">
              <User className="inline w-4 h-4 mr-1" />
              名前
            </label>
            {editing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            ) : (
              <p className="text-default-text">{profile.name || '未設定'}</p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-default-text mb-1">
              メールアドレス
            </label>
            <p className="text-light-gray">{profile.email}</p>
          </div>

          {/* Role (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-default-text mb-1">
              アカウントタイプ
            </label>
            <p className="text-light-gray">
              {profile.role === 'trainer' ? 'トレーナー' : '参加者'}
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-default-text mb-1">
              <MessageSquare className="inline w-4 h-4 mr-1" />
              自己紹介
            </label>
            {editing ? (
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                placeholder="自己紹介を入力してください"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            ) : (
              <p className="text-default-text whitespace-pre-wrap">
                {profile.bio || '未設定'}
              </p>
            )}
          </div>

          {/* Specialties (Trainer only) */}
          {profile.role === 'trainer' && (
            <div>
              <label className="block text-sm font-medium text-default-text mb-1">
                専門分野
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.specialties.join(', ')}
                  onChange={handleSpecialtiesChange}
                  placeholder="ヨガ, ピラティス, 筋トレ（カンマ区切り）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.specialties && profile.specialties.length > 0 ? (
                    profile.specialties.map((specialty: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <p className="text-light-gray">未設定</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Location (Trainer only) */}
          {profile.role === 'trainer' && (
            <div>
              <label className="block text-sm font-medium text-default-text mb-1">
                主な活動場所
              </label>
              {editing ? (
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="東京都渋谷区、新宿駅周辺など"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              ) : (
                <p className="text-default-text">
                  {profile.location || '未設定'}
                </p>
              )}
            </div>
          )}

          {/* Experience (Trainer only) */}
          {profile.role === 'trainer' && (
            <div>
              <label className="block text-sm font-medium text-default-text mb-1">
                <FileText className="inline w-4 h-4 mr-1" />
                経歴・実績
              </label>
              {editing ? (
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={4}
                  placeholder="これまでの経歴や実績を入力してください"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              ) : (
                <p className="text-default-text whitespace-pre-wrap">
                  {profile.experience || '未設定'}
                </p>
              )}
            </div>
          )}

          {/* Qualifications (Trainer only) */}
          {profile.role === 'trainer' && (
            <div>
              <label className="block text-sm font-medium text-default-text mb-1">
                <Award className="inline w-4 h-4 mr-1" />
                保有資格
              </label>
              {editing ? (
                <textarea
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  rows={3}
                  placeholder="保有している資格を入力してください"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              ) : (
                <p className="text-default-text whitespace-pre-wrap">
                  {profile.qualifications || '未設定'}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {editing && (
            <div className="flex space-x-4 pt-4">
              <button
                onClick={handleCancel}
                className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-secondary rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Cancel size={16} />
                <span>キャンセル</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || imageUploading}
                className="flex-1 inline-flex items-center justify-center space-x-2 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>{saving ? '保存中...' : '保存'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};