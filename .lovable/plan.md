# خطة التنفيذ

## 1. شارة "Unlimited Images" احترافية
- مكوّن جديد `src/components/branding/UnlimitedBadge.tsx` (gradient متحرك + أيقونة Infinity + tooltip).
- يعرض: "صور غير محدودة • Leonardo + 12 نموذجاً Pro" مع قائمة النماذج عند hover.
- إدراجها في:
  - `LandingPage` (قسم Hero + قسم الأسعار في `PricingPreview`).
  - `PricingPage` (في كل باقة ≥ $29).
  - بطاقة المولّد داخل `ImageStudioPage` للمشتركين.

## 2. نقل كل البيانات إلى Supabase
- مراجعة كل `localStorage.setItem` خارج التصميم (theme/sidebar collapsed/language preference UI فقط).
- إنشاء جداول:
  - `user_preferences` (ai_personalization, notification settings, memory).
  - `user_drafts` (project drafts بدل `projectDrafts.ts`).
  - `user_cache_meta` (mediaAssets index).
- استبدال الـ hooks: `useLocalCache` للداتا الفعلية → Supabase + React Query، والإبقاء عليه فقط للـ design tokens.
- ترحيل lazy: قراءة من localStorage مرة واحدة ثم upsert إلى Supabase ومسح المحلي.

## 3. Rate Limiting ذكي وخفي
- جدول `rate_limit_buckets (user_id, bucket, window_start, count, blocked_until)`.
- RPC `check_rate_limit(bucket, max_per_minute, max_per_hour)` يُستدعى من كل Edge Function حسّاسة (chat, generate-*, leonardo, serper, firecrawl, e2b-*, telegram-webhook public input).
- يصمت تماماً حتى التجاوز، عندها يعيد 429 + رسالة بلغة المستخدم.
- حدود ذكية حسب الخطة (free/starter/pro/unlimited).

## 4. فحص الملفات المرفوعة
- Edge Function `scan-upload`:
  - MIME magic-byte check (file-type via npm).
  - حجم أقصى حسب النوع.
  - رفض executables/scripts (.exe .bat .sh .js .html بمحتوى script).
  - فحص محتوى نصي عبر regex للأنماط الخبيثة (eval, base64 shellcode, `<script>` inside SVG, EICAR signature).
  - رفض polyglots (PDF+HTML).
- استدعاء قبل أي رفع إلى bucket في `WorkspaceImageUpload`, `MultiImageAttach`, `BottomInputBar`, `parseUploadedFile`.

## 5. حماية شاملة
- تفعيل RLS الصارم على كل الجداول الجديدة.
- CSP headers في edge functions ترجع HTML.
- Sanitization (DOMPurify) في كل مكان نستخدم `dangerouslySetInnerHTML` (chat markdown, slides preview, research report).
- Zod schemas لكل request body في edge functions الناقصة.
- إخفاء stack traces من responses (production).
- HMAC verification صارم لـ telegram-webhook و dodo-webhook.
- منع SSRF في firecrawl-proxy (blocklist لـ private IPs).

## 6. مطابقة لغة/لهجة المستخدم
- Edge Function shared: `detectUserLocale(req)` → من Accept-Language + body `userLocale` + first message language detection (موجود detectLang).
- تمرير `locale` إلى كل LLM system prompt: "Reply strictly in the user's language and dialect; for Arabic match the regional dialect (Egyptian/Gulf/Levantine) من سياق الرسائل".
- رسائل الخطأ من rate-limiter/scan-upload تترجم لـ ar/en/es/fr/de/...

## التقنيات
```
- Migration: rate_limit_buckets, user_preferences, user_drafts, plus RLS+RPC
- New edge functions: scan-upload, rate-limit-check (or RPC only)
- New shared: _shared/rate-limit.ts, _shared/locale.ts, _shared/file-scan.ts, _shared/sanitize.ts
- New UI: UnlimitedBadge.tsx
- Frontend hook: useSupabasePreferences (replaces local storage data)
- npm: file-type, isomorphic-dompurify (already), zod (already)
```

## الترتيب
1. Migration (جداول + RPC).
2. Shared modules (rate-limit, locale, file-scan).
3. Edge functions: scan-upload + تحديث chat/generate-*/leonardo/serper/firecrawl لاستخدام rate-limit + locale.
4. Badge component + إدراجها.
5. ترحيل localStorage → Supabase (hooks).
6. تطبيق DOMPurify + Zod في الأماكن الناقصة.
