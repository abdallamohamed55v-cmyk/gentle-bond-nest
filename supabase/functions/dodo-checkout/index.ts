// Creates a Dodo Payments checkout session for a workspace subscription.
// Security model:
//  - Caller must be an authenticated Supabase user.
//  - Client sends `tier` ("starter" | "pro" | "elite" | "business") and
//    `interval` ("monthly" | "yearly"). The actual Dodo product_id is
//    resolved server-side from a fixed allow-list, so the client cannot
//    request a different / cheaper product than what their tier maps to.
//  - For backward compatibility we still accept a raw `product_id`, but
//    only if it appears in the server allow-list.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DODO_BASE = "https://live.dodopayments.com";

// ------------------------------------------------------------------
// Authoritative product map — must stay in sync with src/lib/workspacePlans.ts
// Any product_id NOT in this map is rejected.
// ------------------------------------------------------------------
type Tier = "starter" | "pro" | "elite" | "business";
type Interval = "monthly" | "yearly";

const PRODUCT_MAP: Record<Tier, Record<Interval, string>> = {
  starter:  { monthly: "pdt_0NfOHJoiT8SDfibwKrYkd", yearly: "pdt_0NfOI5bIL4ENBrcV8JEvM" },
  pro:      { monthly: "pdt_0NfOIP9Cjs7MnsYwuOHA5", yearly: "pdt_0NfOIbGR12Bk6zmVhIfho" },
  elite:    { monthly: "pdt_0NfOIsOWsAjKTv5MycEUK", yearly: "pdt_0NfOJ0bn0DYGJudz1v5dO" },
  business: { monthly: "pdt_0NfOJ8SCeVWcmpoJtiHaX", yearly: "pdt_0NfOJHY75Ky5FtnhU3ZPL" },
};

// Build a reverse index { product_id -> { tier, interval } } once.
const PRODUCT_INDEX: Record<string, { tier: Tier; interval: Interval }> = (() => {
  const out: Record<string, { tier: Tier; interval: Interval }> = {};
  (Object.keys(PRODUCT_MAP) as Tier[]).forEach((tier) => {
    (Object.keys(PRODUCT_MAP[tier]) as Interval[]).forEach((interval) => {
      out[PRODUCT_MAP[tier][interval]] = { tier, interval };
    });
  });
  return out;
})();

const ALLOWED_ORIGINS = new Set([
  "https://megsyai.com",
  "https://www.megsyai.com",
]);

function safeReturnOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  // Allow production hosts AND Lovable preview / localhost.
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return origin;
  return "https://megsyai.com";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("dodo-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "dodo-key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Authenticated caller ----
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // ---- Parse + validate body ----
    const body = await req.json().catch(() => ({}));
    const rawTier = typeof body.tier === "string" ? body.tier.toLowerCase() : "";
    const rawInterval = typeof body.interval === "string" ? body.interval.toLowerCase() : "monthly";
    const rawProductId = typeof body.product_id === "string" ? body.product_id : "";

    let tier: Tier | null = null;
    let interval: Interval = "monthly";
    let product_id = "";

    // ---- Resolve product_id from DB first, fall back to hardcoded map ----
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    async function resolveFromDb(t: Tier, i: Interval): Promise<string | null> {
      const { data } = await adminClient
        .from("dodo_products")
        .select("product_id")
        .eq("tier", t)
        .eq("interval", i)
        .eq("active", true)
        .maybeSingle();
      return data?.product_id ?? null;
    }

    async function lookupByProductId(pid: string): Promise<{ tier: Tier; interval: Interval } | null> {
      const { data } = await adminClient
        .from("dodo_products")
        .select("tier, interval")
        .eq("product_id", pid)
        .eq("active", true)
        .maybeSingle();
      if (data) return { tier: data.tier as Tier, interval: data.interval as Interval };
      return PRODUCT_INDEX[pid] ?? null;
    }

    if (rawTier && (rawTier === "starter" || rawTier === "pro" || rawTier === "elite" || rawTier === "business")) {
      tier = rawTier;
      interval = rawInterval === "yearly" ? "yearly" : "monthly";
      product_id = (await resolveFromDb(tier, interval)) || PRODUCT_MAP[tier][interval];
    } else if (rawProductId) {
      const ix = await lookupByProductId(rawProductId);
      if (!ix) {
        return new Response(
          JSON.stringify({ error: "invalid_plan", message: "Unknown product_id." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      tier = ix.tier;
      interval = ix.interval;
      product_id = rawProductId;
    } else {
      return new Response(
        JSON.stringify({ error: "invalid_plan", message: "Missing tier or product_id." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: "product_id_missing", message: `No product_id configured for ${tier}/${interval}. Add it in the dodo_products table.` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Build checkout ----
    const origin = safeReturnOrigin(req);
    const return_url = `${origin}/billing/success?checkout_id={CHECKOUT_SESSION_ID}`;

    console.log("[dodo-checkout] creating session", {
      tier, interval, product_id, user_id: user.id, origin,
    });

    const dodoRes = await fetch(`${DODO_BASE}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [{ product_id, quantity: 1 }],
        customer: {
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        },
        return_url,
        // Trusted metadata — derived server-side, do NOT forward client-supplied fields.
        metadata: {
          user_id: user.id,
          tier,
          plan: tier,           // legacy alias
          interval,
          source: "pricing_page",
        },
      }),
    });

    const dodoData = await dodoRes.json().catch(() => ({}));
    if (!dodoRes.ok) {
      console.error("[dodo-checkout] upstream error", dodoRes.status, dodoData);
      return new Response(
        JSON.stringify({ error: dodoData?.message || "dodo_error", detail: dodoData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = dodoData.checkout_url || dodoData.payment_link || dodoData.url;
    if (!url) {
      return new Response(
        JSON.stringify({ error: "no_checkout_url", detail: dodoData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ url, session_id: dodoData.session_id || dodoData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[dodo-checkout] crash", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
