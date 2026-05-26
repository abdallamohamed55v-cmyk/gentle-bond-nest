// Helpers for running Claude Code CLI inside an E2B sandbox, with
// free-claude-code as a local Anthropic-compatible proxy pointing at
// OpenRouter (Kimi K2 by default).
//
// Public surface:
//   - bootstrapClaude(sb, openrouterKey, model?) -> ensures claude+fcc installed and proxy running
//   - runClaudeStream(sb, prompt, opts) -> async iterator of normalized events

import type { Sandbox } from "npm:@e2b/code-interpreter@1.2.0";

export const SANDBOX_APP_DIR = "/home/user/app";
export const DEFAULT_CODING_MODEL = "open_router/moonshotai/kimi-k2-0905";

const BOOTSTRAP_FLAG = "/tmp/.claude-bootstrapped";

function bootstrapScript(openrouterKey: string, model: string): string {
  // Install Claude Code (npm global), install free-claude-code (pip user),
  // then start fcc-server as a background daemon if not already running.
  // Idempotent: subsequent calls finish in <1s.
  return `#!/usr/bin/env bash
set -eu
mkdir -p /tmp /home/user/app

# Persisted between calls within the same sandbox
if [ -f ${BOOTSTRAP_FLAG} ] && pgrep -f "fcc-server" >/dev/null 2>&1; then
  echo "already_bootstrapped"
  exit 0
fi

# 1) Claude Code CLI (Node) ---------------------------------------------------
if ! command -v claude >/dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code >/tmp/claude-install.log 2>&1 \
    || { echo "claude_install_failed"; tail -n 30 /tmp/claude-install.log; exit 1; }
fi

# 2) free-claude-code proxy (Python) -----------------------------------------
if ! command -v fcc-server >/dev/null 2>&1; then
  # Prefer pipx-style isolation via uv; fall back to pip
  if command -v pip >/dev/null 2>&1; then
    pip install --quiet --break-system-packages --user free-claude-code >/tmp/fcc-install.log 2>&1 || \
    pip install --quiet --user free-claude-code >>/tmp/fcc-install.log 2>&1 || \
    { echo "fcc_install_failed"; tail -n 30 /tmp/fcc-install.log; exit 1; }
    export PATH="$HOME/.local/bin:$PATH"
  else
    echo "no_pip_available"; exit 1
  fi
fi
export PATH="$HOME/.local/bin:$PATH"

# 3) Launch fcc-server with OpenRouter routing -------------------------------
export OPENROUTER_API_KEY="${openrouterKey.replace(/"/g, '\\"')}"
export MODEL="${model}"
export MODEL_OPUS="${model}"
export MODEL_SONNET="${model}"
export MODEL_HAIKU="${model}"
export PORT="8082"
export HOST="127.0.0.1"

nohup fcc-server > /tmp/fcc.log 2>&1 &
disown || true

# Wait for the proxy to come up (max ~20s)
for i in $(seq 1 40); do
  if curl -fsS -o /dev/null http://127.0.0.1:8082/ 2>/dev/null \
     || grep -q "Uvicorn running" /tmp/fcc.log 2>/dev/null; then
    touch ${BOOTSTRAP_FLAG}
    echo "bootstrap_ready"
    exit 0
  fi
  sleep 0.5
done

echo "fcc_not_ready"
tail -n 40 /tmp/fcc.log || true
exit 1
`;
}

export async function bootstrapClaude(
  sb: Sandbox,
  openrouterKey: string,
  model = DEFAULT_CODING_MODEL,
): Promise<{ ok: boolean; log: string }> {
  if (!openrouterKey) return { ok: false, log: "openrouter_key_missing" };
  const script = bootstrapScript(openrouterKey, model);
  await sb.files.write("/tmp/bootstrap_claude.sh", script);
  await sb.commands.run("chmod +x /tmp/bootstrap_claude.sh");
  const res = await sb.commands.run("bash /tmp/bootstrap_claude.sh", { timeoutMs: 180_000 });
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  return { ok: (res.exitCode ?? 0) === 0, log: out.slice(-2000) };
}

// ─── Normalized event types yielded by runClaudeStream ───
export type ClaudeEvent =
  | { type: "text"; delta: string }
  | { type: "step"; text: string }
  | { type: "file"; action: "create" | "update" | "delete" | "rename"; path: string; to?: string }
  | { type: "tool_use"; name: string; input?: unknown }
  | { type: "tool_result"; name: string; ok: boolean; preview?: string }
  | { type: "warn"; text: string }
  | { type: "error"; message: string }
  | { type: "done"; usage?: unknown };

interface ClaudeEdit { file?: string; oldString?: string; newString?: string; }

// Convert a single Claude Code stream-json line into one or more normalized events.
function translateLine(line: string): ClaudeEvent[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  let evt: any;
  try { evt = JSON.parse(trimmed); } catch { return []; }

  const out: ClaudeEvent[] = [];
  const t = evt.type;
  if (t === "system") {
    if (evt.subtype === "init") out.push({ type: "step", text: "init: Claude Code جاهز" });
    return out;
  }
  if (t === "assistant" && evt.message?.content) {
    for (const block of evt.message.content as any[]) {
      if (block.type === "text" && typeof block.text === "string") {
        out.push({ type: "text", delta: block.text });
      } else if (block.type === "tool_use") {
        const name = String(block.name ?? "tool");
        out.push({ type: "tool_use", name, input: block.input });
        out.push({ type: "step", text: `tool:${name}` });
        // Synthesize file events for known editor tools
        const input = block.input as Record<string, unknown> | undefined;
        const file = (input?.file_path ?? input?.path) as string | undefined;
        if (file) {
          if (name === "Write" || name === "create_file") {
            out.push({ type: "file", action: "create", path: file });
          } else if (name === "Edit" || name === "MultiEdit" || name === "str_replace") {
            out.push({ type: "file", action: "update", path: file });
          } else if (name === "Move" || name === "rename") {
            const to = (input?.new_path ?? input?.to) as string | undefined;
            out.push({ type: "file", action: "rename", path: file, to });
          } else if (name === "Delete" || name === "delete_file") {
            out.push({ type: "file", action: "delete", path: file });
          }
        }
      }
    }
    return out;
  }
  if (t === "user" && evt.message?.content) {
    // Tool results come back as user messages with tool_result blocks
    for (const block of evt.message.content as any[]) {
      if (block.type === "tool_result") {
        const isErr = !!block.is_error;
        const preview = typeof block.content === "string"
          ? block.content.slice(0, 160)
          : Array.isArray(block.content)
            ? (block.content[0]?.text ?? "").toString().slice(0, 160)
            : "";
        out.push({ type: "tool_result", name: "tool", ok: !isErr, preview });
      }
    }
    return out;
  }
  if (t === "result") {
    if (evt.is_error || evt.subtype === "error_max_turns" || evt.subtype === "error_during_execution") {
      out.push({ type: "warn", text: `انتهى Claude: ${evt.subtype ?? "error"}` });
    }
    out.push({ type: "done", usage: evt.usage });
    return out;
  }
  return out;
}

export interface RunClaudeOptions {
  cwd?: string;
  maxTurns?: number;
  timeoutMs?: number;
  resumeSessionId?: string;
}

/**
 * Runs `claude -p <prompt>` inside the sandbox and yields normalized events.
 * The proxy must already be running (call bootstrapClaude first).
 */
export async function* runClaudeStream(
  sb: Sandbox,
  prompt: string,
  opts: RunClaudeOptions = {},
): AsyncGenerator<ClaudeEvent, void, unknown> {
  const cwd = opts.cwd ?? SANDBOX_APP_DIR;
  const maxTurns = opts.maxTurns ?? 50;
  const timeoutMs = opts.timeoutMs ?? 15 * 60_000;

  // Write the prompt to a temp file so we don't fight shell-escaping with long Arabic text.
  const promptPath = `/tmp/claude_prompt_${Date.now()}.txt`;
  await sb.files.write(promptPath, prompt);

  const resumeFlag = opts.resumeSessionId ? `--resume ${JSON.stringify(opts.resumeSessionId)}` : "";
  const cmd = [
    `export PATH="$HOME/.local/bin:$PATH"`,
    `export ANTHROPIC_BASE_URL="http://127.0.0.1:8082"`,
    `export ANTHROPIC_AUTH_TOKEN="fcc-local-dummy"`,
    `export CLAUDE_CODE_AUTO_COMPACT_WINDOW="190000"`,
    `cd ${JSON.stringify(cwd)}`,
    // Pipe prompt via stdin to avoid arg-length and quoting issues.
    `cat ${JSON.stringify(promptPath)} | claude -p` +
      ` --output-format stream-json --verbose` +
      ` --permission-mode acceptEdits` +
      ` --add-dir ${JSON.stringify(cwd)}` +
      ` --max-turns ${maxTurns} ${resumeFlag}`,
  ].join(" && ");

  // Stream stdout chunk-by-chunk; parse line-by-line.
  let buffer = "";
  let sawAnyEvent = false;
  const proc = await sb.commands.run(cmd, {
    timeoutMs,
    onStdout: (chunk: string) => {
      buffer += chunk;
    },
    onStderr: (_chunk: string) => { /* surfaced via final exit if non-zero */ },
  } as any);

  // After process exits, parse the full buffered output.
  for (const line of buffer.split(/\r?\n/)) {
    const events = translateLine(line);
    for (const e of events) {
      sawAnyEvent = true;
      yield e;
    }
  }

  if ((proc.exitCode ?? 0) !== 0 && !sawAnyEvent) {
    yield { type: "error", message: `claude_exit_${proc.exitCode}: ${(proc.stderr ?? "").slice(-400)}` };
    yield { type: "done" };
  } else if (!sawAnyEvent) {
    yield { type: "done" };
  }
}

/**
 * Lists files changed inside the sandbox app directory since a timestamp.
 * Used to sync edits back to Supabase storage after a Claude run.
 */
export async function listChangedFiles(
  sb: Sandbox,
  sinceUnixSeconds: number,
  cwd = SANDBOX_APP_DIR,
): Promise<string[]> {
  const since = Math.max(0, Math.floor(sinceUnixSeconds));
  const cmd = `cd ${JSON.stringify(cwd)} && find . \\
    -path ./node_modules -prune -o \\
    -path ./.git -prune -o \\
    -path ./dist -prune -o \\
    -path ./.next -prune -o \\
    -type f -newermt "@${since}" -print 2>/dev/null | head -n 200`;
  const res = await sb.commands.run(cmd, { timeoutMs: 15_000 });
  return (res.stdout ?? "")
    .split("\n")
    .map((s) => s.trim().replace(/^\.\//, ""))
    .filter(Boolean);
}
