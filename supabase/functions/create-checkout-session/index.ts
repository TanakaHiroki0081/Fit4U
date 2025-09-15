import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lessonId, traineeId, lessonTitle, amount, trainerName, lessonDate, lessonTime } = await req.json()

    console.log('Edge function received:', { lessonId, traineeId, lessonTitle, amount })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch lesson details
    const { data: lesson, error: lessonError } = await supabaseClient
      .from('lessons')
      .select(`
        *,
        trainer:users!lessons_trainer_id_fkey(name)
      `)
      .eq('id', lessonId)
      .eq('status', 'scheduled')
      .single()

    if (lessonError || !lesson) {
      console.error('Lesson fetch error:', lessonError)
      throw new Error('レッスンが見つからないか、既にキャンセルされています。')
    }

    console.log('Lesson details:', lesson)

    // Check if lesson is full
    const { data: bookings } = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('status', 'confirmed')

    if (bookings && bookings.length >= lesson.max_participants) {
      console.error('Lesson is full:', { current: bookings.length, max: lesson.max_participants })
      throw new Error('このレッスンは満席です。')
    }

    console.log('Creating pending booking...')

    // Create pending booking first
    const { data: bookingRow, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        lesson_id: lessonId,
        client_id: traineeId,
        status: 'pending',
        payment_status: 'pending'
      })
      .select('id')
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      if ((bookingError as any).code === '23505') {
        throw new Error('このレッスンは既に予約済みです。')
      }
      throw new Error('予約の作成に失敗しました。')
    }

    const bookingId = bookingRow.id as string
    console.log('Pending booking created, creating Stripe session...')

    // Create Stripe checkout session
    const successUrl =
      `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/payment-success` +
      `?session_id={CHECKOUT_SESSION_ID}&user_id=${traineeId}&lesson_id=${lessonId}`
    const cancelUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/payment-cancel`
    const description = trainerName ? `講師: ${trainerName} | ${lessonDate} ${lessonTime}` : `${lessonDate} ${lessonTime}`

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'jpy',
        'line_items[0][price_data][product_data][name]': lesson.title,
        'line_items[0][price_data][product_data][description]': description,
        'line_items[0][price_data][unit_amount]': lesson.price.toString(),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': successUrl,
        'cancel_url': cancelUrl,
        'metadata[lesson_id]': lessonId,
        'metadata[trainee_id]': traineeId,
        'metadata[booking_id]': bookingId,
        'payment_intent_data[metadata][lesson_id]': lessonId,
        'payment_intent_data[metadata][trainee_id]': traineeId,
        'payment_intent_data[metadata][booking_id]': bookingId,
        'automatic_tax[enabled]': 'false',
      })
    })

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.json()
      console.error('Stripe API error:', stripeError)
      throw new Error(`決済セッションの作成に失敗しました: ${stripeError.error?.message || 'Unknown error'}`)
    }

    const session = await stripeResponse.json()
    console.log('Stripe session created:', session.id)
    console.log('Session metadata set:', { lesson_id: lessonId, trainee_id: traineeId })

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})