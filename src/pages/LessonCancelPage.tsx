import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lesson, User } from '../types';
import { ArrowLeft, Calendar, Clock, MapPin, Users, AlertTriangle } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const PAID_STATUSES = ['paid', 'succeeded', 'completed', 'paid_out'] as const;

export const LessonCancelPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lessonId && user?.role === 'trainer') {
      fetchLessonAndParticipants();
    }
  }, [lessonId, user]);

  const fetchLessonAndParticipants = async () => {
    try {
      // Lesson（自分のレッスンのみ）
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .eq('trainer_id', user?.id)
        .single();
      if (lessonError) throw lessonError;
      setLesson(lessonData as Lesson);

      // Participants（confirmed/reserved 両方を対象にプレビュー表示）
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          client:users!bookings_client_id_fkey(id, name, email, avatar_url)
        `)
        .eq('lesson_id', lessonId)
        .in('status', ['confirmed', 'reserved'])
        .not('client_id', 'is', null);
      if (bookingsError) throw bookingsError;

      const participantsList =
        (bookingsData as any[])?.map((b) => b.client).filter(Boolean) ?? [];
      setParticipants(participantsList);
    } catch (e) {
      console.error('Error fetching lesson data:', e);
      setError('レッスン情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 該当レッスンの confirmed / reserved 予約を一括キャンセルし、
   * 影響を受けた client_id の配列を返す（重複除去済み）
   */
  async function cancelBookingsForLesson(
    lessonId: string,
    role: 'trainer' | 'client',
    byUserId: string
  ): Promise<string[]> {
    const basePatch = {
      cancelled_by_role: role,
      cancelled_by_user_id: byUserId,
      cancelled_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('bookings')
      .update({ ...basePatch, status: 'cancelled' })
      .eq('lesson_id', lessonId)
      .in('status', ['confirmed', 'reserved'] as any)
      .select('client_id'); // 影響ユーザーを取得

    if (error) throw error;
    const ids = (data ?? []).map((r: any) => r.client_id).filter(Boolean);
    return Array.from(new Set(ids));
  }

  const handleCancelLesson = async () => {
    if (!lesson || !lessonId || !user) return;

    const reason = prompt('キャンセル理由を入力してください（参加者への通知に使用されます）:');
    if (!reason || !reason.trim()) return;

    if (
      !confirm(
        '本当にレッスンをキャンセルしますか？\n\n・参加者全員に全額返金されます\n・この操作は取り消せません'
      )
    ) {
      return;
    }

    setCancelling(true);
    setError('');

    try {
      // 1) lessons をキャンセル
      const { error: updateLessonError } = await supabase
        .from('lessons')
        .update({ status: 'cancelled' })
        .eq('id', lessonId);
      if (updateLessonError) throw updateLessonError;

      // 2) bookings を一括キャンセルし、影響ユーザーを取得
      const affectedClientIds = await cancelBookingsForLesson(lessonId, 'trainer', user.id);

      // 3) 支払済み payments を基準に refunds を作成（多様な成功ステータス対応）
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('lesson_id', lessonId)
        .in('status', [...PAID_STATUSES] as any);
      if (paymentsError) throw paymentsError;

      const refundRequests =
        (payments ?? []).map((payment: any) => ({
          lesson_id: lessonId,
          trainee_id: payment.trainee_id,
          payment_id: payment.id,
          refund_amount: payment.net_amount ?? payment.amount, // net_amount が無い場合は amount を使用
          refund_reason: `トレーナー都合によるキャンセル: ${reason.trim()}`,
          refund_status: 'pending',
        }));

      if (refundRequests.length > 0) {
        const { error: refundError } = await supabase.from('refunds').insert(refundRequests);
        if (refundError) throw refundError;
      }

      // 4) 参加者に通知（直近5分以内の同一レッスン・同種通知がある場合は重複回避）
      if (affectedClientIds.length > 0) {
        const fiveMinAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from('notifications')
          .select('user_id')
          .eq('type', 'lesson_cancelled')
          .filter('data->>lesson_id', 'eq', lessonId as string)
          .in('user_id', affectedClientIds)
          .gte('created_at', fiveMinAgoIso);

        const already = new Set((existing ?? []).map((n: any) => n.user_id));
        const notifPayloads = affectedClientIds
          .filter((uid) => !already.has(uid))
          .map((uid) => ({
            user_id: uid,
            type: 'lesson_cancelled',
            title: 'レッスンキャンセル',
            message: `${lesson.title}（${format(new Date(lesson.date), 'M月d日', { locale: ja })} ${lesson.time}）がトレーナー都合によりキャンセルされました。管理者承認後、返金が処理されます。`,
            data: {
              lesson_id: lessonId,
              lesson_title: lesson.title,
              lesson_date: lesson.date,
              lesson_time: lesson.time,
              cancelled_by: 'trainer',
              reason: reason.trim(),
            },
          }));

        if (notifPayloads.length > 0) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifPayloads);
          if (notificationError) console.error('Error creating notifications:', notificationError);
        }
      }

      // 5) 完了
      if ((payments ?? []).length > 0) {
        alert('レッスンをキャンセルしました。返金申請を作成しました。管理者承認をお待ちください。');
      } else {
        alert('レッスンをキャンセルしました（返金対象の決済は見つかりませんでした）。');
      }
      navigate('/bookings');
      return;
    } catch (e: any) {
      console.error('Error cancelling lesson:', e);
      const msg =
        e?.code === '42501'
          ? '返金申請の作成が許可されていません（RLS）。管理者にご連絡ください。'
          : e?.message || 'キャンセル処理に失敗しました。';
      setError(`キャンセル処理に失敗しました: ${msg}`);
    } finally {
      setCancelling(false);
    }
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
        <button
          onClick={() => navigate('/bookings')}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          予約管理に戻る
        </button>
      </div>
    );
  }

  if (user?.id !== lesson.trainer_id) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">アクセス拒否</h1>
        <p className="text-secondary mb-4">このレッスンをキャンセルする権限がありません。</p>
        <button
          onClick={() => navigate('/bookings')}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          予約管理に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        to="/bookings"
        className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
      >
        <ArrowLeft size={20} />
        <span>予約管理に戻る</span>
      </Link>

      {/* Lesson Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-6">レッスンキャンセル確認</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Lesson Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-default-text mb-4">キャンセル対象レッスン</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-default-text mb-3">{lesson.title}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>{format(new Date(lesson.date), 'yyyy年M月d日(E)', { locale: ja })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock size={16} />
                <span>{lesson.time} ({lesson.duration}分)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users size={16} />
                <span>最大{lesson.max_participants}名</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin size={16} />
                <span>{lesson.location}</span>
              </div>
            </div>

            {lesson.location && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-secondary">
                  <strong>開催場所:</strong> {lesson.location}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Participants List */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-default-text mb-4">
            参加者一覧 ({participants.length}名)
          </h2>

          {participants.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Users className="w-8 h-8 text-secondary mx-auto mb-2" />
              <p className="text-secondary">参加者はいません</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {participant.avatar_url ? (
                        <img
                          src={participant.avatar_url}
                          alt={participant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-default-text">{participant.name}</p>
                      <p className="text-sm text-secondary">{participant.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Warning Notice */}
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-2">キャンセル時の注意事項</p>
              <ul className="space-y-1">
                <li>• 当日キャンセルが複数回あった場合、当社はアカウント停止・資格停止処分を行うことがあります。</li>
                <li>• トレーナー都合によるキャンセルが発生した場合、トレーニーに全額返金され、報酬は発生しません。</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Link
            to="/bookings"
            className="flex-1 px-4 py-2 border border-secondary/30 text-secondary rounded-md hover:bg-secondary/10 transition-colors text-center"
          >
            戻る
          </Link>
          <button
            onClick={handleCancelLesson}
            disabled={cancelling}
            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? 'キャンセル処理中...' : 'キャンセル確定'}
          </button>
        </div>
      </div>
    </div>
  );
};
