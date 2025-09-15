import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Lesson } from '../types';
import { Star, ArrowLeft } from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [trainer, setTrainer] = useState<User | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lessonId) {
      fetchLessonData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const fetchLessonData = async () => {
    try {
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select(`
          *,
          trainer:users!lessons_trainer_id_fkey(*)
        `)
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);
      setTrainer(lessonData.trainer);
    } catch (error) {
      console.error('Error fetching lesson data:', error);
      setError('レッスン情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('評価を選択してください。');
      return;
    }

    if (!comment.trim()) {
      setError('コメントを入力してください。');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // TODO: reviewsテーブルへ保存する実装に置き換え予定
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('レビューを投稿しました！');
      navigate('/bookings');
    } catch (error) {
      setError('レビューの投稿に失敗しました。');
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-8 h-8 cursor-pointer transition-colors ${
          i < currentRating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-200'
        }`}
        onClick={interactive ? () => setRating(i + 1) : undefined}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson || !trainer) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">レッスンが見つかりません</h1>
        <button
          onClick={() => navigate('/bookings')}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          予約履歴に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/bookings')}
        className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
      >
        <ArrowLeft size={20} />
        <span>予約履歴に戻る</span>
      </button>

      {/* Review Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-6">レッスンの評価</h1>

        {/* Lesson Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-default-text mb-2">{lesson.title}</h3>
          <p className="text-secondary">講師: {trainer.name}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-default-text mb-3">
              評価 *
            </label>
            <div className="flex items-center space-x-1">
              {renderStars(rating, true)}
            </div>
            <p className="text-sm text-secondary mt-2">
              {rating === 0 && '評価を選択してください'}
              {rating === 1 && '不満'}
              {rating === 2 && 'やや不満'}
              {rating === 3 && '普通'}
              {rating === 4 && '満足'}
              {rating === 5 && '大変満足'}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-default-text mb-1">
              コメント *
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder="レッスンの感想をお聞かせください..."
              className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            <p className="text-sm text-secondary mt-1">
              {comment.length}/500文字
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="flex-1 px-4 py-2 border border-secondary/30 text-secondary rounded-md hover:bg-secondary/10 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0 || !comment.trim()}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '投稿中...' : 'レビューを投稿'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
