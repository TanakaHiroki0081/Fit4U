import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lesson, User } from '../types';
import { Star, Calendar, Clock, MapPin, Monitor, ArrowLeft, AlertTriangle } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface LessonReview {
  lesson: Lesson;
  rating: number;
  comment: string;
}

export const ReviewTrainerPage: React.FC = () => {
  const { trainerId } = useParams<{ trainerId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState<User | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [reviews, setReviews] = useState<Record<string, LessonReview>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (trainerId && user?.role === 'client') {
      fetchTrainerAndLessons();
    }
  }, [trainerId, user]);

  const fetchTrainerAndLessons = async () => {
    try {
      // Fetch trainer info
      const { data: trainerData, error: trainerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', trainerId)
        .eq('role', 'trainer')
        .single();

      if (trainerError) throw trainerError;
      setTrainer(trainerData);

      // Fetch unreviewed lessons with this trainer
      const { data: completedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          lesson:lessons!inner(*)
        `)
        .eq('client_id', user?.id)
        .eq('status', 'completed')
        .eq('lesson.trainer_id', trainerId)
        .not('lesson_id', 'in', `(
          SELECT lesson_id FROM reviews WHERE trainee_id = '${user?.id}'
        )`);

      if (bookingsError) throw bookingsError;

      const lessonsList = completedBookings?.map(booking => booking.lesson) || [];
      setLessons(lessonsList);

      // Initialize reviews state
      const initialReviews: Record<string, LessonReview> = {};
      lessonsList.forEach(lesson => {
        initialReviews[lesson.id] = {
          lesson,
          rating: 0,
          comment: ''
        };
      });
      setReviews(initialReviews);

    } catch (error) {
      console.error('Error fetching trainer and lessons:', error);
      setError('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const updateReview = (lessonId: string, field: 'rating' | 'comment', value: number | string) => {
    setReviews(prev => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        [field]: value
      }
    }));
  };

  const renderStars = (lessonId: string, currentRating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-6 h-6 cursor-pointer transition-colors ${
          i < currentRating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-200'
        }`}
        onClick={() => updateReview(lessonId, 'rating', i + 1)}
      />
    ));
  };

  const getRatingLabel = (rating: number) => {
    const labels = {
      0: '評価を選択してください',
      1: '不満',
      2: 'やや不満',
      3: '普通',
      4: '満足',
      5: '大変満足'
    };
    return labels[rating as keyof typeof labels] || '';
  };

  const handleNext = () => {
    // Validate that all lessons have ratings
    const hasUnratedLessons = Object.values(reviews).some(review => review.rating === 0);
    if (hasUnratedLessons) {
      setError('すべてのレッスンに評価を付けてください。');
      return;
    }

    // Navigate to confirmation page with review data
    navigate('/review-confirm', { 
      state: { 
        trainer, 
        reviews: Object.values(reviews) 
      } 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trainer || lessons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">
          レビュー対象のレッスンがありません
        </h1>
        <Link
          to="/review-selection"
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          レビュー選択に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/review-selection"
          className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
        >
          <ArrowLeft size={20} />
          <span>戻る</span>
        </Link>
        <h1 className="text-2xl font-bold text-default-text">レビュー入力</h1>
      </div>

      {/* Trainer Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            {trainer.avatar_url ? (
              <img
                src={trainer.avatar_url}
                alt={trainer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-default-text">{trainer.name}</h2>
            <p className="text-secondary">レビュー対象レッスン: {lessons.length}件</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Lessons Review Form */}
      <div className="space-y-4">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-default-text mb-2">{lesson.title}</h3>
              <div className="flex items-center space-x-4 text-sm text-secondary">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>
                    {format(new Date(lesson.date), 'M月d日(E)', { locale: ja })}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{lesson.time} ({lesson.duration}分)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin size={14} />
                  <span>{lesson.location}</span>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-default-text mb-2">
                評価 * <span className="text-xs text-secondary">(5が最高評価)</span>
              </label>
              <div className="flex items-center space-x-1 mb-2">
                {renderStars(lesson.id, reviews[lesson.id]?.rating || 0)}
              </div>
              <p className="text-sm text-secondary">
                {getRatingLabel(reviews[lesson.id]?.rating || 0)}
              </p>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-default-text mb-1">
                コメント（任意）
              </label>
              <textarea
                value={reviews[lesson.id]?.comment || ''}
                onChange={(e) => updateReview(lesson.id, 'comment', e.target.value)}
                rows={3}
                placeholder="レッスンの感想をお聞かせください..."
                className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={500}
              />
              <p className="text-xs text-secondary mt-1">
                {(reviews[lesson.id]?.comment || '').length}/500文字
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">レビュー投稿時の注意事項</p>
            <ul className="space-y-1 text-xs">
              <li>• 根拠なき誹謗中傷や人格を否定するようなコメントはお控えください</li>
              <li>• 投稿されたレビューやコメントは、当社がその内容が不適切と判断した場合は削除できるものとします</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Link
          to="/review-selection"
          className="flex-1 px-4 py-2 border border-secondary/30 text-secondary rounded-md hover:bg-secondary/10 transition-colors text-center"
        >
          キャンセル
        </Link>
        <button
          onClick={handleNext}
          className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
        >
          確認画面へ
        </button>
      </div>
    </div>
  );
};