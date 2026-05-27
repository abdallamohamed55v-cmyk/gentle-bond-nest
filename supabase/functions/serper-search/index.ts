// Serper.dev search proxy with key rotation.
// Body: { q: string, num?: number, type?: 'search'|'images'|'news'|'videos' }
import { withKeyRotation, hasUnlimitedPlan } from "../_shared/key-pool.ts";
import { getAuthUser } from "../_shared/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Serper public pricing: ~$0.30 per 1000 standard queries = $0.0003/query.
const SERPER_COST_PER_QUERY = 0.0003;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const q = String(body?.q ?? "").trim();
  if (!q) return json({ error: "missing q" }, 400);

  const type = ["search", "images", "news", "videos"].includes(body?.type) ? body.type : "search";
  const num = Math.min(Math.max(Number(body?.num ?? 10), 1), 100);

  const user = await getAuthUser(req).catch(() => null);
  const unlimited = await hasUnlimitedPlan(user?.id);
  // Free for $29+ subscribers; everyone else can still use it (we don't gate
  // here, but the credit pool itself is the cost ceiling). If you want to
  // hard-gate, uncomment the next two lines:
  // if (!unlimited) return json({ error: "subscription_required" }, 402);

  const result = await withKeyRotation("serper", async (apiKey) => {
    const r = await fetch(`https://google.serper.dev/${type}`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num }),
    });
    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return {
      ok: r.ok,
      status: r.status,
      data,
      errorText: r.ok ? undefined : (data?.message ?? text.slice(0, 200)),
      costUsd: r.ok ? SERPER_COST_PER_QUERY : 0,
    };
  });

  if (!result.ok) return json({ error: result.errorText, status: result.status }, result.status === 503 ? 503 : 502);
  return json({ ok: true, unlimited, ...result.data });
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}
