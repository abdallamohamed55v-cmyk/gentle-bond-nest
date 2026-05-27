// Composio integrations: connect / status / disconnect per authenticated user.
// Uses Composio v3 API: https://docs.composio.dev
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPOSIO_BASE = "https://backend.composio.dev/api/v3";
const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY") || "";

async function composio(path: string, init: RequestInit = {}) {
  const res = await fetch(`${COMPOSIO_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": COMPOSIO_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// Get or create a managed auth_config for an app, cached in DB.
async function getAuthConfigId(sb: any, appSlug: string): Promise<string> {
  const slug = appSlug.toLowerCase();
  const { data: cached } = await sb
    .from("composio_auth_configs")
    .select("auth_config_id")
    .eq("app_slug", slug)
    .maybeSingle();
  if (cached?.auth_config_id) return cached.auth_config_id;

  const created = await composio("/auth_configs", {
    method: "POST",
    body: JSON.stringify({
      toolkit: { slug },
      auth_config: { type: "use_composio_managed_auth" },
    }),
  });
  if (!created.ok) {
    throw new Error(`auth_config create failed [${created.status}]: ${JSON.stringify(created.data).slice(0, 400)}`);
  }
  const id = created.data?.auth_config?.id || created.data?.id;
  if (!id) throw new Error("auth_config id missing from Composio response");
  await sb.from("composio_auth_configs").insert({ app_slug: slug, auth_config_id: id });
  return id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!COMPOSIO_API_KEY) {
    return new Response(JSON.stringify({ error: "COMPOSIO_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: u } = await userClient.auth.getUser(token);
    const userId = u?.user?.id;
    if (!userId) return json({ error: "unauthorized" }, 401);

    const sb = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();

    if (action === "status") {
      // Refresh statuses from Composio, then return user's connections
      const list = await composio(`/connected_accounts?user_ids=${encodeURIComponent(userId)}&limit=100`);
      if (list.ok) {
        const items = (list.data?.items || []) as any[];
        // Upsert into local cache
        for (const it of items) {
          const slug = (it.toolkit?.slug || it.appName || "").toLowerCase();
          if (!slug || !it.id) continue;
          await sb.from("composio_connections").upsert({
            user_id: userId,
            app_slug: slug,
            connected_account_id: it.id,
            status: (it.status || "active").toLowerCase(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,app_slug" });
        }
      }
      const { data: conns } = await sb
        .from("composio_connections")
        .select("app_slug,status,connected_account_id")
        .eq("user_id", userId);
      return json({ connections: conns || [] });
    }

    if (action === "connect") {
      const appSlug = String(body.app_slug || "").toLowerCase();
      const callbackUrl = String(body.callback_url || "");
      if (!appSlug) return json({ error: "app_slug required" }, 400);
      const authConfigId = await getAuthConfigId(sb, appSlug);
      const init = await composio("/connected_accounts", {
        method: "POST",
        body: JSON.stringify({
          auth_config: { id: authConfigId },
          connection: { user_id: userId, ...(callbackUrl ? { callback_url: callbackUrl } : {}) },
        }),
      });
      if (!init.ok) {
        return json({ error: "composio init failed", details: init.data }, 502);
      }
      const accountId = init.data?.id || init.data?.connectedAccountId;
      const redirectUrl = init.data?.redirect_url || init.data?.redirectUrl || init.data?.connection?.redirect_url;
      if (accountId) {
        await sb.from("composio_connections").upsert({
          user_id: userId,
          app_slug: appSlug,
          connected_account_id: accountId,
          status: "pending",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,app_slug" });
      }
      return json({ redirect_url: redirectUrl, connected_account_id: accountId });
    }

    if (action === "disconnect") {
      const appSlug = String(body.app_slug || "").toLowerCase();
      if (!appSlug) return json({ error: "app_slug required" }, 400);
      const { data: row } = await sb
        .from("composio_connections")
        .select("connected_account_id")
        .eq("user_id", userId)
        .eq("app_slug", appSlug)
        .maybeSingle();
      if (row?.connected_account_id) {
        await composio(`/connected_accounts/${encodeURIComponent(row.connected_account_id)}`, { method: "DELETE" });
      }
      await sb.from("composio_connections")
        .delete()
        .eq("user_id", userId)
        .eq("app_slug", appSlug);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("composio error:", err);
    return json({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
