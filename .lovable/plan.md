
# استبدال محرك البرمجة بـ Claude Code داخل E2B

## الفكرة

بدل ما `build-agent` يكون LLM loop يدوي بأدوات `fs_*` بسيطة (اللي بيطلع مواقع ضعيفة)، نخلي **Claude Code CLI الحقيقي** هو المحرك. الـ CLI ده عنده agent loop ناضج، planning، أدوات `Edit/Read/Bash/Grep` متطورة، context management، subagents — وده اللي بيدي جودة Anthropic.

علشان منستخدمش مفتاح Anthropic، نشغّل **free-claude-code proxy** (سيرفر Python Uvicorn) اللي بيتظاهر إنه Anthropic API وبيوجّه الكلام لـ **Kimi K2 عبر OpenRouter**. الـ Claude CLI بيتكلم مع البروكسي ده محلياً.

البيئة كلها بتعيش في **E2B sandbox** الموجود أصلاً للمشروع — نفس السندبوكس اللي بيشغّل preview الـ Vite بالفعل، وده اللي بيحل مشكلة الـ 3 دقائق لأن الـ Claude بيعدّل الملفات مباشرة في الـ filesystem اللي Vite بيشوفه (HMR لحظي بدل sync من Supabase storage).

## المعمارية الجديدة

```text
┌─────────────────────────────────────────────────────┐
│  Edge Function: build-agent (slim orchestrator)     │
│  - يبعت رسالة المستخدم لـ E2B عبر execute command   │
│  - يستريم stdout/stderr للواجهة                     │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼─────────┐
              │   E2B Sandbox    │
              │  (per project)   │
              │                  │
              │ 1) Vite dev      │  ← Cloudflare tunnel للـ preview
              │    (port 8080)   │
              │                  │
              │ 2) fcc-server    │  ← بروكسي Python على 8082
              │    (Uvicorn)     │
              │                  │
              │ 3) claude CLI    │  ← المحرك الفعلي
              │    -p "msg"      │
              │    --output-     │
              │    format        │
              │    stream-json   │
              │                  │
              │ ANTHROPIC_BASE_  │
              │ URL=localhost:   │
              │ 8082             │
              └──────────────────┘
                       │
                       ▼
              OpenRouter → Kimi K2
```

## الملفات اللي هتتغير

### 1. Edge functions
- **`supabase/functions/build-agent/index.ts`** — تقليصه بشكل كبير: يبقى مجرّد orchestrator. يستقبل الرسالة، يتأكد إن السندبوكس شغّال، يشغّل `claude -p` فيه عبر `sbx.commands.run`، يستريم الـ stdout كـ SSE للواجهة. الـ system prompt و tool loop والـ planning كلها بقت داخل Claude Code نفسه.
- **`supabase/functions/_shared/e2b-bootstrap.ts`** (جديد) — script bootstrap يتنفّذ مرّة واحدة عند بدء سندبوكس مشروع: install Claude Code + uv + Python 3.14 + free-claude-code + يكتب config بمفاتيح OpenRouter + يشغّل `fcc-server` كـ daemon.

### 2. Secrets
- `OPENROUTER_API_KEY` (موجود غالباً بالفعل في `api_keys` table — هنقرأه ونحقنه في السندبوكس).
- اختياري: `KIMI_API_KEY` لو حابب توجيه مباشر لـ Moonshot بدل OpenRouter.

### 3. Frontend
- **`src/lib/projectSandbox.ts`** — إضافة `runClaude(projectId, message)` بترجع stream.
- صفحة البرمجة (MegsyPrCodePage / MegsyPrHomePage) — render للـ Claude Code streamed JSON events (text, tool_use, tool_result) بدل event format القديم.

### 4. ملفات هتتشال
- `SYSTEM_PROMPT` الضخم في build-agent (≈ 75 سطر) — Claude Code عنده الخاص.
- معظم `buildTools()` (fs_write, fs_search_replace, fs_search, sandbox_run_python … ) — الـ CLI عنده أدوات أحسن بكتير.
- `loadRecentMessages` / `buildConversationContext` — Claude Code بيدير context بنفسه (`CLAUDE_CODE_AUTO_COMPACT_WINDOW=190k`).

## حل مشكلة الـ Hot Reload (3 دقائق)

السبب الحالي: كل `fs_write` بيكتب في Supabase Storage → background sync لازم ينقل الملف للسندبوكس → Vite يعيد البناء. ده بيتعمل في batches.

الحل بعد التغيير: Claude يكتب مباشرة على فايل سيستم السندبوكس بـ `Edit` tool الخاص بيه. Vite بيشوف التغيير لحظياً ويعمل HMR في < 1 ثانية. الـ Supabase sync يبقى للـ persistence فقط (background، مش blocking).

## خطوات التنفيذ

### المرحلة 1: bootstrap السندبوكس
1. كتابة `bootstrap_claude_code.sh` يتنفّذ في E2B:
   - `curl -fsSL .../install.sh | sh` → install fcc + claude
   - كتابة `~/.fcc/config.json` بـ `MODEL=open_router/moonshotai/kimi-k2-0905`
   - تشغيل `nohup fcc-server > /tmp/fcc.log 2>&1 &`
   - تصدير `ANTHROPIC_BASE_URL=http://127.0.0.1:8082`
2. إضافة sandbox action جديد `sandbox:bootstrap_claude` يشغّل ده مرّة واحدة per sandbox.

### المرحلة 2: استبدال build loop
1. كتابة `runClaudeStream(sbx, prompt)` يشغّل:
   ```
   claude -p "<prompt>" --output-format stream-json \
          --permission-mode acceptEdits \
          --max-turns 50
   ```
   ويستريم الـ JSONL stdout.
2. تحويل كل event JSON لـ SSE event للواجهة (`text`, `tool_use`, `tool_result`, `done`).
3. حفظ الرد النهائي في `ai_project_messages` بعد ما الـ stream يخلص.

### المرحلة 3: تنضيف
1. شيل `SYSTEM_PROMPT` و `buildTools` و related helpers.
2. خلّي `build-agent/index.ts` تحت 400 سطر (من 1419 حالياً).
3. حدّث الـ frontend renderer.

### المرحلة 4: تجربة
1. مشروع تجريبي: "اعمل لي landing page لشركة قهوة" → نتأكد إن الأحجام/الجودة بقت أعلى بكتير.
2. مراقبة preview HMR latency.
3. مراقبة تكلفة Kimi عبر OpenRouter (Claude Code شغول جداً — هيستهلك كتير).

## مخاطر / تحفظات

- **التكلفة**: Claude Code بيعمل tool calls كتير. Kimi K2 على OpenRouter رخيص بس ممكن المشاريع الكبيرة توصل لـ 2-5$ لكل مشروع. هنحتاج credit caps.
- **زمن البدء أول مرة**: ـbootstrap script (install claude + uv + python + fcc) ممكن ياخد 60-90 ثانية أول مرة per sandbox. بعدها cached.
- **Sandbox lifetime**: E2B sandboxes بتموت بعد فترة عدم نشاط — لازم نعيد bootstrap. هنحط check في بداية كل request.
- **Tool compatibility**: Kimi مش بيتدرّب على Anthropic tool format بالظبط؛ free-claude-code بيعمل ترجمة بس ممكن يحصل خلل في تفسير tool results معقدة. لازم نراقب أول استخدامات.
- **Sync مع Supabase Storage**: لازم نضيف post-hook بعد كل Claude run يـ pull الملفات الجديدة من السندبوكس لـ Storage علشان الـ persistence والـ download codebase يفضلوا شغّالين.

## ما الذي لن يتغيّر

- نظام المشاريع، الـ DB schema، صفحات الواجهة، Cloudflare preview tunnel، Dodo payments، باقي edge functions كلها زي ما هي.
- الـ E2B sandbox lifecycle (start/stop/status) ثابت — بس بنزود boot step.

---

موافق أبدأ؟ أو عندك تعديل على الخطة؟
