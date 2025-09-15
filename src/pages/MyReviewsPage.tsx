import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Review } from '../types';
import { Star, Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const MyReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'client') {
      fetchMyReviews();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchMyReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          lesson:lessons(
            *,
            trainer:users!lessons_trainer_id_fkey(name, avatar_url)
          )
        `)
        .eq('trainee_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching my reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getRatingLabel = (rating: number) => {
    const labels = {
      1: '不満',
      2: 'やや不満',
      3: '普通',
      4: '満足',
      5: '大変満足'
    };
    return labels[rating as keyof typeof labels] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/mypage"
          className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
        >
          <ArrowLeft size={20} />
          <span>マイページに戻る</span>
        </Link>
        <h1 className="text-2xl font-bold text-default-text">投稿レビュー一覧</h1>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Star className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-default-text mb-2">
            投稿したレビューがありません
          </h2>
          <p className="text-secondary mb-4">
            レッスンを受講後、トレーナーにレビューを投稿してみましょう。
          </p>
          <Link
            to="/review-selection"
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90"
          >
            レビューを書く
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-secondary text-sm">
              投稿済みのレビュー: {reviews.length}件
            </p>
            <p className="text-xs text-secondary mt-1">
              ※ 投稿後のレビューは編集・削除できません
            </p>
          </div>

          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6"
            >
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  {review.lesson?.trainer?.avatar_url ? (
                    <img
                      src={review.lesson.trainer.avatar_url}
                      alt={review.lesson.trainer.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-default-text">
                      {review.lesson?.title}
                    </h3>
                    <span className="text-sm text-secondary">
                      {format(new Date(review.created_at), 'M月d日', { locale: ja })}
                    </span>
                  </div>
                  
                  <p className="text-secondary text-sm mb-2">
                    トレーナー: {review.lesson?.trainer?.name}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-secondary mb-3">
                    <div className="flex items-center space-x-1">
                      <Calendar size={12} />
                      <span>
                        {review.lesson && format(new Date(review.lesson.date), 'M月d日(E)', { locale: ja })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={12} />
                      <span>{review.lesson?.time}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin size={12} />
                      <span>{review.lesson?.location}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex items-center space-x-1">
                      {renderStars(review.rating)}
                    </div>
                    <span className="text-sm text-secondary">
                      ({getRatingLabel(review.rating)})
                    </span>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-secondary text-sm leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
