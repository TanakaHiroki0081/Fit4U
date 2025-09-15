import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lesson } from '../types';
import { Calendar, Clock, Users, MapPin, Star, User } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// start_at を扱う拡張
type LessonWithStartAt = Lesson & {
  start_at?: string | null;
  trainer?: { id?: string; name?: string; specialties?: string; avatar_url?: string | null };
};

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [idvStatus, setIdvStatus] = useState<'pending' | 'approved' | 'rejected' | 'not_submitted'>('not_submitted');
  const [upcomingLessons, setUpcomingLessons] = useState<LessonWithStartAt[]>([]);
  const [trainerRatings, setTrainerRatings] = useState<Record<string, { rating: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(Date.now()); // 現在時刻（描画用）

  useEffect(() => {
    fetchUpcomingLessons();
    fetchTrainerRatings();
  }, []);

  useEffect(() => {
    const fetchIdv = async () => {
      if (user?.role !== 'trainer') return;
      try {
        const { data, error } = await supabase
          .from('identity_verifications')
          .select('status')
          .eq('trainer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        const status = data && data[0]?.status ? data[0].status : null;
        setIdvStatus((status as any) || 'not_submitted');
      } catch (e) {
        console.warn('Failed to fetch identity verification status', e);
        setIdvStatus('not_submitted');
      }
    };
    fetchIdv();
  }, [user?.id, user?.role]);

  // 30秒ごとに現在時刻を更新／2分ごとに再フェッチ
  useEffect(() => {
    const tick = setInterval(() => setNowTick(Date.now()), 30_000);
    const refresh = setInterval(() => { fetchUpcomingLessons(); }, 120_000);
    return () => { clearInterval(tick); clearInterval(refresh); };
  }, []);

  const parseStart = (l: { start_at?: string | null; date?: string; time?: string }) =>
    l.start_at ? new Date(l.start_at) : new Date(`${l.date}T${(l.time || '00:00')}:00`);

  const fetchUpcomingLessons = async () => {
    try {
      const nowIso = new Date().toISOString();

      // DB段階で「開始済み除外」：start_at >= now()
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          trainer:users!lessons_trainer_id_fkey(id, name, specialties, avatar_url)
        `)
        .eq('status', 'scheduled')
        .gte('start_at', nowIso)
        .order('start_at', { ascending: true })
        .limit(12); // 余裕を持って取得

      if (error) throw error;

      // 端末時計ズレへの保険
      const safe = (data ?? []).filter((l: any) => parseStart(l).getTime() >= Date.now());
      setUpcomingLessons(safe as LessonWithStartAt[]);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerRatings = async () => {
    try {
      const { data, error } = await supabase.from('reviews').select('trainer_id, rating');
      if (error) throw error;

      const ratings: Record<string, { rating: number; count: number }> = {};
      (data ?? []).forEach((review: any) => {
        if (!ratings[review.trainer_id]) ratings[review.trainer_id] = { rating: 0, count: 0 };
        ratings[review.trainer_id].rating += review.rating;
        ratings[review.trainer_id].count += 1;
      });
      Object.keys(ratings).forEach((id) => {
        ratings[id].rating = ratings[id].rating / ratings[id].count;
      });

      setTrainerRatings(ratings);
    } catch (error) {
      console.error('HomePage: Error fetching trainer ratings:', error);
    }
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

  const getCategoryColor = (category: string) => {
    const colors = {
      yoga: 'bg-purple-100 text-purple-800',
      pilates: 'bg-green-100 text-green-800',
      stretch: 'bg-blue-100 text-blue-800',
      strength: 'bg-red-100 text-red-800',
      dance: 'bg-pink-100 text-pink-800',
      boxing: 'bg-orange-100 text-orange-800',
      hiit: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 描画時に“いま”で再フィルタ＆並び替え＆最大6件
  const visibleLessons = [...upcomingLessons]
    .filter((l) => parseStart(l).getTime() >= nowTick)
    .sort((a, b) => parseStart(a).getTime() - parseStart(b).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
        <h1 className="text-2xl font-bold text-default-text mb-2">
          こんにちは、{user?.name}さん！
        </h1>
        <p className="text-light-gray">
          {user?.role === 'trainer'
            ? '今日も素晴らしいレッスンを提供しましょう。'
            : '今日も健康的な一日を過ごしましょう。'}
        </p>
      </div>

      {/* Trainer Identity Verification Notices */}
      {user?.role === 'trainer' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {idvStatus === 'not_submitted' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800 font-medium">身分証を提出してください。</p>
              <p className="text-xs text-yellow-700 mt-1">提出可能な身分証の種類は案内に従ってください。提出後、確認には平均2営業日かかります。</p>
              <div className="mt-2">
                <Link to="/identity-verification" className="text-primary underline text-sm">本人確認を提出する</Link>
              </div>
            </div>
          )}
          {idvStatus === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800 font-medium">管理者が確認中です（平均2営業日）。</p>
              <p className="text-xs text-blue-700 mt-1">承認完了までレッスンの新規掲載はできません。</p>
            </div>
          )}
          {idvStatus === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800 font-medium">本人確認が却下されました。再提出してください。</p>
              <div className="mt-2">
                <Link to="/identity-verification" className="text-red-600 underline text-sm">再提出する</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className={`grid gap-6 ${user?.role === 'client' ? 'grid-cols-2' : 'grid-cols-2'} mb-8`}>
        <Link to="/lessons" className="bg-primary text-white p-6 rounded-lg text-center hover:bg-primary/90 transition-all duration-300 shadow-md hover:shadow-lg">
          <Calendar className="w-8 h-8 mx-auto mb-3" />
          <span className="text-base font-semibold">レッスンを探す</span>
        </Link>

        {user?.role === 'trainer' && idvStatus === 'approved' && (
          <Link to="/create-lesson" className="bg-white border-2 border-primary text-primary p-6 rounded-lg text-center hover:bg-primary hover:text-white transition-all duration-300 shadow-md hover:shadow-lg">
            <Users className="w-8 h-8 mx-auto mb-3" />
            <span className="text-base font-semibold">レッスン作成</span>
          </Link>
        )}

        <Link to="/bookings" className="bg-white border-2 border-secondary text-secondary p-6 rounded-lg text-center hover:bg-secondary hover:text-white transition-all duration-300 shadow-md hover:shadow-lg">
          <Calendar className="w-8 h-8 mx-auto mb-3" />
          <span className="text-base font-semibold">予約管理</span>
        </Link>

        <Link to="/profile" className="bg-white border-2 border-secondary text-secondary p-6 rounded-lg text-center hover:bg-secondary hover:text-white transition-all duration-300 shadow-md hover:shadow-lg">
          <Users className="w-8 h-8 mx-auto mb-3" />
          <span className="text-base font-semibold">プロフィール</span>
        </Link>

        {user?.role === 'client' && (
          <Link to="/bookings?filter=completed" className="bg-white border-2 border-primary text-primary p-6 rounded-lg text-center hover:bg-primary hover:text-white transition-all duration-300 shadow-md hover:shadow-lg">
            <Star className="w-8 h-8 mx-auto mb-3" />
            <span className="text-base font-semibold">レビューを残す</span>
          </Link>
        )}
      </div>

      {/* Upcoming Lessons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-default-text">近日開催のレッスン</h2>
          <Link to="/lessons" className="text-primary hover:text-primary/80 text-sm font-medium">
            すべて見る
          </Link>
        </div>

        {visibleLessons.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-light-gray mx-auto mb-4" />
            <p className="text-light-gray">近日開催のレッスンはありません</p>
            <Link to="/review-selection" className="text-primary hover:text-primary/80 text-sm font-medium mt-2 inline-block underline">
              <span className="text-sm font-medium">レビューを書く</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleLessons.map((lesson) => (
              <div key={lesson.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-primary/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-default-text">{lesson.title}</h3>
                    <div className="flex items-center space-x-2">
                      {/* Trainer Avatar */}
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        {lesson.trainer?.avatar_url ? (
                          <img src={lesson.trainer.avatar_url} alt={lesson.trainer?.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Link to={`/trainer/${lesson.trainer_id}`} className="text-sm text-light-gray hover:text-primary">
                          {lesson.trainer?.name}
                        </Link>
                        {trainerRatings[lesson.trainer_id] && trainerRatings[lesson.trainer_id].count > 0 && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-light-gray">
                              {trainerRatings[lesson.trainer_id].rating.toFixed(1)} ({trainerRatings[lesson.trainer_id].count}件)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(lesson.category)}`}>
                    {getCategoryLabel(lesson.category)}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-sm text-light-gray mb-3">
                  <div className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>{format(new Date(lesson.date), 'M月d日(E)', { locale: ja })}</span>
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-light-gray">
                    <div className="flex items-center space-x-1">
                      <Users size={14} />
                      <span>最大{lesson.max_participants}名</span>
                    </div>
                    <span className="font-medium text-default-text">¥{lesson.price.toLocaleString()}</span>
                  </div>
                  <Link to={`/lessons/${lesson.id}`} className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md font-medium">
                    詳細・予約
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
