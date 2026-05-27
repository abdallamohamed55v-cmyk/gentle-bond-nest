// Firecrawl proxy with key rotation.
// Body: { action: 'scrape'|'search'|'map'|'crawl', payload: any }
import { withKeyRotation, hasUnlimitedPlan } from "../_shared/key-pool.ts";
import { getAuthUser } from "../_shared/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rough cost estimates per Firecrawl pricing ($0.001 per credit standard).
const COST_PER_ACTION: Record<string, number> = {
  scrape: 0.001,
  search: 0.005,
  map: 0.001,
  crawl: 0.01,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const action = String(body?.action ?? "scrape");
  if (!["scrape", "search", "map", "crawl"].includes(action)) {
    return json({ error: "invalid action" }, 400);
  }
  const payload = body?.payload ?? {};

  const user = await getAuthUser(req).catch(() => null);
  const unlimited = await hasUnlimitedPlan(user?.id);

  const result = await withKeyRotation("firecrawl", async (apiKey) => {
    const r = await fetch(`https://api.firecrawl.dev/v2/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return {
      ok: r.ok,
      status: r.status,
      data,
      errorText: r.ok ? undefined : (data?.error ?? text.slice(0, 200)),
      costUsd: r.ok ? (COST_PER_ACTION[action] ?? 0.001) : 0,
    };
  });

  if (!result.ok) return json({ error: result.errorText, status: result.status }, result.status === 503 ? 503 : 502);
  return json({ ok: true, unlimited, ...result.data });
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}
