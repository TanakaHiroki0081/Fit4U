import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useStripePayment } from '../hooks/useStripePayment';
import { PaymentStatus } from '../components/PaymentStatus';
import { recoverPendingPayment } from '../api/stripe-utils';
import { StripeTestCards } from '../components/StripeTestCards';
import { Lesson, Booking, User } from '../types';
import { Calendar, Clock, Users, MapPin, Star, Mail, BadgeAlert } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const PAID_STATUSES = ['paid', 'succeeded', 'completed', 'paid_out'] as const;

// DBの start_at を取り扱うためのローカル拡張
type LessonWithStart = Lesson & {
  start_at?: string | null;
  trainer?: { name?: string; specialties?: string; bio?: string; avatar_url?: string | null };
};

export const LessonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonWithStart | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [participants, setParticipants] = useState<Array<{ client_id: string; status: string; user: User | null }>>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [trainerRating, setTrainerRating] = useState<{ rating: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingPayment, setPendingPayment] = useState<any>(null);

  const [cancelSuccess, setCancelSuccess] = useState('');

  const { processPayment, loading: paymentLoading, error: paymentError, clearError } = useStripePayment({
    onSuccess: (sessionId) => console.log('Payment initiated successfully:', sessionId),
    onError: (err) => setError(err)
  });

  useEffect(() => {
    if (!id) return;
    fetchLessonDetails();
    if (user) {
      checkExistingBooking();
      if (user.role === 'trainer') fetchParticipants();
    }
    checkPendingPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  useEffect(() => {
    if (lesson?.trainer_id) fetchTrainerRating(lesson.trainer_id);
  }, [lesson?.trainer_id]);

  const checkPendingPayment = async () => {
    try {
      const recovery = await recoverPendingPayment();
      if (recovery) {
        setPendingPayment(recovery);
        if (recovery.success) {
          await checkExistingBooking();
        }
      }
    } catch (error) {
      console.error('Error checking pending payment:', error);
    }
  };

  const fetchLessonDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          trainer:users!lessons_trainer_id_fkey(name, specialties, bio, avatar_url)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
      setLesson(data as LessonWithStart);
    } catch (e) {
      console.error('Error fetching lesson:', e);
      setError('レッスン情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('lesson_id', id)
        .eq('client_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setBooking(data as Booking | null);
    } catch (e) {
      console.error('Error checking booking:', e);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          client_id,
          status,
          client:users!bookings_client_id_fkey(id, name, email, avatar_url, bio, created_at)
        `)
        .eq('lesson_id', id)
        .in('status', ['confirmed', 'cancelled']);

      if (bookingsError) throw bookingsError;

      const rows = (bookingsData ?? []).map((b: any) => ({
        client_id: b.client_id,
        status: b.status,
        user: b.client ?? (b.client_id ? ({ id: b.client_id, name: '非公開ユーザー' } as unknown as User) : null),
      }));

      setParticipants(rows);
      setBookingCount(rows.filter(r => r.status === 'confirmed').length);
    } catch (e) {
      console.error('Error fetching participants:', e);
    }
  };

  const fetchTrainerRating = async (trainerId: string) => {
    try {
      const { data, error } = await supabase.from('reviews').select('rating').eq('trainer_id', trainerId);
      if (error) throw error;

      if (data?.length) {
        const avg = data.reduce((s: number, r: any) => s + r.rating, 0) / data.length;
        setTrainerRating({ rating: avg, count: data.length });
      } else {
        setTrainerRating(null);
      }
    } catch (e) {
      console.error('Error fetching trainer rating:', e);
    }
  };

  // === 受付終了判定（DBの start_at を優先。無ければ date+time から作る） ===
  const startAt = lesson?.start_at
    ? new Date(lesson.start_at)
    : lesson
      ? new Date(`${lesson.date}T${lesson.time || '00:00'}:00`)
      : null;
  const isStarted = startAt ? startAt.getTime() <= Date.now() : false;

  const handleBooking = async (useStripe = true) => {
    if (!user || !lesson) return;

    // 受付終了ガード（UIバイパス対策）
    if (isStarted || lesson.status === 'cancelled') {
      setError('申し訳ありません。開始時間を過ぎたため、予約はできません。');
      return;
    }

    try {
      const { data: current } = await supabase
        .from('bookings')
        .select('id')
        .eq('lesson_id', lesson.id)
        .eq('status', 'confirmed');

      if ((current?.length ?? 0) >= lesson.max_participants) {
        setError('このレッスンは満席です。他のレッスンをお探しください。');
        return;
      }
    } catch (e) {
      console.error('Error checking lesson capacity:', e);
    }

    setBookingLoading(true);
    setError('');
    clearError();

    try {
      if (useStripe) {
        await processPayment(lesson.id, user.id);
      } else {
        const { error } = await supabase.from('bookings').insert([{
          lesson_id: lesson.id,
          client_id: user.id,
          status: 'confirmed',
          payment_status: lesson.price > 0 ? 'pending' : 'paid',
          updated_at: new Date().toISOString(),   // ★ NOT NULL 制約対応
        }]);
        if (error) throw error;

        await checkExistingBooking();
        alert('予約が完了しました！');
      }
    } catch (e: any) {
      if (e.code === '23505') {
        setError('すでにこのレッスンを予約済みです。');
      } else if (e.message?.includes('満席')) {
        setError('このレッスンは満席です。他のレッスンをお探しください。');
      } else if (e.message?.includes('キャンセル')) {
        setError('このレッスンはキャンセルされています。');
      } else {
        setError(e.message || '予約に失敗しました。もう一度お試しください。');
      }
      console.error('Error creating booking:', e);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !lesson || !user) return;

    const lessonDateTime = lesson.start_at
      ? new Date(lesson.start_at)
      : new Date(`${lesson.date}T${lesson.time || '00:00'}:00`);

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

    setBookingLoading(true);
    setError('');
    clearError();

    try {
      const { error: updateBookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_by_role: 'client',
          cancelled_by_user_id: user.id,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
      if (updateBookingError) throw updateBookingError;

      if (isRefundable) {
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('lesson_id', lesson.id)
          .eq('trainee_id', user.id)
          .in('status', [...PAID_STATUSES] as any)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (payment) {
          await supabase.from('refunds').insert({
            lesson_id: lesson.id,
            trainee_id: user.id,
            payment_id: (payment as any).id,
            refund_amount: (payment as any).net_amount ?? (payment as any).amount,
            refund_reason: `参加者都合によるキャンセル（期限内）: ${reason.trim()}`,
            refund_status: 'pending'
          });
        }
      }

      await supabase.from('notifications').insert({
        user_id: lesson.trainer_id,
        type: 'booking_cancelled_by_trainee',
        title: '参加者キャンセル',
        message: `${lesson.title}（${format(new Date(lesson.date), 'M月d日', { locale: ja })} ${lesson.time}）の参加者がキャンセルしました。`,
        data: {
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          lesson_date: lesson.date,
          lesson_time: lesson.time,
          cancelled_by: 'trainee',
          is_refundable: isRefundable,
          reason: reason.trim(),
          trainee_name: user.name
        }
      });

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'booking_cancelled',
        title: 'レッスンキャンセル',
        message: isRefundable
          ? `${lesson.title}（${format(new Date(lesson.date), 'M月d日', { locale: ja })} ${lesson.time}）をキャンセルしました。決済手数料控除後の金額が返金されます。`
          : `${lesson.title}（${format(new Date(lesson.date), 'M月d日', { locale: ja })} ${lesson.time}）をキャンセルしました。キャンセル期限を過ぎているため返金はありません。`,
        data: {
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          lesson_date: lesson.date,
          lesson_time: lesson.time,
          cancelled_by: 'client',
          is_refundable: isRefundable,
          reason: reason.trim()
        }
      });

      setBooking(null);
      await fetchLessonDetails();
      if (user.role === 'trainer') await fetchParticipants();

      alert(isRefundable
        ? '予約をキャンセルしました。\n\n決済手数料控除後の金額が返金されます。管理者による承認をお待ちください。'
        : '予約をキャンセルしました。\n\nキャンセル期限を過ぎているため返金はありません。');
    } catch (e) {
      setError('キャンセルに失敗しました。もう一度お試しください。');
      console.error('Error cancelling booking:', e);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleTrainerCancel = async () => {
    if (!lesson || !user) return;

    const reason = prompt('キャンセル理由を入力してください（参加者への通知に使用されます）:');
    if (!reason || !reason.trim()) return;
    if (!confirm('本当にレッスンをキャンセルしますか？\n\n・参加者全員に全額返金されます\n・この操作は取り消せません')) return;

    setBookingLoading(true);
    setError('');
    setCancelSuccess('');

    try {
      const nowIso = new Date().toISOString();

      const { error: updateLessonError } = await supabase
        .from('lessons')
        .update({ status: 'cancelled' })
        .eq('id', lesson.id);
      if (updateLessonError) throw updateLessonError;

      const { data: affected, error: updateBookingsError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_by_role: 'trainer',
          cancelled_by_user_id: user.id,
          cancelled_at: nowIso,
        })
        .eq('lesson_id', lesson.id)
        .in('status', ['confirmed', 'reserved'] as any)
        .select('client_id');
      if (updateBookingsError) throw updateBookingsError;

      const clientIds = Array.from(new Set((affected ?? []).map(b => (b as any).client_id).filter(Boolean)));

      if (clientIds.length) {
        const fiveMinAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from('notifications')
          .select('user_id')
          .eq('type', 'lesson_cancelled')
          .filter('data->>lesson_id', 'eq', lesson.id)
          .in('user_id', clientIds)
          .gte('created_at', fiveMinAgoIso);

        const already = new Set((existing ?? []).map((n: any) => n.user_id));
        const payloads = clientIds
          .filter(cid => !already.has(cid))
          .map((cid) => ({
            user_id: cid,
            type: 'lesson_cancelled',
            title: 'レッスンキャンセル',
            message: `${lesson.title}（${format(new Date(lesson.date), 'M月d日', { locale: ja })} ${lesson.time}）がトレーナー都合によりキャンセルされました。管理者承認後、返金が処理されます。`,
            data: {
              lesson_id: lesson.id,
              lesson_title: lesson.title,
              lesson_date: lesson.date,
              lesson_time: lesson.time,
              cancelled_by: 'trainer',
              reason: reason.trim(),
            },
          }));

        if (payloads.length) {
          const { error: notificationError } = await supabase.from('notifications').insert(payloads);
          if (notificationError) console.error('Error creating notifications:', notificationError);
        }
      }

      const { data: payments, error: paymentsErr } = await supabase
        .from('payments')
        .select('*')
        .eq('lesson_id', lesson.id)
        .in('status', [...PAID_STATUSES] as any);
      if (paymentsErr) throw paymentsErr;

      if (payments?.length) {
        const refundRequests = (payments as any[]).map((p) => ({
          lesson_id: lesson.id,
          trainee_id: p.trainee_id,
          payment_id: p.id,
          refund_amount: p.net_amount ?? p.amount,
          refund_reason: `トレーナー都合によるキャンセル: ${reason.trim()}`,
          refund_status: 'pending',
        }));
        const { error: refundErr } = await supabase.from('refunds').insert(refundRequests);
        if (refundErr) throw refundErr;
      }

      setCancelSuccess('レッスンのキャンセルが完了しました。返金リクエストを作成済みです（管理者承認後に反映）。');
      await fetchLessonDetails();
      await fetchParticipants();
    } catch (e: any) {
      const msg =
        e?.code === 'PGRST204' || e?.code === '42703'
          ? 'キャンセル処理に必要な列が見つかりませんでした。管理者に連絡してください。'
          : 'キャンセル処理に失敗しました。時間をおいて再度お試しください。';
      console.error('Trainer cancel failed:', e);
      setError(msg);
    } finally {
      setBookingLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">レッスンが見つかりません</h1>
        <button onClick={() => navigate('/lessons')} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90">
          レッスン一覧に戻る
        </button>
      </div>
    );
  }

  const isOwner = user?.id === lesson.trainer_id;
  const canBook = user?.role === 'client' && !isOwner && !booking && !isStarted && lesson.status !== 'cancelled';
  const isBooked = !!booking && (booking.status === 'confirmed' || booking.status === 'reserved');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Lesson Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-default-text mb-2">{lesson.title}</h1>
            <div className="flex items-center space-x-4 text-light-gray mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {lesson.trainer?.avatar_url ? (
                    <img src={lesson.trainer.avatar_url} alt={lesson.trainer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span>講師: {lesson.trainer?.name}</span>
                  {trainerRating && trainerRating.count > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm">{trainerRating.rating.toFixed(1)} ({trainerRating.count}件)</span>
                    </div>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(lesson.category)}`}>
                {getCategoryLabel(lesson.category)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">¥{lesson.price.toLocaleString()}</div>
            <div className="text-sm text-light-gray">1回あたり</div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4"><p className="text-red-600 text-sm">{error}</p></div>}
        {paymentError && <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4"><p className="text-red-600 text-sm">{paymentError}</p></div>}
        {cancelSuccess && <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4"><p className="text-green-600 text-sm">{cancelSuccess}</p></div>}
        {pendingPayment && <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4"><p className="text-blue-600 text-sm">{pendingPayment.message}</p></div>}

        {/* Lesson Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-light-gray">
          <div className="flex items-center space-x-2"><Calendar size={16} /><span>{format(new Date(lesson.date), 'M月d日(E)', { locale: ja })}</span></div>
          <div className="flex items-center space-x-2"><Clock size={16} /><span>{lesson.time} ({lesson.duration}分)</span></div>
          <div className="flex items-center space-x-2"><Users size={16} /><span>最大{lesson.max_participants}名</span></div>
          <div className="flex items-center space-x-2"><MapPin size={16} /><span>{lesson.location}</span></div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-4">
          {/* 受付終了バナー */}
          {(isStarted || lesson.status === 'cancelled') && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 font-medium">このレッスンの受付は終了しました。</p>
            </div>
          )}

          {canBook && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <StripeTestCards />
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-800">レッスン料金</span>
                <span className="text-2xl font-bold text-blue-800">¥{lesson.price.toLocaleString()}</span>
              </div>
              <p className="text-sm text-blue-600 mb-4">{lesson.price > 0 ? 'クレジットカード決済（Stripe）' : '無料レッスン'}</p>

              {lesson.price > 0 ? (
                <button
                  onClick={() => handleBooking()}
                  disabled={bookingLoading || paymentLoading}
                  className="w-full bg-primary text-white py-4 px-6 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-sm"
                >
                  {paymentLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>決済画面に移動中...</span>
                    </div>
                  ) : (
                    `予約・決済する（¥${lesson.price.toLocaleString()}）`
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleBooking(false)}
                  disabled={bookingLoading || paymentLoading}
                  className="w-full bg-primary text-white py-4 px-6 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-sm"
                >
                  {paymentLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>決済画面に移動中...</span>
                    </div>
                  ) : (
                    `予約・決済する（¥${lesson.price.toLocaleString()}）`
                  )}
                </button>
              )}

              <div className="mt-3 text-center">
                <p className="text-xs text-light-gray">
                  {lesson.price > 0 ? (
                    <>
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      SSL暗号化通信でカード情報を安全に処理
                    </>
                  ) : (
                    '無料でご参加いただけます'
                  )}
                </p>
              </div>
            </div>
          )}

          {isBooked && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium mb-3">✓ 予約済み</p>
              {booking?.payment_status && (
                <div className="mb-3">
                  <PaymentStatus status={booking.payment_status as any} amount={lesson.price} />
                </div>
              )}
              {booking?.payment_status && (
                <div className="mb-3">
                  <PaymentStatus status={booking.payment_status as any} amount={lesson.price} />
                </div>
              )}
              <button
                onClick={handleCancelBooking}
                disabled={bookingLoading}
                className="w-full border border-red-500 text-red-500 py-3 px-6 rounded-lg hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {bookingLoading ? 'キャンセル中...' : '予約をキャンセル'}
              </button>
            </div>
          )}

          {isOwner && (
            <>
              {lesson.status === 'cancelled' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-3">このレッスンはキャンセル済みです</p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-800 font-medium mb-3">あなたのレッスンです</p>
                  <button
                    onClick={handleTrainerCancel}
                    disabled={bookingLoading}
                    className="w-full border border-red-500 text-red-500 py-2 px-4 rounded-lg hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bookingLoading ? 'キャンセル処理中...' : 'レッスンをキャンセル'}
                  </button>
                </div>
              )}
            </>
          )}

          <button onClick={() => navigate('/lessons')} className="w-full px-6 py-3 border border-gray-300 text-secondary rounded-lg hover:bg-gray-50 transition-colors">
            一覧に戻る
          </button>
        </div>
      </div>

      {/* Lesson Description */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-default-text mb-4">レッスン詳細</h2>
        <p className="text-light-gray leading-relaxed whitespace-pre-wrap">{lesson.description}</p>
      </div>

      {/* Location/Meeting Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-default-text mb-4">開催場所</h2>
        <div className="flex items-start space-x-3">
          <MapPin className="text-primary mt-1" size={20} />
          <div>
            <p className="text-default-text font-medium">対面レッスン</p>
            <p className="text-light-gray">{lesson.location}</p>
          </div>
        </div>
      </div>

      {/* Participants List (Trainer Only) */}
      {isOwner && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-default-text">参加者一覧 ({participants.filter(p => p.status === 'confirmed').length}名)</h2>
            <div className="text-sm text-light-gray">予約状況: {bookingCount}/{lesson.max_participants}名</div>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-light-gray mx-auto mb-4" />
              <p className="text-light-gray">まだ参加者はいません</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {participants.map((p) => {
                const u = p.user;
                return (
                  <div key={`${p.client_id}-${p.status}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-primary/30">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        {u?.avatar_url ? (
                          <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-default-text">{u?.name ?? '非公開ユーザー'}</h3>
                            {p.status === 'cancelled' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                <BadgeAlert className="w-3 h-3 mr-1" />取消済
                              </span>
                            )}
                          </div>
                          {u?.created_at && (
                            <span className="text-sm text-light-gray">登録日: {format(new Date(u.created_at), 'yyyy年M月', { locale: ja })}</span>
                          )}
                        </div>
                        {u?.email && (
                          <div className="flex items-center space-x-2 text-sm text-light-gray mb-2">
                            <Mail size={14} />
                            <span>{u.email}</span>
                          </div>
                        )}
                        {u?.bio && <p className="text-light-gray text-sm line-clamp-2">{u.bio}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};