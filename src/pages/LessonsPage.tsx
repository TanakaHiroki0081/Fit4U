import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lesson } from '../types';
import { Calendar, Clock, Users, MapPin, Star, Search } from 'lucide-react';
import { User } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// start_at を扱う拡張
type LessonWithStartAt = Lesson & {
  start_at?: string | null;
  trainer?: { name?: string; specialties?: string; avatar_url?: string | null };
};

export const LessonsPage: React.FC = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LessonWithStartAt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDate, setCustomDate] = useState('');
  const [trainerRatings, setTrainerRatings] = useState<Record<string, { rating: number; count: number }>>({});

  useEffect(() => {
    fetchLessons();
    fetchTrainerRatings();
  }, []);

  const fetchLessons = async () => {
    try {
      const nowIso = new Date().toISOString();

      // ★ DB段階で過去を除外：start_at >= now()
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          trainer:users!lessons_trainer_id_fkey(name, specialties, avatar_url)
        `)
        .eq('status', 'scheduled')
        .gte('start_at', nowIso)
        .order('start_at', { ascending: true });

      if (error) throw error;

      // 端末時計ズレ等への保険
      const safe = (data ?? []).filter((l: any) => {
        const start = l.start_at ? new Date(l.start_at) : new Date(`${l.date}T${(l.time || '00:00')}:00`);
        return start.getTime() >= Date.now();
      });

      setLessons(safe as LessonWithStartAt[]);
    } catch (e) {
      console.error('Error fetching lessons:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerRatings = async () => {
    try {
      const { data, error } = await supabase.from('reviews').select('trainer_id, rating');
      if (error) throw error;

      const ratings: Record<string, { rating: number; count: number }> = {};
      (data ?? []).forEach((r: any) => {
        if (!ratings[r.trainer_id]) ratings[r.trainer_id] = { rating: 0, count: 0 };
        ratings[r.trainer_id].rating += r.rating;
        ratings[r.trainer_id].count += 1;
      });
      Object.keys(ratings).forEach((id) => (ratings[id].rating = ratings[id].rating / ratings[id].count));
      setTrainerRatings(ratings);
    } catch (e) {
      console.error('Error fetching trainer ratings:', e);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      yoga: 'ヨガ系', pilates: 'ピラティス系', stretch: 'ストレッチ系', strength: '筋トレ系',
      dance: 'ダンス系', boxing: 'ボクシング系', hiit: 'HIIT系', other: 'その他'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      yoga: 'bg-purple-100 text-purple-800', pilates: 'bg-green-100 text-green-800',
      stretch: 'bg-blue-100 text-blue-800', strength: 'bg-red-100 text-red-800',
      dance: 'bg-pink-100 text-pink-800', boxing: 'bg-orange-100 text-orange-800',
      hiit: 'bg-yellow-100 text-yellow-800', other: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const renderStars = (rating: number) => (
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ))
  );

  // 検索/カテゴリ/日付フィルタ（start_at 基準）
  const filteredLessons = lessons.filter((lesson) => {
    const q = searchQuery.toLowerCase();
    const title = (lesson.title ?? '').toLowerCase();
    const trainerName = (lesson.trainer?.name ?? '').toLowerCase();
    const description = (lesson.description ?? '').toLowerCase();
    const location = (lesson.location ?? '').toLowerCase();

    const matchesSearch = title.includes(q) || trainerName.includes(q) || description.includes(q) || location.includes(q);
    const matchesCategory = categoryFilter === 'all' || lesson.category === categoryFilter;

    const start = lesson.start_at
      ? new Date(lesson.start_at)
      : new Date(`${lesson.date}T${(lesson.time || '00:00')}:00`);

    let matchesDate = true;
    if (dateFilter === 'today') {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const to = new Date(from); to.setDate(from.getDate() + 1);
      matchesDate = start >= from && start < to;
    } else if (dateFilter === 'week') {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const to = new Date(from); to.setDate(from.getDate() + 7);
      matchesDate = start >= from && start <= to;
    } else if (dateFilter === 'custom' && customDate) {
      const from = new Date(`${customDate}T00:00:00`);
      const to = new Date(`${customDate}T23:59:59`);
      matchesDate = start >= from && start <= to;
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-default-text mb-4">レッスン一覧</h1>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-gray" size={20} />
            <input
              type="text"
              placeholder="レッスン名、トレーナー名、場所で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="block text-sm font-medium text-default-text mb-1">カテゴリ</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
              >
                <option value="all">すべて</option>
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
              <label className="block text-sm font-medium text-default-text mb-1">開催日</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
              >
                <option value="all">すべての日程</option>
                <option value="today">今日</option>
                <option value="week">今週</option>
                <option value="custom">任意の日付</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-default-text mb-1">日付選択</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lessons Grid */}
      {filteredLessons.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-light-gray mx-auto mb-4" />
          <p className="text-light-gray">
            {searchQuery || categoryFilter !== 'all' || dateFilter !== 'all'
              ? '検索条件に一致するレッスンが見つかりません'
              : '現在開催予定のレッスンはありません'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredLessons.map((lesson) => {
            const trainerRating = trainerRatings[lesson.trainer_id];
            return (
              <div key={lesson.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary/30 transition-all duration-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-default-text">{lesson.title}</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        {lesson.trainer?.avatar_url ? (
                          <img src={lesson.trainer.avatar_url} alt={lesson.trainer.name} className="w-full h-full object-cover" />
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
                        {trainerRating && trainerRating.count > 0 && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-light-gray">{trainerRating.rating.toFixed(1)} ({trainerRating.count}件)</span>
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
                    <div className="flex items-center space-x-1"><Users size={14} /><span>最大{lesson.max_participants}名</span></div>
                    <span className="font-medium text-default-text">¥{lesson.price.toLocaleString()}</span>
                  </div>
                  <Link to={`/lessons/${lesson.id}`} className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md font-medium">
                    詳細・予約
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
