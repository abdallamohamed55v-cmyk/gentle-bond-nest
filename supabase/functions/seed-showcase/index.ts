import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import prompts from "./prompts.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const catMap: Record<number, string> = {
  1: "Creatives & Designers", 5: "Creatives & Designers", 14: "Creatives & Designers",
  15: "Creatives & Designers", 31: "Creatives & Designers", 35: "Creatives & Designers",
  36: "Creatives & Designers",
  16: "3D & Render", 17: "3D & Render",
  2: "Lifestyle", 11: "Lifestyle", 19: "Lifestyle", 21: "Lifestyle", 25: "Lifestyle", 32: "Lifestyle",
  20: "Marketing", 24: "Marketing", 33: "Marketing",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Mark a curated subset as trending so the Trending section is populated
  const trendingSet = new Set([1, 5, 11, 14, 16, 19, 20, 24, 31, 33]);

  const rows = (prompts as Array<{ num: number; title: string; prompt: string }>).map((p) => ({
    media_url: `/templates/showcase/${p.num}.jpg`,
    media_type: "image",
    prompt: p.prompt,
    model_id: "nano-banana",
    model_name: "Nano Banana",
    aspect_ratio: "3:4",
    quality: "standard",
    display_order: p.num,
    category: catMap[p.num] ?? "Photography",
    is_trending: trendingSet.has(p.num),
    trending_at: trendingSet.has(p.num) ? new Date().toISOString() : null,
  }));

  // Remove any prior rows that share these template URLs (idempotent)
  await supabase
    .from("showcase_items")
    .delete()
    .in("media_url", rows.map((r) => r.media_url));

  const { error, data } = await supabase.from("showcase_items").insert(rows).select("id");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ inserted: data?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
