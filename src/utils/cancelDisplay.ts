export type Actor = 'trainer' | 'client' | 'unknown';

const S = (v: any) => (v === null || v === undefined ? null : String(v));

export function resolveActor(booking: any): Actor {
  const byUserId = S(booking?.cancelled_by_user_id ?? booking?.canceled_by_user_id);
  const clientId = S(booking?.client_id ?? booking?.trainee_id ?? booking?.participant_id);
  const trainerId = S(booking?.trainer_id ?? booking?.instructor_id);
  const byRole: string | null =
    booking?.cancelled_by_role ??
    booking?.canceled_by_role ??
    booking?.cancelled_by_user?.role ??
    booking?.canceled_by_user?.role ??
    null;

  if (byUserId && clientId && byUserId === clientId) return 'client';
  if (byUserId && trainerId && byUserId === trainerId) return 'trainer';
  if (byRole === 'client' || byRole === 'trainer') return byRole as Actor;
  return 'unknown';
}

export function cancelDisplayDate(booking: any): Date | null {
  const raw =
    booking?.cancelled_at ??
    booking?.canceled_at ??
    booking?.updated_at ??
    booking?.created_at ??
    null;
  return raw ? new Date(raw) : null;
}

export function formatMonthDay(d: Date | null) {
  if (!d) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function deadlineOf(lessonStart: Date | null): Date | null {
  if (!lessonStart) return null;
  const d = new Date(lessonStart);
  d.setHours(0, 0, 0, 0);     // 当日00:00:00
  d.setSeconds(d.getSeconds() - 1); // 前日23:59:59
  return d;
}

export function lessonStartFrom(booking: any): Date | null {
  // lessons 連携がある場合（推奨）
const start =
  (booking?.lesson?.date && booking?.lesson?.time
    ? `${booking.lesson.date}T${booking.lesson.time}`
    : null) ??
  booking?.lesson_start_at ??
  booking?.starts_at ??
  booking?.start_time ??
  null;
  return start ? new Date(start) : null;
}

export function buildCancelMessage(booking: any): string {
  const actor = resolveActor(booking);
  const when = formatMonthDay(cancelDisplayDate(booking));
  const isNoShow =
    !!(booking?.no_show === true ||
       booking?.is_no_show === true ||
       booking?.status === 'no_show');

  if (actor === 'trainer') {
    return `${when}にトレーナー都合によりキャンセルされました。管理者による承認後、決済手数料控除後の金額が返金されます`;
  }

  if (actor === 'client') {
    let refundable = true;
    if (isNoShow) {
      refundable = false;
    } else {
      const start = lessonStartFrom(booking);
      const deadline = deadlineOf(start);
      const cancelledAt = cancelDisplayDate(booking);
      if (cancelledAt && deadline) {
        refundable = cancelledAt.getTime() <= deadline.getTime();
      }
    }
    return refundable
      ? `${when}に参加者都合によりキャンセルされました。管理者による承認後、決済手数料控除後の金額が返金されます`
      : `${when}に参加者都合によりキャンセルされました。レッスン前日の23時59分59秒以降のキャンセル、または無断欠席のため、返金は行われません`;
  }

  return `${when}にキャンセルされました。返金の可否はキャンセル理由・時刻・出欠状況により異なります。`;
}