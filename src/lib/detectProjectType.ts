// Detect whether a project can run inside WebContainers (browser Node)
// or needs the heavier E2B sandbox (Python, Rust, Go, native, etc).

export type ProjectRuntime = "webcontainer" | "e2b";

interface FileLike { path: string; content?: string }

const E2B_MARKERS = [
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "Cargo.toml",
  "go.mod",
  "Gemfile",
  "composer.json",
  "pom.xml",
  "build.gradle",
  "Dockerfile",
];

export function detectProjectRuntime(files: FileLike[]): ProjectRuntime {
  const paths = new Set(files.map((f) => f.path.replace(/^\.?\//, "")));
  for (const marker of E2B_MARKERS) if (paths.has(marker)) return "e2b";
  if (paths.has("package.json")) return "webcontainer";
  // Pure static HTML still works fine in WebContainers via a tiny server
  if (paths.has("index.html")) return "webcontainer";
  // Default to webcontainer — it boots fast; user can still hit "open in sandbox" if they need E2B
  return "webcontainer";
}
