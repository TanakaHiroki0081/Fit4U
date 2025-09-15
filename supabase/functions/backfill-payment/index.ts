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
    const { payment_intent_id } = await req.json()

    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'payment_intent_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log(`Backfilling payment for PI: ${payment_intent_id}`)

    // Initialize Stripe client
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-12-18.acacia',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id, {
      expand: ['latest_charge', 'latest_charge.balance_transaction']
    })

    console.log(`Retrieved PI: ${paymentIntent.id}, status: ${paymentIntent.status}`)

    if (paymentIntent.status !== 'succeeded') {
      return new Response(
        JSON.stringify({ error: `PaymentIntent status is ${paymentIntent.status}, not succeeded` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const chargeId = typeof paymentIntent.latest_charge === 'string' 
      ? paymentIntent.latest_charge 
      : paymentIntent.latest_charge?.id

    if (!chargeId) {
      return new Response(
        JSON.stringify({ error: 'No charge found for PaymentIntent' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log(`Found charge: ${chargeId}`)

    // Get charge with balance transaction
    const charge = await stripe.charges.retrieve(chargeId, { 
      expand: ['balance_transaction'] 
    })

    const bt = charge.balance_transaction
    if (!bt || typeof bt === 'string') {
      return new Response(
        JSON.stringify({ error: 'Balance transaction not available' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log(`BT data: id=${bt.id}, fee=${bt.fee}, net=${bt.net}`)

    // Update payment record
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        charge_id: charge.id,
        balance_tx_id: bt.id,
        stripe_fee: bt.fee,
        net_amount: bt.net,
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', payment_intent_id)

    if (updateError) {
      console.error(`Payment update error:`, updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update payment record' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    console.log(`Payment backfilled successfully for PI: ${payment_intent_id}`)

    return new Response(
      JSON.stringify({ 
        message: 'Payment backfilled successfully',
        payment_intent_id: payment_intent_id,
        charge_id: charge.id,
        balance_tx_id: bt.id,
        stripe_fee: bt.fee,
        net_amount: bt.net
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Backfill error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Backfill failed',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})