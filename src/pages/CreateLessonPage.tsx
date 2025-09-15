import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, Users, MapPin, Monitor, DollarSign } from 'lucide-react';

export const CreateLessonPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'yoga' as 'yoga' | 'pilates' | 'stretch' | 'strength' | 'dance' | 'boxing' | 'hiit' | 'other',
    duration: 60,
    max_participants: 10,
    price: 3000,
    date: '',
    time: '',
    location: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      setError('レッスンタイトルを入力してください。');
      return;
    }
    if (!formData.description.trim()) {
      setError('レッスン説明を入力してください。');
      return;
    }
    if (!formData.date) {
      setError('開催日を選択してください。');
      return;
    }
    if (!formData.time) {
      setError('開始時間を選択してください。');
      return;
    }
    if (!formData.location.trim()) {
      setError('開催場所を入力してください。');
      return;
    }
    
    setError('');
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert([{
          trainer_id: user?.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          duration: parseInt(formData.duration.toString()),
          max_participants: parseInt(formData.max_participants.toString()),
          price: parseInt(formData.price.toString()),
          date: formData.date,
          time: formData.time,
          location: formData.location,
          status: 'scheduled'
        }]);

      if (error) throw error;

      console.log('Lesson created successfully:', data);
      navigate('/lessons');
    } catch (err) {
      console.error('Error creating lesson:', err);
      setError('レッスンの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      yoga: 'ヨガ系',
      pilates: 'ピラティス系',
      stretch: 'ストレッチ系',
      strength: '筋トレ系',
      dance: 'ダンス系',
      boxing: 'ボクシング系',
      hiit: 'HIIT系',
      other: 'その他'
    };
    return labels[category as keyof typeof labels] || category;
  };

  if (user?.role !== 'trainer') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-4">アクセス拒否</h1>
        <p className="text-secondary">この機能はトレーナーのみ利用可能です。</p>
      </div>
    );
  }

  // Gate by identity verification
  const [idvStatus, setIdvStatus] = useState<'pending' | 'approved' | 'rejected' | 'not_submitted'>('not_submitted');
  React.useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('identity_verifications')
        .select('status')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const status = data && data[0]?.status ? data[0].status : null;
      setIdvStatus((status as any) || 'not_submitted');
    };
    run();
  }, [user?.id]);

  if (idvStatus !== 'approved') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-4">本人確認が必要です</h1>
        {idvStatus === 'pending' ? (
          <p className="text-secondary">管理者が確認中です（平均2営業日）。承認完了後にレッスンを掲載できます。</p>
        ) : idvStatus === 'rejected' ? (
          <p className="text-secondary">本人確認が却下されています。再提出をお願いします。</p>
        ) : (
          <p className="text-secondary">レッスン掲載には本人確認の提出が必要です。</p>
        )}
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-default-text mb-6">レッスン内容確認</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-default-text mb-1">レッスンタイトル</label>
                <p className="text-default-text">{formData.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-default-text mb-1">カテゴリ</label>
                <p className="text-default-text">{getCategoryLabel(formData.category)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-default-text mb-1">レッスン説明</label>
              <p className="text-default-text whitespace-pre-wrap">{formData.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-default-text mb-1">開催日</label>
                <p className="text-default-text">
                  {formData.date ? format(new Date(formData.date), 'yyyy年M月d日(E)', { locale: ja }) : '未設定'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-default-text mb-1">開始時間</label>
                <p className="text-default-text">{formData.time}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-default-text mb-1">時間（分）</label>
                <p className="text-default-text">{formData.duration}分</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-default-text mb-1">最大参加者数</label>
                <p className="text-default-text">{formData.max_participants}名</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-default-text mb-1">料金</label>
                <p className="text-default-text">¥{formData.price.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-default-text mb-1">
                開催場所
              </label>
              <p className="text-default-text">{formData.location}</p>
            </div>
          </div>

          {/* 留意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <h3 className="font-medium text-yellow-800 mb-2">留意事項</h3>
            <ul className="text-sm text-yellow-700 space-y-2">
              <li>• トレーニングの内容・日時・料金・場所（具体的な会場住所を含む）は事前に正確に登録し、会場確保を完了した上で掲載をお願いいたします。※トレーニング参加者に、トレーニング会場での場所代や入場料等の追加費用を負担させる行為は禁止です。</li>
              <li>• 既に1件でも予約が成立したレッスンの日時・料金・場所を変更することはできません。変更したい場合は、一度、当該レッスンをキャンセルの上、正しい日時・料金・場所（具体的な会場住所を含め）を記載の上、レッスンを新たに登録し直す必要があります。</li>
              <li>• FIT4Uプラットフォーム以外で、参加者とやりとり・支払いを行うと、アカウント停止措置となります。</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 px-4 py-2 border border-gray-300 text-secondary rounded-lg hover:bg-gray-50 transition-colors"
            >
              修正
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '作成中...' : '確定'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-default-text mb-6">新しいレッスンを作成</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-default-text mb-1">
              レッスンタイトル *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-default-text mb-1">
              レッスン説明 *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-default-text mb-1">
                カテゴリ *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
              >
                <option value="yoga">ヨガ系</option>
                <option value="pilates">ピラティス系</option>
                <option value="stretch">ストレッチ系</option>
                <option value="strength">筋トレ系</option>
                <option value="dance">ダンス系</option>
                <option value="boxing">ボクシング系</option>
                <option value="hiit">HIIT系</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-default-text mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                開催日 *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-default-text mb-1">
                <Clock className="inline w-4 h-4 mr-1" />
                開始時間 *
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-default-text mb-1">
                <Clock className="inline w-4 h-4 mr-1" />
                時間（分） *
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="15"
                max="180"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="max_participants" className="block text-sm font-medium text-default-text mb-1">
                <Users className="inline w-4 h-4 mr-1" />
                最大参加者数 *
              </label>
              <input
                type="number"
                id="max_participants"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleChange}
                min="1"
                max="50"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-default-text mb-1">
                <DollarSign className="inline w-4 h-4 mr-1" />
                料金（円） *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="100"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-default-text mb-1">
              <MapPin className="inline w-4 h-4 mr-1" />
              開催場所（正確に住所・建物名・部屋番号をご記載ください） *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="例：東京都渋谷区渋谷1-1-1 渋谷ビル 3階 スタジオA"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
              required
            />
            <p className="text-xs text-secondary mt-1">
              正確に住所・建物名・部屋番号をご記載ください
            </p>
            
            {/* Studio Search Links */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">【スタジオ検索に便利なサイト】</p>
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-blue-700">・</span>
                  <a
                    href="https://www.spacemarket.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 underline font-medium"
                  >
                    Spacemarket
                  </a>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-blue-700">・</span>
                  <a
                    href="https://www.instabase.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 underline font-medium"
                  >
                    Instabase
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/lessons')}
              className="flex-1 px-6 py-3 border border-gray-300 text-secondary rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm font-medium"
            >
              {loading ? '作成中...' : 'レッスンを作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};