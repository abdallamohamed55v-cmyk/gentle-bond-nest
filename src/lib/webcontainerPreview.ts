// Singleton WebContainer manager. Boots Node.js in the browser via WASM,
// mounts the project FS, runs `npm install && npm run dev`, and exposes
// a hot URL for an <iframe>.
//
// Why singleton: WebContainers only allows ONE instance per page.

import { WebContainer, type FileSystemTree } from "@webcontainer/api";

export type Stage = "idle" | "booting" | "mounting" | "installing" | "starting" | "ready" | "error";

interface FileRow { path: string; content: string }

type Listener = (state: { stage: Stage; url: string | null; log: string; error?: string }) => void;

class WebContainerPreviewManager {
  private instance: WebContainer | null = null;
  private bootPromise: Promise<WebContainer> | null = null;
  private currentProjectId: string | null = null;
  private currentUrl: string | null = null;
  private stage: Stage = "idle";
  private logBuf = "";
  private listeners = new Set<Listener>();
  private devProcess: { kill: () => void } | null = null;

  subscribe(l: Listener) {
    this.listeners.add(l);
    l({ stage: this.stage, url: this.currentUrl, log: this.logBuf });
    return () => this.listeners.delete(l);
  }

  private emit(patch: Partial<{ stage: Stage; url: string | null; error: string }> = {}) {
    if (patch.stage) this.stage = patch.stage;
    if (patch.url !== undefined) this.currentUrl = patch.url;
    const snap = { stage: this.stage, url: this.currentUrl, log: this.logBuf, error: patch.error };
    for (const l of this.listeners) l(snap);
  }

  private appendLog(s: string) {
    this.logBuf = (this.logBuf + s).slice(-20_000);
    this.emit();
  }

  private async boot(): Promise<WebContainer> {
    if (this.instance) return this.instance;
    if (this.bootPromise) return this.bootPromise;
    this.emit({ stage: "booting" });
    this.bootPromise = WebContainer.boot({ coep: "credentialless" }).then((wc) => {
      this.instance = wc;
      wc.on("server-ready", (_port, url) => {
        this.emit({ stage: "ready", url });
      });
      wc.on("error", ({ message }) => {
        this.appendLog(`\n[error] ${message}\n`);
        this.emit({ stage: "error", error: message });
      });
      return wc;
    });
    return this.bootPromise;
  }

  private filesToTree(files: FileRow[]): FileSystemTree {
    const root: any = {};
    for (const f of files) {
      const parts = f.path.replace(/^\.?\//, "").split("/").filter(Boolean);
      if (!parts.length) continue;
      let cur = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const name = parts[i];
        if (!cur[name]) cur[name] = { directory: {} };
        cur = cur[name].directory;
      }
      cur[parts[parts.length - 1]] = { file: { contents: f.content ?? "" } };
    }
    return root as FileSystemTree;
  }

  /** Boot, mount files, install deps, start dev server. Idempotent per projectId. */
  async start(projectId: string, files: FileRow[]) {
    const wc = await this.boot();

    if (this.currentProjectId !== projectId) {
      this.logBuf = "";
      this.currentUrl = null;
      this.devProcess?.kill();
      this.devProcess = null;
      this.currentProjectId = projectId;

      this.emit({ stage: "mounting", url: null });
      await wc.mount(this.filesToTree(files));

      // Detect package manager / start command
      const pkgFile = files.find((f) => f.path === "package.json" || f.path === "./package.json");
      let startCmd: [string, string[]] = ["npm", ["run", "dev"]];
      let installCmd: [string, string[]] = ["npm", ["install"]];
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile.content);
          const scripts = pkg.scripts || {};
          if (scripts.dev) startCmd = ["npm", ["run", "dev"]];
          else if (scripts.start) startCmd = ["npm", ["start"]];
          else startCmd = ["npx", ["--yes", "vite", "--host"]];
        } catch {}
      } else {
        // Static HTML — just serve the directory
        installCmd = ["npm", ["install", "--no-save", "serve"]];
        startCmd = ["npx", ["--yes", "serve", "-l", "3000", "."]];
      }

      this.emit({ stage: "installing" });
      const install = await wc.spawn(installCmd[0], installCmd[1]);
      install.output.pipeTo(new WritableStream({ write: (c) => this.appendLog(c) }));
      const installCode = await install.exit;
      if (installCode !== 0) {
        this.emit({ stage: "error", error: `install exited with ${installCode}` });
        return;
      }

      this.emit({ stage: "starting" });
      const dev = await wc.spawn(startCmd[0], startCmd[1]);
      dev.output.pipeTo(new WritableStream({ write: (c) => this.appendLog(c) }));
      this.devProcess = dev;
      // "server-ready" event sets stage=ready
    }
  }

  /** Live-update a single file inside the running container (HMR). */
  async writeFile(path: string, content: string) {
    if (!this.instance || !this.currentProjectId) return;
    const clean = path.replace(/^\.?\//, "");
    try {
      // Ensure parent dirs
      const parts = clean.split("/");
      if (parts.length > 1) {
        await this.instance.fs.mkdir(parts.slice(0, -1).join("/"), { recursive: true });
      }
      await this.instance.fs.writeFile(clean, content);
    } catch (e) {
      this.appendLog(`\n[writeFile ${clean}] ${(e as Error).message}\n`);
    }
  }

  getUrl() { return this.currentUrl; }
  getStage() { return this.stage; }
}

export const webcontainerPreview = new WebContainerPreviewManager();
