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
    const { paymentId, amount, reason } = await req.json()

    console.log(`Creating refund for payment: ${paymentId}, amount: ${amount}`)

    // Initialize Stripe client
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-12-18.acacia',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      throw new Error('Payment not found')
    }

    // Get the charge ID from payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment.payment_intent_id)
    const chargeId = typeof paymentIntent.latest_charge === 'string' 
      ? paymentIntent.latest_charge 
      : paymentIntent.latest_charge?.id

    if (!chargeId) {
      throw new Error('Charge not found for payment')
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: amount,
      reason: 'requested_by_customer',
      metadata: {
        payment_id: paymentId,
        refund_reason: reason
      }
    })

    console.log(`Stripe refund created: ${refund.id}`)

    // Update payment status
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({ 
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Refund creation error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Refund creation failed',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})