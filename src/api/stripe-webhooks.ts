import { supabase } from '../lib/supabase';

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export const handleStripeWebhook = async (event: WebhookEvent) => {
  console.log(`Processing webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    throw error;
  }
};

const handlePaymentIntentSucceeded = async (paymentIntent: any) => {
  const { id: paymentIntentId, amount, metadata } = paymentIntent;
  const { lesson_id: lessonId, trainee_id: traineeId } = metadata;

  if (!lessonId || !traineeId) {
    console.warn('Missing metadata in payment intent:', paymentIntentId);
    return;
  }

  try {
    // Update booking status
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid'
      })
      .eq('lesson_id', lessonId)
      .eq('client_id', traineeId);

    if (bookingError) throw bookingError;

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .upsert({
        payment_intent_id: paymentIntentId,
        lesson_id: lessonId,
        trainee_id: traineeId,
        amount: amount,
        status: 'paid',
        paid_at: new Date().toISOString()
      }, {
        onConflict: 'payment_intent_id'
      });

    if (paymentError) throw paymentError;

    // Create notifications
    await createPaymentNotifications(lessonId, traineeId, paymentIntentId);

    console.log(`Payment processed successfully: ${paymentIntentId}`);
  } catch (error) {
    console.error(`Error processing payment success: ${paymentIntentId}`, error);
    throw error;
  }
};

const handlePaymentIntentFailed = async (paymentIntent: any) => {
  const { id: paymentIntentId, metadata } = paymentIntent;
  const { lesson_id: lessonId, trainee_id: traineeId } = metadata;

  if (!lessonId || !traineeId) {
    console.warn('Missing metadata in failed payment intent:', paymentIntentId);
    return;
  }

  try {
    // Update booking status to failed
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: 'failed'
      })
      .eq('lesson_id', lessonId)
      .eq('client_id', traineeId);

    if (bookingError) throw bookingError;

    console.log(`Payment failed processed: ${paymentIntentId}`);
  } catch (error) {
    console.error(`Error processing payment failure: ${paymentIntentId}`, error);
    throw error;
  }
};

const handleChargeDispute = async (dispute: any) => {
  const { charge, reason, amount } = dispute;
  
  try {
    // Get payment record
const { data: payment, error: paymentError } = await supabase
  .from('payments')
  .select('*')
  .eq('charge_id', charge)
  .maybeSingle();

    if (paymentError || !payment) {
      console.warn('Payment not found for disputed charge:', charge);
      return;
    }

    // Create notification for admin
    await supabase
      .from('notifications')
      .insert({
        user_id: 'admin', // You might want to get actual admin user ID
        type: 'charge_dispute',
        title: 'チャージバック発生',
        message: `決済に対してチャージバックが発生しました。金額: ¥${amount.toLocaleString()}, 理由: ${reason}`,
        data: {
          dispute_id: dispute.id,
          charge_id: charge,
          payment_id: payment.id,
          amount: amount,
          reason: reason
        }
      });

    console.log(`Dispute notification created for charge: ${charge}`);
  } catch (error) {
    console.error(`Error processing dispute for charge: ${charge}`, error);
    throw error;
  }
};

const createPaymentNotifications = async (lessonId: string, traineeId: string, paymentIntentId: string) => {
  try {
    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        title, date, time, trainer_id,
        trainer:users(name)
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.warn('Lesson not found for notification:', lessonId);
      return;
    }

    // Notification for trainee
    await supabase
      .from('notifications')
      .insert({
        user_id: traineeId,
        type: 'payment_success',
        title: '決済完了',
        message: `${lesson.title}（${lesson.date} ${lesson.time}）の決済が完了しました。`,
        data: {
          lesson_id: lessonId,
          payment_intent_id: paymentIntentId,
          lesson_title: lesson.title,
          lesson_date: lesson.date,
          lesson_time: lesson.time,
          trainer_name: lesson.trainer?.name
        }
      });

    // Notification for trainer
    await supabase
      .from('notifications')
      .insert({
        user_id: lesson.trainer_id,
        type: 'new_booking',
        title: '新しい予約',
        message: `${lesson.title}（${lesson.date} ${lesson.time}）に新しい予約が入りました。`,
        data: {
          lesson_id: lessonId,
          payment_intent_id: paymentIntentId,
          lesson_title: lesson.title,
          lesson_date: lesson.date,
          lesson_time: lesson.time,
          trainee_id: traineeId
        }
      });

  } catch (error) {
    console.error('Error creating payment notifications:', error);
  }
};