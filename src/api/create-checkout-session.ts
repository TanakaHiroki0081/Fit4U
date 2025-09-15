import { supabase } from '../lib/supabase';
import { formatAmountForStripe, handleStripeError } from '../lib/stripe';

interface CreateCheckoutSessionRequest {
  lessonId: string;
  traineeId: string;
}

interface CreateCheckoutSessionResponse {
  sessionId: string;
  url?: string;
}

export const createCheckoutSession = async ({ lessonId, traineeId }: CreateCheckoutSessionRequest) => {
  try {
    console.log('Creating checkout session for:', { lessonId, traineeId });
    
    // レッスン情報を事前に取得して検証
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        *,
        trainer:users!lessons_trainer_id_fkey(name, email)
      `)
      .eq('id', lessonId)
      .eq('status', 'scheduled')
      .single();

    if (lessonError || !lesson) {
      console.error('Lesson not found:', lessonError);
      throw new Error('レッスンが見つからないか、既にキャンセルされています。');
    }

    console.log('Lesson found:', lesson);

    // 既存の予約をチェック
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('client_id', traineeId)
      .maybeSingle();

    if (existingBooking) {
      console.error('Booking already exists:', existingBooking);
      throw new Error('このレッスンは既に予約済みです。');
    }

    // 満席チェック
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('status', 'confirmed');

    if (bookings && bookings.length >= lesson.max_participants) {
      console.error('Lesson is full:', { current: bookings.length, max: lesson.max_participants });
      throw new Error('このレッスンは満席です。');
    }

    // Validate lesson price
    if (lesson.price <= 0) {
      throw new Error('無料レッスンは決済不要です。');
    }

    console.log('Creating Stripe session...');

    // Create checkout session via Supabase Edge Function
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId,
        traineeId,
        lessonTitle: lesson.title,
        amount: formatAmountForStripe(lesson.price),
        trainerName: lesson.trainer?.name,
        lessonDate: lesson.date,
        lessonTime: lesson.time
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe session creation failed:', errorData);
      throw new Error(handleStripeError(errorData) || '決済セッションの作成に失敗しました。');
    }

    const { sessionId, url } = await response.json();
    console.log('Stripe session created successfully:', sessionId);
    
    // Store pending booking info for recovery
    localStorage.setItem('pendingBooking', JSON.stringify({
      lessonId,
      traineeId,
      sessionId,
      lessonTitle: lesson.title,
      amount: lesson.price,
      timestamp: Date.now()
    }));
    
    return { sessionId, url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};