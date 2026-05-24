// ============================================================
// 🌒 Plugin hot-reload — opt-in development mode
// ============================================================
//
// When OPENVESPER_DEV=1 is set, the gateway watches the plugins directory
// and emits a warning to the operator when a plugin source file changes.
// Node ESM caches imports, so true hot-reload requires restarting the
// gateway — but the warning is the prompt: "rebuild + restart".
//
// We intentionally don't auto-restart. Restarting a process that may have
// active streaming requests, long-running tasks, or open OAuth flows
// without operator awareness is the wrong default. The watcher tells you
// "something changed, manual reload needed."
//
// Uses fs.watch with recursive: true (Node 20+ on Linux/macOS; falls back
// to per-directory watchers elsewhere).
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

interface WatcherOptions {
  /** Directories to watch for plugin source changes */
  paths: string[];
  /** Called when a relevant file changes */
  onChange?: (changedPath: string) => void;
  /** File extensions to react to (default: .ts, .js, .json, .md) */
  extensions?: string[];
  /** Debounce interval for clustered events (default: 500ms) */
  debounceMs?: number;
}

export class PluginWatcher {
  private watchers: fs.FSWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private opts: Required<WatcherOptions>;

  constructor(opts: WatcherOptions) {
    this.opts = {
      paths: opts.paths,
      onChange: opts.onChange ?? (() => undefined),
      extensions: opts.extensions ?? [".ts", ".js", ".json", ".md"],
      debounceMs: opts.debounceMs ?? 500,
    };
  }

  start(): void {
    for (const p of this.opts.paths) {
      if (!fs.existsSync(p)) continue;
      try {
        const watcher = fs.watch(
          p,
          { recursive: true },
          (event, filename) => this.handleChange(p, filename ?? "")
        );
        this.watchers.push(watcher);
      } catch (err) {
        // Some filesystems don't support recursive watching
        console.warn(
          `[plugin-watcher] Cannot watch ${p}: ${err instanceof Error ? err.message : err}`
        );
      }
    }
  }

  stop(): void {
    for (const w of this.watchers) w.close();
    this.watchers = [];
    for (const t of this.debounceTimers.values()) clearTimeout(t);
    this.debounceTimers.clear();
  }

  private handleChange(rootPath: string, filename: string): void {
    if (!filename) return;
    const ext = path.extname(filename);
    if (!this.opts.extensions.includes(ext)) return;
    // Skip dist, node_modules
    if (filename.includes("node_modules") || filename.includes("/dist/")) return;

    const fullPath = path.join(rootPath, filename);
    // Debounce per-file
    const existing = this.debounceTimers.get(fullPath);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.debounceTimers.delete(fullPath);
      this.opts.onChange(fullPath);
    }, this.opts.debounceMs);
    this.debounceTimers.set(fullPath, timer);
  }
}

/**
 * Convenience: install a watcher with sensible defaults for the gateway.
 * Watches:
 *   - <repo>/packages/plugins/
 *   - ~/.openvesper/plugins/
 *   - <cwd>/plugins/
 *   - <cwd>/.agents/ (agents are markdown but worth watching too)
 *
 * Only activates if OPENVESPER_DEV=1 environment variable is set.
 */
export function installDevWatcher(): PluginWatcher | null {
  if (process.env.OPENVESPER_DEV !== "1") return null;

  const candidates = [
    path.join(process.cwd(), "packages", "plugins"),
    path.join(process.cwd(), "plugins"),
    path.join(process.cwd(), ".agents"),
    path.join(os.homedir(), ".openvesper", "plugins"),
  ];
  const watchable = candidates.filter((p) => fs.existsSync(p));

  if (watchable.length === 0) {
    console.warn("[dev] No plugin directories to watch.");
    return null;
  }

  console.log("[dev] Plugin hot-reload watcher enabled");
  for (const p of watchable) console.log(`[dev]   watching ${p}`);

  const watcher = new PluginWatcher({
    paths: watchable,
    onChange: (changedPath) => {
      const rel = path.relative(process.cwd(), changedPath);
      console.log("");
      console.log(`[dev] 📂 Plugin source changed: ${rel}`);
      console.log("[dev]    Rebuild + restart gateway to pick up changes:");
      console.log("[dev]      pnpm -r build && vesper gateway stop && vesper gateway start -d");
      console.log("");
    },
  });
  watcher.start();
  return watcher;
}

/**
 * Skills-specific watcher. Skills are pure markdown — no rebuild needed,
 * the gateway just re-snapshots eligible skills on the next session.
 *
 * Enabled when `skills.load.watch: true` in config, OR when
 * OPENVESPER_DEV=1 is set (matches plugin watcher behavior).
 *
 * `onSkillChange` is called by the gateway to bump its skills snapshot.
 */
export function installSkillsWatcher(
  onSkillChange: (changedPath: string) => void,
  opts: { enabled?: boolean; debounceMs?: number } = {}
): PluginWatcher | null {
  const dev = process.env.OPENVESPER_DEV === "1";
  if (!opts.enabled && !dev) return null;

  const candidates = [
    path.join(process.cwd(), "skills"),
    path.join(process.cwd(), ".agents", "skills"),
    path.join(os.homedir(), ".agents", "skills"),
    path.join(os.homedir(), ".openvesper", "skills"),
  ];
  const watchable = candidates.filter((p) => fs.existsSync(p));

  if (watchable.length === 0) return null;

  console.log("[gateway] Skills watcher enabled");
  for (const p of watchable) console.log(`[gateway]   watching ${p}`);

  const watcher = new PluginWatcher({
    paths: watchable,
    extensions: [".md"],
    debounceMs: opts.debounceMs ?? 250,
    onChange: (changedPath) => {
      const rel = path.relative(process.cwd(), changedPath);
      console.log(`[gateway] 🌒 Skill changed: ${rel} — next session will see refreshed skills`);
      onSkillChange(changedPath);
    },
  });
  watcher.start();
  return watcher;
}
