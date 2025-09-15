import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lesson, User } from '../types';
import { Star, Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TrainerWithLessons {
  trainer: User;
  lessons: Lesson[];
}

export const ReviewSelectionPage: React.FC = () => {
  const { user } = useAuth();
  const [trainersWithLessons, setTrainersWithLessons] = useState<TrainerWithLessons[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'client') {
      fetchUnreviewedTrainers();
    } else {
      // クライアント以外は対象外なのでローディングを終了
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUnreviewedTrainers = async () => {
    try {
      // レビュー未投稿の「完了」レッスン
      const { data: completedBookings, error } = await supabase
        .from('bookings')
        .select(`
          lesson:lessons!inner(
            *,
            trainer:users!lessons_trainer_id_fkey(*)
          )
        `)
        .eq('client_id', user!.id)
        .eq('status', 'completed')
        .not('lesson_id', 'in', `(
          SELECT lesson_id FROM reviews WHERE trainee_id = '${user!.id}'
        )`);

      if (error) throw error;

      // トレーナー単位でグルーピング
      const trainerMap = new Map<string, TrainerWithLessons>();

      completedBookings?.forEach((booking: any) => {
        const lesson = booking.lesson as Lesson | undefined;
        const trainer = lesson?.trainer as User | undefined;
        if (!lesson || !trainer) return;

        if (!trainerMap.has(trainer.id)) {
          trainerMap.set(trainer.id, { trainer, lessons: [] });
        }
        trainerMap.get(trainer.id)!.lessons.push(lesson);
      });

      setTrainersWithLessons(Array.from(trainerMap.values()));
    } catch (error) {
      console.error('Error fetching unreviewed trainers:', error);
    } finally {
      setLoading(false);
    }
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
          to="/"
          className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
        >
          <ArrowLeft size={20} />
          <span>ホームに戻る</span>
        </Link>
        <h1 className="text-2xl font-bold text-default-text">レビューを残す</h1>
      </div>

      {trainersWithLessons.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Star className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-default-text mb-2">
            レビュー対象のレッスンがありません
          </h2>
          <p className="text-secondary mb-4">
            完了したレッスンがある場合、こちらにレビュー対象のトレーナーが表示されます。
          </p>
          <Link
            to="/lessons"
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90"
          >
            レッスンを探す
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-secondary text-sm">
              完了したレッスンのトレーナーにレビューを投稿できます。
            </p>
          </div>

          {trainersWithLessons.map(({ trainer, lessons }) => (
            <div
              key={trainer.id}
              className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6"
            >
              <div className="flex items-start space-x-4 mb-4">
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

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-default-text mb-1">
                    {trainer.name}
                  </h3>
                  {trainer.specialties && trainer.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {trainer.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-secondary">
                    未レビューのレッスン: {lessons.length}件
                  </p>
                </div>
              </div>

              {/* Recent lessons preview */}
              <div className="space-y-2 mb-4">
                {lessons.slice(0, 2).map((lesson) => (
                  <div key={lesson.id} className="bg-gray-50 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-default-text text-sm">
                          {lesson.title}
                        </h4>
                        <div className="flex items-center space-x-4 text-xs text-secondary">
                          <div className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>
                              {format(new Date(lesson.date), 'M月d日(E)', { locale: ja })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{lesson.time}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin size={12} />
                            <span>{lesson.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {lessons.length > 2 && (
                  <p className="text-xs text-secondary text-center">
                    他 {lessons.length - 2} 件のレッスン
                  </p>
                )}
              </div>

              <Link
                to={`/review-trainer/${trainer.id}`}
                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors text-center block"
              >
                このトレーナーをレビューする
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
