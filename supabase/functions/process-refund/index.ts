// supabase/functions/process-refund/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@17.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
})

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  try {
    // 1) 認証 & 管理者チェック
    const authHeader = req.headers.get('Authorization') ?? ''
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: userRes, error: userErr } = await authClient.auth.getUser()
    if (userErr || !userRes?.user) return json({ error: 'Unauthorized' }, 401)

    const uid = userRes.user.id
    const { data: me, error: roleErr } = await admin
      .from('users')
      .select('role')
      .eq('id', uid)
      .maybeSingle()
    if (roleErr) console.error('role lookup error:', roleErr)
    if (me?.role !== 'admin') return json({ error: 'Forbidden' }, 403)

    // 2) 入力
    const body = await req.json().catch(() => ({}))
    const refundId: string | undefined = body?.refundId
    const adminNotes: string | null = body?.adminNotes ?? null
    if (!refundId) return json({ error: 'Missing refundId' }, 400)

    // 3) 返金対象を取得（支払い情報つき）
    const { data: refund, error: refErr } = await admin
      .from('refunds')
      .select(
        `
        id, refund_status, refund_amount, stripe_refund_id, payment_id,
        payment:payments(id, charge_id, payment_intent_id, stripe_session_id)
      `
      )
      .eq('id', refundId)
      .maybeSingle()

    if (refErr || !refund) {
      if (refErr) console.error('refund load error:', refErr)
      return json({ error: 'Refund not found' }, 404)
    }

    // 既に確定/進行中 → 冪等に成功扱い
    if (refund.refund_status !== 'pending') {
      return json({
        success: true,
        message: `noop: status=${refund.refund_status}`,
        stripeRefundId: refund.stripe_refund_id ?? null,
      })
    }
    if (refund.stripe_refund_id) {
      return json({
        success: true,
        message: 'already approved (stripe refund exists)',
        stripeRefundId: refund.stripe_refund_id,
      })
    }

    // 4) Stripe へ返金申請（※ EXACTLY ONE: payment_intent を優先）
    let amount = refund.refund_amount // JPY の最小単位
    const piId = refund.payment?.payment_intent_id ?? null
    const chargeId = refund.payment?.charge_id ?? null
    if (!piId && !chargeId)
      return json({ error: 'No charge/payment_intent to refund' }, 409)

    const refundParams: Record<string, unknown> = {
      amount,
      reason: 'requested_by_customer',
    }
    if (piId) refundParams.payment_intent = piId
    else refundParams.charge = chargeId as string

    // Guard: 参加者0や金額0以下はStripeに投げず、DBのみ確定
    if (!amount || amount <= 0) {
      const { error: updZeroErr } = await admin
        .from('refunds')
        .update({
          refund_status: 'refunded',
          refund_amount: 0,
          refund_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', refundId)
      if (updZeroErr) {
        console.error('refund zero-amount finalize error', updZeroErr)
        return json({ error: 'Failed to finalize zero-amount refund' }, 500)
      }

      // 支払い・予約も更新（存在すれば）
      if (refund.payment_id) {
        await admin.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', refund.payment_id)
      }
      if (refund.lesson_id && refund.trainee_id) {
        await admin
          .from('bookings')
          .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
          .eq('lesson_id', refund.lesson_id)
          .eq('client_id', refund.trainee_id)
      }

      return json({ success: true, message: 'Refund finalized with zero amount (no Stripe call).' })
    }

    const idempotencyKey = `refund:${refund.id}`

    let stripeRefund
    try {
      stripeRefund = await stripe.refunds.create(refundParams as any, {
        idempotencyKey,
      })
    } catch (e: any) {
      console.error('stripe.refunds.create error', {
        message: e?.message,
        type: e?.type,
        code: e?.code,
        param: e?.param,
      })
      return json(
        { error: `Stripe refund failed: ${e?.message ?? 'unknown'}` },
        400
      )
    }

    // 5) refunds 行を「approved」＋Stripe返金IDで更新（最終確定は Webhook）
    const { error: updErr } = await admin
      .from('refunds')
      .update({
        refund_status: 'approved',
        stripe_refund_id: stripeRefund.id,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId)

    if (updErr) {
      console.error('refund row update error', updErr)
      return json({ error: 'Failed to update refund row' }, 500)
    }

    return json({
      success: true,
      message: 'Refund approved; waiting for webhook finalization',
      stripeRefundId: stripeRefund.id,
    })
  } catch (e: any) {
    console.error('[process-refund] unhandled error', e)
    return json({ error: e?.message ?? 'Unhandled error' }, 500)
  }
})
