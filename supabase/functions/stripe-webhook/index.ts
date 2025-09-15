import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let eventId = "unknown";
  let eventType = "unknown";

  try {
    const rawBody = await req.text();
    let event: Stripe.Event;

    if (STRIPE_WEBHOOK_SECRET) {
      const signature = req.headers.get("stripe-signature") ?? "";
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET,
        undefined,
        cryptoProvider,
      );
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    eventId = event.id;
    eventType = event.type;
    console.log(`[webhook] received: ${eventType} id=${eventId}`);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Handle payment success (idempotent by PI)
    if (event.type === "payment_intent.succeeded") {
      const piObj = event.data.object as any;
      const piId: string = piObj.id;

      // Get payment intent with expanded charge
      const pi = await stripe.paymentIntents.retrieve(piId, {
        expand: ["latest_charge"],
      });

      const lessonId = pi.metadata?.lesson_id ?? null;
      const traineeId = pi.metadata?.trainee_id ?? null;
      if (!lessonId || !traineeId) {
        console.warn("[webhook] missing metadata", { piId, lessonId, traineeId });
        return new Response("ok", { headers: corsHeaders, status: 200 });
      }

      const charge = (pi.latest_charge ?? pi.charges?.data?.[0]) as any;
      if (!charge?.id) {
        console.warn("[webhook] no charge for PI", { piId });
        return new Response("ok", { headers: corsHeaders, status: 200 });
      }

      // Get balance transaction for fees
      let bt: any = null;
      try {
        const ref = charge.balance_transaction;
        if (typeof ref === "string") {
          bt = await stripe.balanceTransactions.retrieve(ref);
        } else if (ref && typeof ref === "object") {
          bt = ref;
        }
      } catch (e) {
        console.warn("[webhook] balance_tx fetch failed", e);
      }

      const amount: number = charge.amount ?? pi.amount_received ?? pi.amount ?? 0;
      const currency: string = (charge.currency ?? pi.currency ?? "jpy").toLowerCase();
      const stripeFee: number | null = bt?.fee ?? null;
      const netAmount: number | null = bt?.net ?? null;

      // Create or update payment record (idempotent by payment_intent_id)
      const now = new Date().toISOString();
      const paymentRow = {
        lesson_id: lessonId,
        trainee_id: traineeId,
        payment_intent_id: piId,
        charge_id: charge.id,
        amount,
        stripe_fee: stripeFee,
        net_amount: netAmount,
        status: "paid" as const,
        paid_at: now,
        created_at: now,
        updated_at: now,
      };

      const { error: upsertErr } = await supabase
        .from("payments")
        .upsert(paymentRow, { onConflict: "payment_intent_id" });
      if (upsertErr) {
        console.error("[webhook] payments upsert error", upsertErr);
        return new Response("upsert failed", { headers: corsHeaders, status: 400 });
      }

      // Update booking status (best-effort)
      const { error: bookErr } = await supabase
        .from("bookings")
        .update({ status: "confirmed", payment_status: "paid", updated_at: now })
        .eq("lesson_id", lessonId)
        .eq("client_id", traineeId)
        .in("status", ["pending", "reserved", "confirmed"]);
      if (bookErr) console.error("[webhook] bookings update error", bookErr);

      return new Response("ok", { headers: corsHeaders, status: 200 });
    }

    // Handle refunds (finalize DB state when Stripe confirms)
    if (event.type === "charge.refunded") {
      const charge = event.data.object as any;
      const piId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const now = new Date().toISOString();

      // Update payment status
      await supabase
        .from("payments")
        .update({ status: "refunded", updated_at: now })
        .eq("payment_intent_id", piId);

      // Update refund status
      const stripeRefundId =
        Array.isArray(charge.refunds?.data) && charge.refunds.data[0]?.id
          ? charge.refunds.data[0].id
          : null;

      if (stripeRefundId) {
        const { data: refRows } = await supabase
          .from("refunds")
          .select("id, lesson_id, trainee_id")
          .eq("stripe_refund_id", stripeRefundId)
          .limit(1)
        if (refRows && refRows[0]) {
          const ref = refRows[0] as any;
          await supabase
            .from("refunds")
            .update({ refund_status: "refunded", refund_date: now, updated_at: now })
            .eq("id", ref.id);
          if (ref.lesson_id && ref.trainee_id) {
            await supabase
              .from("bookings")
              .update({ payment_status: "refunded", updated_at: now })
              .eq("lesson_id", ref.lesson_id)
              .eq("client_id", ref.trainee_id);
          }
        }
      }

      return new Response("ok", { headers: corsHeaders, status: 200 });
    }

    // Ignore other events
    return new Response("ok", { headers: corsHeaders, status: 200 });
  } catch (err: any) {
    console.error("[webhook] processing error", { eventId, eventType, err });
    return new Response("bad request", { headers: corsHeaders, status: 400 });
  }
});