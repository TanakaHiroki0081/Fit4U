import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Review } from '../types';
import { Star, Calendar, ArrowLeft } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const TrainerReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchTrainerReviews();
    }
  }, [user]);

  const fetchTrainerReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          lesson:lessons(title, date, time),
          client:users!reviews_trainee_id_fkey(name)
        `)
        .eq('trainer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReviews(data || []);
      setTotalReviews(data?.length || 0);
      
      if (data && data.length > 0) {
        const avgRating = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(avgRating);
      }
    } catch (error) {
      console.error('Error fetching trainer reviews:', error);
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
        <h1 className="text-2xl font-bold text-default-text">受け取ったレビュー</h1>
      </div>

      {/* Rating Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Star className="w-8 h-8 text-yellow-400 fill-current" />
            <span className="text-3xl font-bold text-default-text">
              {totalReviews > 0 ? averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="text-xl text-secondary">/ 5.0</span>
          </div>
          <p className="text-secondary">
            総レビュー件数: {totalReviews}件
          </p>
          {totalReviews > 0 && (
            <div className="flex items-center justify-center space-x-1 mt-2">
              {renderStars(Math.round(averageRating))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Star className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-default-text mb-2">
            まだレビューがありません
          </h2>
          <p className="text-secondary mb-4">
            レッスンを提供すると、参加者からレビューが投稿されます。
          </p>
          <Link
            to="/create-lesson"
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90"
          >
            レッスンを作成
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-secondary text-sm">
              新着順に表示しています
            </p>
          </div>

          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-default-text">
                        {review.trainee?.name || 'ユーザー'}
                      </h3>
                      <p className="text-sm text-secondary">
                        {review.lesson?.title}
                      </p>
                    </div>
                    <span className="text-sm text-secondary">
                      {format(new Date(review.created_at), 'M月d日', { locale: ja })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-secondary mb-3">
                    <div className="flex items-center space-x-1">
                      <Calendar size={12} />
                      <span>
                        {review.lesson && format(new Date(review.lesson.date), 'M月d日(E)', { locale: ja })}
                      </span>
                    </div>
                    <span>{review.lesson?.time}</span>
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