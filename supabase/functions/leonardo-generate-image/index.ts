// Leonardo.ai image generation with API-key rotation pool.
// Body: { prompt, modelId?, width?, height?, num_images?, negative_prompt? }
// Returns: { ok, images: [{url}], generationId, unlimited }
import { withKeyRotation, hasUnlimitedPlan } from "../_shared/key-pool.ts";
import { getAuthUser } from "../_shared/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Leonardo default model: Phoenix 1.0. Users can override via modelId.
const DEFAULT_MODEL_ID = "6b645e3a-d64f-4341-a6d8-7a3690fbf042";
// Rough cost — Leonardo tokens are ~$0.0009 each, base ~10 tokens per 1024px image.
const COST_PER_IMAGE_USD = 0.01;

interface ReqBody {
  prompt: string;
  modelId?: string;
  width?: number;
  height?: number;
  num_images?: number;
  negative_prompt?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  if (!body?.prompt || typeof body.prompt !== "string") return json({ error: "missing prompt" }, 400);

  const user = await getAuthUser(req).catch(() => null);
  const unlimited = await hasUnlimitedPlan(user?.id);

  const modelId = body.modelId || DEFAULT_MODEL_ID;
  const width = clamp(body.width ?? 1024, 512, 1536);
  const height = clamp(body.height ?? 1024, 512, 1536);
  const num_images = clamp(body.num_images ?? 1, 1, 4);

  const result = await withKeyRotation("leonardo", async (apiKey) => {
    // 1) Create generation
    const createRes = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: body.prompt,
        modelId,
        width,
        height,
        num_images,
        negative_prompt: body.negative_prompt,
      }),
    });
    const createText = await createRes.text();
    let createData: any;
    try { createData = JSON.parse(createText); } catch { createData = { raw: createText }; }
    if (!createRes.ok) {
      return {
        ok: false,
        status: createRes.status,
        errorText: createData?.error ?? createText.slice(0, 200),
        costUsd: 0,
      };
    }
    const genId = createData?.sdGenerationJob?.generationId;
    if (!genId) {
      return { ok: false, status: 502, errorText: "no_generation_id", costUsd: 0 };
    }

    // 2) Poll until complete (max ~60s)
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${genId}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
      const pollText = await pollRes.text();
      let pollData: any;
      try { pollData = JSON.parse(pollText); } catch { pollData = {}; }
      if (!pollRes.ok) {
        return {
          ok: false,
          status: pollRes.status,
          errorText: pollData?.error ?? pollText.slice(0, 200),
          costUsd: 0,
        };
      }
      const gen = pollData?.generations_by_pk;
      if (gen?.status === "COMPLETE") {
        const images = (gen.generated_images ?? []).map((g: any) => ({ url: g.url, id: g.id }));
        return {
          ok: true,
          status: 200,
          data: { generationId: genId, images },
          costUsd: COST_PER_IMAGE_USD * Math.max(images.length, 1),
        };
      }
      if (gen?.status === "FAILED") {
        return { ok: false, status: 502, errorText: "generation_failed", costUsd: 0 };
      }
    }
    return { ok: false, status: 504, errorText: "generation_timeout", costUsd: 0 };
  });

  if (!result.ok) {
    return json({ error: result.errorText, status: result.status }, result.status === 503 ? 503 : 502);
  }
  return json({ ok: true, unlimited, ...result.data });
});

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, Math.round(n))); }
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}
