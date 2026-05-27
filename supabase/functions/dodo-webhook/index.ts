// Dodo Payments webhook handler — verifies Standard-Webhooks signature
// and credits the matching workspace.
//
// Hardening:
//  - Strict signature verification (rejects on failure).
//  - Idempotent: a topup row keyed on the provider invoice is inserted
//    only once. Repeated webhook deliveries are ignored.
//  - Credit grant aligned with the public pricing page:
//      starter:70 / pro:240 / elite:500 / business:1200 MC per monthly cycle.
//      Yearly cycles grant 12× that amount.
//  - Plan downgrade on cancel/expire/fail.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Tier = "starter" | "pro" | "elite" | "business";
const MONTHLY_CREDITS: Record<Tier, number> = {
  starter: 70,
  pro: 240,
  elite: 500,
  business: 1200,
};

function isTier(v: unknown): v is Tier {
  return v === "starter" || v === "pro" || v === "elite" || v === "business";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const secret = Deno.env.get("dodo-webhook");
  if (!secret) return new Response("missing webhook secret", { status: 500 });

  const rawBody = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") || "",
    "webhook-signature": req.headers.get("webhook-signature") || "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
  };

  if (!headers["webhook-id"] || !headers["webhook-signature"] || !headers["webhook-timestamp"]) {
    return new Response("missing webhook headers", { status: 400 });
  }

  let event: any;
  try {
    // Dodo signs with the Standard Webhooks spec. The secret may be raw or base64.
    const base64Secret = /^[A-Za-z0-9+/=]+$/.test(secret) && secret.length % 4 === 0
      ? secret
      : btoa(secret);
    const wh = new Webhook(base64Secret);
    event = wh.verify(rawBody, headers);
  } catch (e) {
    console.error("[dodo-webhook] signature verification failed", e);
    return new Response("invalid signature", { status: 401 });
  }

  console.log("[dodo-webhook] event", event.type);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const type = String(event.type || "");
    const data = event.data || {};
    const metadata = data.metadata || {};
    const userId = typeof metadata.user_id === "string" ? metadata.user_id : undefined;
    const tierRaw = (metadata.tier ?? metadata.plan) as unknown;
    const tier: Tier | undefined = isTier(tierRaw) ? tierRaw : undefined;
    const interval = metadata.interval === "yearly" ? "yearly" : "monthly";

    // Stable invoice key for idempotency — first non-empty wins.
    const invoiceKey: string =
      data.invoice_number ||
      data.payment_id ||
      data.subscription_id ||
      data.id ||
      headers["webhook-id"];

    const grantedEvents = new Set([
      "payment.succeeded",
      "subscription.active",
      "subscription.renewed",
    ]);
    const cancelEvents = new Set([
      "subscription.cancelled",
      "subscription.canceled",
      "subscription.expired",
      "subscription.failed",
      "payment.failed",
    ]);

    if (grantedEvents.has(type)) {
      if (!userId || !tier) {
        console.warn("[dodo-webhook] missing user_id or tier in metadata", { userId, tier });
        return new Response(JSON.stringify({ received: true, skipped: "missing_metadata" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency — bail if we already credited this invoice.
      const { data: existing } = await supabase
        .from("workspace_credit_topups")
        .select("id")
        .eq("invoice_number", invoiceKey)
        .maybeSingle();
      if (existing) {
        console.log("[dodo-webhook] duplicate event ignored", invoiceKey);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Locate the user's primary workspace.
      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .select("id, credits")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (wsErr || !ws) {
        console.error("[dodo-webhook] workspace not found for user", userId, wsErr);
        return new Response(JSON.stringify({ received: true, skipped: "no_workspace" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cycleMultiplier = interval === "yearly" ? 12 : 1;
      const add = MONTHLY_CREDITS[tier] * cycleMultiplier;

      const { error: upErr } = await supabase
        .from("workspaces")
        .update({ credits: Number(ws.credits || 0) + add, plan: tier } as any)
        .eq("id", ws.id);
      if (upErr) console.error("[dodo-webhook] workspace update failed", upErr);

      const { error: insErr } = await supabase.from("workspace_credit_topups").insert({
        workspace_id: ws.id,
        initiated_by: userId,
        amount_credits: add,
        amount_usd: typeof data.total_amount === "number" ? data.total_amount / 100 : 0,
        status: "paid",
        invoice_number: invoiceKey,
        metadata: {
          provider: "dodo",
          event_type: type,
          tier,
          interval,
          subscription_id: data.subscription_id ?? null,
          payment_id: data.payment_id ?? null,
        },
      } as any);
      if (insErr) console.error("[dodo-webhook] topup insert failed", insErr);
    } else if (cancelEvents.has(type)) {
      if (userId) {
        await supabase
          .from("workspaces")
          .update({ plan: "free" } as any)
          .eq("owner_id", userId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[dodo-webhook] handler error", e);
    // Return 200 to avoid Dodo infinite retry on a server bug, while still logging.
    return new Response(JSON.stringify({ received: true, error: (e as Error).message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
