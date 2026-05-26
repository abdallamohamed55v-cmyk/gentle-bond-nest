// Edge function: scans an uploaded file for safety before storing.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { scanUpload, scanMessage } from '../_shared/file-scan.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import { detectLocale } from '../_shared/locale.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const locale = detectLocale(req);
  let userId: string | null = null;
  try {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    if (auth) {
      const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${auth}` } } });
      const { data } = await client.auth.getUser();
      userId = data.user?.id || null;
    }
  } catch { /* ignore */ }

  const rl = await checkRateLimit(req, 'scan_upload', userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter, locale, corsHeaders);

  try {
    const ct = req.headers.get('content-type') || '';
    let bytes: Uint8Array;
    let filename = '';
    let declaredMime = '';

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (!file) return new Response(JSON.stringify({ ok: false, reason: 'no_file' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      filename = file.name;
      declaredMime = file.type;
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const body = await req.json();
      filename = body.filename || '';
      declaredMime = body.mime || '';
      if (typeof body.base64 !== 'string') {
        return new Response(JSON.stringify({ ok: false, reason: 'no_data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const bin = atob(body.base64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    }

    const result = await scanUpload({ bytes, filename, declaredMime });
    return new Response(JSON.stringify({
      ...result,
      message: result.ok ? 'ok' : scanMessage(result.reason || 'unknown_format', locale),
    }), {
      status: result.ok ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: 'scan_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
