import { supabase } from '../lib/supabase';

interface CancelLessonRequest {
  lessonId: string;
  traineeId: string;
  reason: string;
  cancelledBy: 'trainer' | 'trainee';
}

export const cancelLesson = async ({ lessonId, traineeId, reason, cancelledBy }: CancelLessonRequest) => {
  try {
    const actorRole: 'trainer' | 'client' = cancelledBy === 'trainer' ? 'trainer' : 'client';

    // Get lesson details to check cancellation policy
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*, trainer:users!lessons_trainer_id_fkey(name)')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      throw new Error('Lesson not found');
    }

    // ★ lesson を取得した「後」で参照する
    const cancelledByUserId = actorRole === 'trainer' ? lesson.trainer_id : traineeId;

    // Get payment details
 const { data: payment, error: paymentError } = await supabase
  .from('payments')
  .select('*')
  .eq('lesson_id', lessonId)
  .eq('trainee_id', traineeId)
  .eq('status', 'paid')
  .order('paid_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (paymentError) {
  console.warn('Payment search warning:', paymentError);
}
// payment が null（無料/未計上）の場合は返金作成をスキップし、キャンセル処理自体は続行

    // Check cancellation policy
    const lessonDateTime = new Date(`${lesson.date}T${lesson.time}`);
    const now = new Date();
    const dayBefore = new Date(lessonDateTime);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(23, 59, 59, 999);

    let isRefundable = false;
    let refundAmount = 0;

    if (cancelledBy === 'trainer') {
      // Trainer cancellation: full refund if before lesson start
      if (now < lessonDateTime) {
        isRefundable = true;
        refundAmount = payment.net_amount;
      }
    } else {
      // Trainee cancellation: full refund if before day before 23:59
      if (now <= dayBefore) {
        isRefundable = true;
        refundAmount = payment.net_amount;
      }
    }

    // Update lesson status to cancelled
    const { error: updateLessonError } = await supabase
      .from('lessons')
      .update({ status: 'cancelled' })
      .eq('id', lessonId);

    if (updateLessonError) {
      throw new Error('Failed to update lesson status');
    }

    // Update booking status to cancelled
    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_by_role: actorRole,
        cancelled_by_user_id: cancelledByUserId,
        cancelled_at: new Date().toISOString(),
      })
      .eq('lesson_id', lessonId)
      .eq('client_id', traineeId);

    if (updateBookingError) {
      throw new Error('Failed to update booking status');
    }

    const actorText = actorRole === 'trainer' ? 'トレーナー都合' : '参加者都合';

    // Create notification for cancellation
    const { data: lessonForNotification } = await supabase
      .from('lessons')
      .select('title, date, time, trainer:users!lessons_trainer_id_fkey(name)')
      .eq('id', lessonId)
      .single();

    if (lessonForNotification) {
      await supabase
        .from('notifications')
        .insert({
          user_id: traineeId,
          type: 'lesson_cancelled',
          title: 'レッスンキャンセル',
          message: `${lessonForNotification.title}（${lessonForNotification.date} ${lessonForNotification.time}）が${actorText}によりキャンセルされました。${
            actorRole === 'trainer'
              ? '決済手数料控除後の金額が10営業日後を目処に返金されます。'
              : isRefundable
                ? '決済手数料控除後の金額が返金されます。'
                : 'キャンセル期限を過ぎているため返金はありません。'
          }`,
          data: { 
            lesson_id: lessonId, 
            lesson_title: lessonForNotification.title,
            lesson_date: lessonForNotification.date,
            lesson_time: lessonForNotification.time,
            cancelled_by: actorRole,
            trainer_name: lessonForNotification.trainer?.name
          }
        });
    }

    // Create refund request if refundable
    if (isRefundable && refundAmount > 0) {
      const { error: refundError } = await supabase
        .from('refunds')
        .insert({
          lesson_id: lessonId,
          trainee_id: traineeId,
          payment_id: payment.id,
          refund_amount: refundAmount,
          refund_reason: reason,
          refund_status: 'pending'
        });

      if (refundError) {
        throw new Error('Failed to create refund request');
      }
    }

    return {
      success: true,
      isRefundable,
      refundAmount,
      message: isRefundable 
        ? '返金対象のキャンセルです。管理者による承認後に返金処理が行われます。'
        : 'キャンセルポリシーにより返金対象外です。'
    };

  } catch (error) {
    console.error('Error cancelling lesson:', error);
    throw error;
  }
};
