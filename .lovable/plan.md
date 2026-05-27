# دمج WebContainers للبريفيو السريع

## الفكرة
WebContainers بيشغّل Node.js + npm + Vite **جوه المتصفح نفسه** عن طريق WebAssembly. يعني:
- مفيش E2B، مفيش Docker، مفيش شبكة سحابية
- بدء البريفيو في **1-3 ثواني** بدل 30-180 ثانية
- HMR فوري (الملفات local في الذاكرة)
- مفيش تكلفة E2B على المشاريع الـ web

## المعمارية الجديدة (Hybrid)

```text
المستخدم يفتح بروجكت
        │
        ▼
  detectProjectType()
   ├── web (React/Vue/Vite/Next/HTML) ──► WebContainersPreview  (سريع)
   └── backend/CLI/Python/Rust/Go ─────► E2BSandboxPreview     (الحالي)
```

## الخطوات

### 1) Package + Headers
- إضافة `@webcontainer/api` لـ package.json
- WebContainers بيحتاج COOP/COEP headers علشان SharedArrayBuffer:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- إضافتهم في `vite.config.ts` للـ dev، و `public/_headers` للـ production

### 2) Service جديدة: `src/lib/webcontainerPreview.ts`
- `boot()` — يبوت WebContainer مرة واحدة (singleton)
- `mountProject(files)` — يحط ملفات البروجكت في الـ FS الافتراضي
- `installAndRun()` — `npm install` ثم `npm run dev`
- `onServerReady(callback)` — يرجّع URL داخلي للـ iframe
- `writeFile(path, content)` — للتعديلات الحية بعد كل Claude edit
- `terminate()` — تنظيف عند إغلاق البروجكت

### 3) كومبوننت: `src/components/code/WebContainerPreview.tsx`
- يستبدل الـ iframe الحالي اللي بيشاور على E2B dev_url
- بيعرض progress: "Booting → Installing → Starting → Ready"
- iframe بيتغذى من الـ URL اللي WebContainers بيرجّعه

### 4) كاشف نوع البروجكت: `src/lib/detectProjectType.ts`
- يبص على `package.json` (لو موجود → web)
- لو فيه `requirements.txt` / `Cargo.toml` / `go.mod` → backend → E2B
- لو فيه `index.html` بس → web بسيط → WebContainers

### 5) دمج في صفحة الكود
- في `MegsyPrCodePage.tsx` (أو الكومبوننت اللي بيعرض البريفيو حالياً):
  - لو `projectType === "web"` → اعرض `<WebContainerPreview />`
  - غير كده → اعرض الكومبوننت الحالي اللي بيستخدم E2B

### 6) مزامنة تعديلات Claude
- بعد كل Claude edit (من `build-agent`)، نعمل `writeFile` على WebContainer نفس وقت ما بنحفظ في DB
- ده هيخلي HMR يتحرك فوراً من غير reload للـ iframe

## ملاحظات تقنية مهمة

- **WebContainers free tier**: مجاني لأي بروجكت open-source، وللأكواد اللي بتتولّد بـ AI، StackBlitz عندهم خطة خاصة. لازم نسجل الـ origin في dashboard بتاعهم (free) للإنتاج. للـ dev مفيش مشكلة.
- **محدودية**: مفيش native binaries (مفيش Python/Rust في WebContainers) — ولذلك بنخلي E2B لسه شغال للمشاريع دي.
- **الذاكرة**: WebContainer واحد بيشغّل في tab واحد، لو المستخدم فتح كذا بروجكت بنعمل cleanup للقديم.

## النتيجة المتوقعة
- بروجكت React/Vite يفتح في **2-3 ثواني** بدل 60-180 ثانية
- HMR في **<100ms** بدل 1-3 ثواني
- صفر تكلفة E2B على 90% من المشاريع
- المشاريع الـ backend/Python لسه شغالة على E2B زي ما هي
