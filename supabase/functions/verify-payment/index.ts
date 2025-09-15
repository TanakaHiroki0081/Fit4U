import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@17.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log(`Verifying payment for session: ${sessionId}`)

    // Initialize Stripe client
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-12-18.acacia',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    })

    console.log(`Session status: ${session.payment_status}`)

    let status = 'pending'
    if (session.payment_status === 'paid') {
      status = 'paid'
    } else if (session.payment_status === 'unpaid') {
      status = 'failed'
    }

    // Get booking details if payment is successful
    let booking = null
    if (status === 'paid') {
      const lessonId = session.metadata?.lesson_id
      const traineeId = session.metadata?.trainee_id

      if (lessonId && traineeId) {
        const { data: bookingData } = await supabaseClient
          .from('bookings')
          .select(`
            *,
            lesson:lessons(title, date, time)
          `)
          .eq('lesson_id', lessonId)
          .eq('client_id', traineeId)
          .single()

        booking = bookingData
      }
    }

    return new Response(
      JSON.stringify({ 
        status,
        sessionId,
        paymentIntentId: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id,
        amount: session.amount_total,
        currency: session.currency,
        booking
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Payment verification error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Payment verification failed',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})