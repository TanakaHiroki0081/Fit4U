import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PaymentStatus } from '../components/PaymentStatus';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import { buildCancelMessage } from '../utils/cancelDisplay';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// 安全な価格フォーマッタ（数値以外ならダッシュ表示）※「¥」は呼び出し側で付与
const formatYen = (v?: number | null) =>
  typeof v === 'number' ? v.toLocaleString() : '—';

export const BookingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trainerLessons, setTrainerLessons] = useState<Lesson[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [lessonParticipants, setLessonParticipants] = useState<Record<string, User[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [hasNewCancellations, setHasNewCancellations] = useState(false);

  // JST helpers (avoid client local TZ differences)
  const nowJst = () => {
    const now = new Date();
    // Convert to UTC milliseconds and add 9 hours for JST
    return new Date(now.getTime() + 9 * 60 * 60 * 1000);
  };

  const jstStartOfDay = (d: Date) => {
    const j = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    j.setUTCHours(0, 0, 0, 0);
    // return as actual Date in JST by subtracting the added offset so comparisons stay consistent
    return new Date(j.getTime() - 9 * 60 * 60 * 1000);
  };

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchTrainerData();
    } else {
      fetchBookings();
    }
  }, [user]);

  // 戻ってきた時に再取得
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (user?.role === 'trainer') {
          fetchTrainerData();
        } else {
          fetchBookings();
        }
      }
    };
    const handlePageShow = () => {
      if (user?.role === 'trainer') {
        fetchTrainerData();
      } else {
        fetchBookings();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [user]);

  useEffect(() => {
    if (user?.role === 'client') {
      checkForNewCancellations();
    }
  }, [user]);

  useEffect(() => {
    if (filter === 'cancelled' && hasNewCancellations) {
      markCancellationsAsViewed();
    }
  }, [filter, hasNewCancellations]);

  const checkForNewCancellations = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          lesson:lessons(*)
        `)
        .eq('client_id', user?.id)
        .in('status', ['cancelled', 'canceled']); // 値は両綴り対応

      if (error) throw error;

      const viewed = JSON.parse(localStorage.getItem('viewedCancellations') || '[]');
      const news = data?.filter(b => !viewed.includes(b.id)) ?? [];
      setHasNewCancellations(news.length > 0);
    } catch (error) {
      console.error('Error checking for new cancellations:', error);
    }
  };

  const markCancellationsAsViewed = () => {
    const cancelledBookings = bookings.filter(b => isCancelled(b.status));
    const viewed = cancelledBookings.map(b => b.id);
    localStorage.setItem('viewedCancellations', JSON.stringify(viewed));
    setHasNewCancellations(false);
  };

  // レッスン開始日時（date+time から生成）
  const getLessonStart = (lesson: Lesson) => {
    if (!lesson?.date || !lesson?.time) return null as any;
    const d = new Date(`${lesson.date}T${lesson.time}:00`);
    if (isNaN(d.getTime())) return null as any;
    // Treat lesson date/time as JST
    const j = new Date(d.getTime() - d.getTimezoneOffset() * 60000); // normalize
    return new Date(j.getTime());
  };

  // キャンセル判定
  const isCancelled = (status: string) =>
    status === 'cancelled' || status === 'canceled';

  const fetchTrainerData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('trainer_id', user.id)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (lessonsError) throw lessonsError;
      setTrainerLessons(lessonsData || []);

      const lessonIds = lessonsData?.map(l => l.id) || [];
      if (lessonIds.length > 0) {
        const { data: confirmed, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            lesson_id,
            client:users(id, name, email, avatar_url)
          `)
          .in('lesson_id', lessonIds)
          .eq('status', 'confirmed');

        if (bookingsError) throw bookingsError;

        const counts: Record<string, number> = {};
        const participantsData: Record<string, User[]> = {};
        confirmed?.forEach(b => {
          counts[b.lesson_id] = (counts[b.lesson_id] || 0) + 1;
          if (!participantsData[b.lesson_id]) participantsData[b.lesson_id] = [];
          if (b.client) participantsData[b.lesson_id].push(b.client);
        });
        setBookingCounts(counts);
        setLessonParticipants(participantsData);
      }
    } catch (error) {
      console.error('Error fetching trainer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // 存在する列だけを SELECT（cancelled_* 列は取らない）
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, lesson_id, client_id, trainer_id, status, payment_status, created_at,
          lesson:lessons(
            id, title, date, time, duration, category, price, max_participants, location, trainer_id
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const raw = data ?? [];

      // trainer プロフィールをまとめ取得
      const trainerIds = Array.from(
        new Set(raw.map(b => b.lesson?.trainer_id).filter((v): v is string => !!v))
      );
      let trainerMap: Record<string, { id: string; name: string; avatar_url: string | null; specialties?: string[] }> = {};
      if (trainerIds.length > 0) {
        const { data: trainers, error: uErr } = await supabase
          .from('users')
          .select('id, name, avatar_url, specialties')
          .in('id', trainerIds);
        if (!uErr && trainers) {
          trainerMap = Object.fromEntries(trainers.map(t => [t.id, t]));
        } else {
          console.warn('users fetch failed:', uErr);
        }
      }

      // 支払い実績で payment_status を補正（後方互換）
      const lessonIds = Array.from(new Set(raw.map(b => b.lesson_id).filter((v): v is string => !!v)));
      type PayRow = { lesson_id: string; trainee_id: string; status: string; created_at: string };
      let payMap: Record<string, PayRow> = {};
      if (lessonIds.length > 0) {
        const { data: pays, error: pErr } = await supabase
          .from('payments')
          .select('lesson_id, trainee_id, status, created_at')
          .eq('trainee_id', user.id)
          .in('lesson_id', lessonIds)
          .order('created_at', { ascending: false });

        if (!pErr && pays) {
          for (const row of pays as PayRow[]) {
            const key = `${row.lesson_id}:${row.trainee_id}`;
            if (!payMap[key]) payMap[key] = row; // 先頭が最新
          }
        } else {
          console.warn('payments fetch failed:', pErr);
        }
      }

      const enriched = raw.map(b => {
        const trainer = b.lesson?.trainer_id ? trainerMap[b.lesson.trainer_id] : undefined;
        const key = `${b.lesson_id}:${user.id}`;
        const paidStatus = payMap[key]?.status; // 'paid' など
        return {
          ...b,
          lesson: b.lesson ? { ...b.lesson, trainer } : null,
          payment_status: paidStatus ?? b.payment_status,
        };
      });

      setBookings(enriched);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !booking.lesson) return;

    // キャンセル期限チェック
    const lessonDateTime = new Date(`${booking.lesson.date}T${booking.lesson.time}`);
    const dayBefore = new Date(lessonDateTime);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(23, 59, 59, 999);
    const now = new Date();
    const isRefundable = now <= dayBefore;

    const reason = prompt('キャンセル理由を入力してください:');
    if (!reason || !reason.trim()) return;

    const confirmMessage = isRefundable
      ? `予約をキャンセルしますか？\n\nキャンセルポリシー:\n・前日23:59まで: 決済手数料控除後の金額を返金\n・当日0:00以降: 返金不可\n\n※ このキャンセルは返金対象です`
      : `予約をキャンセルしますか？\n\nキャンセルポリシー:\n・前日23:59まで: 決済手数料控除後の金額を返金\n・当日0:00以降: 返金不可\n\n※ このキャンセルは返金対象外です`;

    if (!confirm(confirmMessage)) return;

    try {
      // DB の列構成に合わせて status のみ更新
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      // 返金リクエスト（期限内のみ）
      if (isRefundable) {
const { data: payment, error: paymentError } = await supabase
  .from('payments')
  .select('*')
  .eq('lesson_id', booking.lesson.id)
  .eq('trainee_id', user!.id)
  .eq('status', 'paid')
  .order('paid_at', { ascending: false })
  .limit(1)
  .maybeSingle();

        if (paymentError || !payment) {
          console.warn('Payment not found for refund:', paymentError);
        } else {
          const { error: refundError } = await supabase
            .from('refunds')
            .insert({
              lesson_id: booking.lesson.id,
              trainee_id: user!.id,
              payment_id: payment.id,
              refund_amount: payment.net_amount, // Stripe手数料控除後の金額
              refund_reason: `参加者都合によるキャンセル（期限内）: ${reason.trim()}`,
              refund_status: 'pending'
            });
          if (refundError) console.error('Error creating refund request:', refundError);
        }
      }

      // 講師へ通知
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.lesson.trainer_id,
          type: 'booking_cancelled_by_trainee',
          title: '参加者キャンセル',
          message: `${booking.lesson.title}（${format(new Date(booking.lesson.date), 'M月d日', { locale: ja })} ${booking.lesson.time}）の参加者がキャンセルしました。`,
          data: {
            lesson_id: booking.lesson.id,
            lesson_title: booking.lesson.title,
            lesson_date: booking.lesson.date,
            lesson_time: booking.lesson.time,
            cancelled_by: 'trainee',
            is_refundable: isRefundable,
            reason: reason.trim(),
            trainee_name: user!.name
          }
        });

      await fetchBookings();
      alert(
        isRefundable
          ? '予約をキャンセルしました。\n\n決済手数料控除後の金額が返金されます。管理者による承認をお待ちください。'
          : '予約をキャンセルしました。\n\nキャンセル期限を過ぎているため返金はありません。'
      );
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('キャンセルに失敗しました。');
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

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      confirmed: '確定',
      cancelled: 'キャンセル',
      completed: '完了'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels = {
      pending: '未払い',
      paid: '支払い済み',
      refunded: '返金済み'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getBookingStatus = (lesson: Lesson) => {
    const bookingCount = bookingCounts[lesson.id] || 0;
    const maxParticipants = lesson.max_participants;
    if (bookingCount === 0) {
      return { status: 'no-bookings', label: '予約なし', color: 'bg-gray-100 text-gray-800' };
    } else if (bookingCount >= maxParticipants) {
      return { status: 'full', label: '満席', color: 'bg-red-100 text-red-800' };
    } else {
      return { status: 'available', label: '予約受付中', color: 'bg-green-100 text-green-800' };
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (!booking.lesson) return false;
    const lessonStart = getLessonStart(booking.lesson);
    if (!lessonStart) return false;

    const today = jstStartOfDay(nowJst());

    const paid = booking.payment_status === 'paid';
    const cancelled = isCancelled(booking.status);

    switch (filter) {
      case 'upcoming': {
        const BOOK_OK = booking.status === 'confirmed' || booking.status === 'reserved' || paid;
        return !cancelled && BOOK_OK && lessonStart >= today;
      }
      case 'past':
        return booking.status === 'completed' || lessonStart < today;
      case 'cancelled':
        return cancelled;
      default:
        return true;
    }
  });

  const filteredTrainerLessons = trainerLessons.filter(lesson => {
    const lessonDate = new Date(`${lesson.date}T00:00:00`);
    const today = jstStartOfDay(nowJst());

    switch (filter) {
      case 'upcoming':
        return lesson.status === 'scheduled' && lessonDate >= today;
      case 'past':
        return lesson.status === 'completed' || lessonDate < today;
      case 'cancelled':
        return lesson.status === 'cancelled' || lesson.status === 'canceled';
      default:
        return true;
    }
  }).sort((a, b) => {
    // Upcoming ascending, others descending by date/time
    const aStart = getLessonStart(a as any);
    const bStart = getLessonStart(b as any);
    if (filter === 'upcoming') return (aStart?.getTime() ?? 0) - (bStart?.getTime() ?? 0);
    return (bStart?.getTime() ?? 0) - (aStart?.getTime() ?? 0);
  });

  const sortedFilteredBookings = [...filteredBookings].sort((a, b) => {
    const aStart = a.lesson ? getLessonStart(a.lesson) : null;
    const bStart = b.lesson ? getLessonStart(b.lesson) : null;
    if (filter === 'upcoming') return (aStart?.getTime() ?? 0) - (bStart?.getTime() ?? 0);
    return (bStart?.getTime() ?? 0) - (aStart?.getTime() ?? 0);
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-default-text mb-4">
          {user?.role === 'trainer' ? 'レッスン予約管理' : '予約履歴'}
        </h1>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'upcoming', label: '今後の予約' },
            { key: 'past', label: '過去の予約' },
            { key: 'cancelled', label: hasNewCancellations ? 'キャンセル ●' : 'キャンセル' },
            { key: 'all', label: 'すべて' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-primary shadow-sm'
                  : `text-light-gray hover:text-default-text ${
                      tab.key === 'cancelled' && hasNewCancellations ? 'text-red-600' : ''
                    }`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trainer Lessons List */}
      {user?.role === 'trainer' ? (
        filteredTrainerLessons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="w-12 h-12 text-light-gray mx-auto mb-4" />
            <p className="text-light-gray">
              {filter === 'upcoming' ? '今後のレッスンはありません' :
               filter === 'past' ? '過去のレッスンはありません' :
               filter === 'cancelled' ? 'キャンセルしたレッスンはありません' :
               'レッスンはありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrainerLessons.map((lesson) => {
              const bookingCount = bookingCounts[lesson.id] || 0;
              const bookingStatus = getBookingStatus(lesson);

              return (
                <div
                  key={lesson.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/30"
                  onClick={() => navigate(`/lesson-participants/${lesson.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-default-text mb-1">
                        {lesson.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(lesson.category)}`}>
                          {getCategoryLabel(lesson.category)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${bookingStatus.color}`}>
                          {bookingStatus.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">¥{formatYen(lesson.price)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-light-gray">
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} />
                      <span>{format(new Date(lesson.date), 'M月d日(E)', { locale: ja })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={16} />
                      <span>{lesson.time} ({lesson.duration}分)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users size={16} />
                      <span>最大{lesson.max_participants}名 / {bookingCount}人予約済み</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin size={16} />
                      <span>{lesson.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-light-gray">
                      予約状況: {bookingCount}/{lesson.max_participants}名
                      {bookingCount > 0 && (
                        <span className="ml-2 text-primary">
                          売上見込み: {
                            typeof lesson.price === 'number'
                              ? `¥${(lesson.price * bookingCount).toLocaleString()}`
                              : '—'
                          }
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        to={`/lessons/${lesson.id}`}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        詳細を見る
                      </Link>
                      {lesson.status === 'scheduled' && (
                        <Link
                          to={`/lesson-cancel/${lesson.id}`}
                          className="border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-500 hover:text-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          キャンセル
                        </Link>
                      )}
                      {lesson.status === 'cancelled' && (
                        <span className="bg-gray-400 text-white px-4 py-2 rounded-md text-sm cursor-not-allowed">
                          キャンセル済み
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Participants Preview */}
                  {lessonParticipants[lesson.id] && lessonParticipants[lesson.id].length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-medium text-blue-800 mb-2">参加者 ({lessonParticipants[lesson.id].length}名)</p>
                      <div className="flex flex-wrap gap-2">
                        {lessonParticipants[lesson.id].slice(0, 3).map((participant) => (
                          <div key={participant.id} className="flex items-center space-x-2 bg-white rounded-full px-3 py-1">
                            <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                              {participant.avatar_url ? (
                                <img src={participant.avatar_url} alt={participant.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                  <UserIcon className="w-2 h-2 text-primary" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-blue-700">{participant.name}</span>
                          </div>
                        ))}
                        {lessonParticipants[lesson.id].length > 3 && (
                          <span className="text-xs text-blue-600">+{lessonParticipants[lesson.id].length - 3}名</span>
                        )}
                      </div>
                    </div>
                  )}

                  {lesson.location && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-light-gray">
                        <strong>場所:</strong> {lesson.location}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Client Bookings List */
        sortedFilteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="w-12 h-12 text-light-gray mx-auto mb-4" />
            <p className="text-light-gray">
              {filter === 'upcoming' ? '今後の予約はありません' :
               filter === 'past' ? '過去の予約はありません' :
               filter === 'cancelled' ? 'キャンセルした予約はありません' :
               '予約はありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedFilteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-primary/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-default-text mb-1">
                      {booking.lesson?.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {booking.lesson?.trainer && (
                        <>
                          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                            {booking.lesson.trainer.avatar_url ? (
                              <img
                                src={booking.lesson.trainer.avatar_url}
                                alt={booking.lesson.trainer.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-primary" />
                              </div>
                            )}
                          </div>
                          <Link
                            to={`/trainer/${booking.lesson.trainer_id}`}
                            className="text-light-gray hover:text-primary"
                          >
                            講師: {booking.lesson.trainer.name}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(booking.lesson?.category || '')}`}>
                      {getCategoryLabel(booking.lesson?.category || '')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-light-gray">
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} />
                    <span>
                      {booking.lesson && format(new Date(booking.lesson.date), 'M月d日(E)', { locale: ja })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock size={16} />
                    <span>{booking.lesson?.time} ({booking.lesson?.duration}分)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users size={16} />
                    <span>最大{booking.lesson?.max_participants}名</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} />
                    <span>{booking.lesson?.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-bold text-default-text">
                      ¥{formatYen(booking.lesson?.price)}
                    </span>
                    {typeof booking.lesson?.price === 'number' && (
                      <PaymentStatus
                        status={booking.payment_status as any}
                        amount={booking.lesson!.price}
                      />
                    )}
                  </div>

                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-500 hover:text-white transition-colors"
                    >
                      キャンセル
                    </button>
                  )}

                  {booking.status === 'completed' && (
                    <div className="flex space-x-2">
                      <Link
                        to={`/review/${booking.lesson?.id}`}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
                      >
                        レビューを書く
                      </Link>
                    </div>
                  )}
                </div>

                {/* Cancellation Notice for Cancelled Bookings */}
                {booking.status === 'cancelled' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm font-medium">
                      {buildCancelMessage(booking)}
                    </p>
                    {process.env.NODE_ENV !== 'production' && (
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        DEBUG byUser={String((booking as any)?.cancelled_by_user_id || 'null')}
                        client={String(booking?.client_id || 'null')}
                        trainer={String(booking?.trainer_id || 'null')}
                        role={String((booking as any)?.cancelled_by_role || 'null')}
                        cancelled_at={String((booking as any)?.cancelled_at || 'null')}
                      </div>
                    )}
                    <div className="mt-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.payment_status === 'paid'
                            ? 'bg-yellow-100 text-yellow-800'
                            : booking.payment_status === 'refunded'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {booking.payment_status === 'paid'
                          ? '返金承認待ち'
                          : booking.payment_status === 'refunded'
                          ? '返金完了'
                          : '未払い'}
                      </span>
                    </div>
                  </div>
                )}

                {booking.lesson?.location && booking.status === 'confirmed' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-light-gray">
                      <strong>開催場所:</strong> {booking.lesson.location}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
