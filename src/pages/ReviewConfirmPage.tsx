import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Lesson } from '../types';
import { Star, Calendar, Clock, MapPin, Monitor, ArrowLeft } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface LessonReview {
  lesson: Lesson;
  rating: number;
  comment: string;
}

interface LocationState {
  trainer: User;
  reviews: LessonReview[];
}

export const ReviewConfirmPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // useLocation を使わずに安全に state を取得（履歴 or セッション復元）
  const getLocationState = (): LocationState | null => {
    const usr = (typeof window !== 'undefined' && (window.history?.state as any)?.usr) || null;
    if (usr?.trainer && usr?.reviews) return usr as LocationState;

    try {
      const raw = sessionStorage.getItem('reviewConfirmState');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.trainer && parsed?.reviews) return parsed as LocationState;
      }
    } catch {}
    return null;
  };

  const state = getLocationState();

  // 取得できた state はリロード対策として保存
  useEffect(() => {
    if (state) {
      sessionStorage.setItem('reviewConfirmState', JSON.stringify(state));
    }
  }, [state]);

  if (!state || !state.trainer || !state.reviews) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">
          データが見つかりません
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

  const { trainer, reviews } = state;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getRatingLabel = (rating: number) => {
    const labels: Record<number, string> = {
      1: '不満',
      2: 'やや不満',
      3: '普通',
      4: '満足',
      5: '大変満足'
    };
    return labels[rating] || '';
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const reviewsToInsert = reviews.map(review => ({
        trainee_id: user?.id,
        trainer_id: trainer.id,
        lesson_id: review.lesson.id,
        rating: review.rating,
        comment: review.comment || null
      }));

      const { error: insertError } = await supabase
        .from('reviews')
        .insert(reviewsToInsert);

      if (insertError) throw insertError;

      navigate('/review-success');
    } catch (error: any) {
      console.error('Error submitting reviews:', error);
      if (error?.code === '23505') {
        setError('このレッスンは既にレビュー済みです。');
      } else {
        setError('レビューの投稿に失敗しました。もう一度お試しください。');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (!trainer) {
      navigate('/review-selection');
      return;
    }
    navigate(`/review-trainer/${trainer.id}`, { 
      state: { trainer, reviews } 
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={handleBack}
          className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
        >
          <ArrowLeft size={20} />
          <span>修正する</span>
        </button>
        <h1 className="text-2xl font-bold text-default-text">レビュー確認</h1>
      </div>

      {/* Trainer Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-4">
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
            <p className="text-secondary">投稿するレビュー: {reviews.length}件</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Reviews Confirmation */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.lesson.id} className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-default-text mb-2">
                {review.lesson.title}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-secondary">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>
                    {format(new Date(review.lesson.date), 'M月d日(E)', { locale: ja })}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{review.lesson.time} ({review.lesson.duration}分)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin size={14} />
                  <span>{review.lesson.location}</span>
                </div>
              </div>
            </div>

            {/* Rating Display */}
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-default-text">評価:</span>
                <div className="flex items-center space-x-1">
                  {renderStars(review.rating)}
                </div>
                <span className="text-sm text-secondary">
                  ({getRatingLabel(review.rating)})
                </span>
              </div>
            </div>

            {/* Comment Display */}
            {review.comment && (
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-sm font-medium text-default-text mb-1">コメント:</p>
                <p className="text-secondary text-sm leading-relaxed">
                  {review.comment}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleBack}
          className="flex-1 px-4 py-2 border border-secondary/30 text-secondary rounded-md hover:bg-secondary/10 transition-colors"
        >
          修正する
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '投稿中...' : '投稿する'}
        </button>
      </div>
    </div>
  );
};
