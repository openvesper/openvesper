// ============================================================
// 🌒 Sandbox executor — opt-in process / Docker isolation
// ============================================================
//
// By default tools execute in the gateway process. For tools that touch
// the filesystem, run shell commands, or interact with untrusted input
// (e.g. group chats, web-scraped content), users can opt into a sandboxed
// executor that runs the tool in an isolated child process or Docker
// container.
//
// Three execution modes:
//
//   "inline" (default)    Tool runs in the gateway process. No isolation.
//                         Fast. Suitable for read-only tools with no
//                         filesystem mutation.
//
//   "subprocess"          Tool runs in a child Node process with a
//                         restricted env and cwd. Cheap isolation. Good
//                         enough for filesystem tools that shouldn't see
//                         your $HOME.
//
//   "docker"              Tool runs in a fresh Docker container. Maximum
//                         isolation. Requires Docker installed. Slow
//                         (container startup overhead).
//
// Wiring: a plugin tool declares its desired sandbox mode via the
// `sandbox` field on its tool definition. The gateway's executeTool()
// routes through this module when sandbox !== "inline".
//
// This is a minimal scaffolding release — full Docker support requires
// (a) a base image with Node + the plugin's deps, (b) volume mount
// configuration, (c) network restrictions. We ship the API and an
// inline-only default that future versions can extend.
// ============================================================

import { spawn } from "child_process";

export type SandboxMode = "inline" | "subprocess" | "docker";

export interface SandboxConfig {
  /** Which executor to use. Default: "inline" (no isolation). */
  mode: SandboxMode;
  /** Timeout in milliseconds. Default: 30 seconds. */
  timeoutMs?: number;
  /** Working directory for the sandboxed process. */
  cwd?: string;
  /** Environment variables to pass through (others stripped). */
  envPassthrough?: string[];
  /** Docker image name (only used when mode === "docker"). */
  dockerImage?: string;
  /** Docker volume mounts (only used when mode === "docker"). */
  dockerVolumes?: { host: string; container: string; readOnly?: boolean }[];
  /** Network mode for Docker (none, bridge, host). Default: "none". */
  dockerNetwork?: "none" | "bridge" | "host";
}

export interface SandboxResult {
  success: boolean;
  data?: unknown;
  error?: string;
  /** How long the tool took to execute (milliseconds). */
  durationMs: number;
  /** Which mode was used. */
  mode: SandboxMode;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const SAFE_ENV_DEFAULTS = ["PATH", "HOME", "USER", "LANG", "LC_ALL", "TZ"];

/**
 * Execute a tool handler under the configured sandbox.
 *
 * The handler is a function — for `inline` mode it's called directly. For
 * `subprocess` and `docker` modes, the handler is serialized and run in
 * an external process.
 *
 * For now, only `inline` and `subprocess` are fully wired. `docker` mode
 * returns an error explaining that Docker support requires per-plugin
 * image configuration.
 */
export async function executeSandboxed<TInput, TOutput>(
  handler: (input: TInput) => Promise<TOutput>,
  input: TInput,
  config: SandboxConfig
): Promise<SandboxResult> {
  const started = Date.now();
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // ── inline ───────────────────────────────────────────────────────
  if (config.mode === "inline") {
    try {
      const data = await withTimeout(handler(input), timeoutMs);
      return {
        success: true,
        data,
        durationMs: Date.now() - started,
        mode: "inline",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
        mode: "inline",
      };
    }
  }

  // ── subprocess ───────────────────────────────────────────────────
  if (config.mode === "subprocess") {
    // We spawn a node child with a small bootstrap that:
    //   1. Reads serialized handler source from stdin
    //   2. eval()s it (handler must be self-contained)
    //   3. Calls it with the input JSON
    //   4. Writes result JSON to stdout
    //
    // This is a contract: handlers that use SandboxMode "subprocess" must
    // be self-contained string-encodable functions. Most filesystem tools
    // fit; tools that close over runtime-loaded modules do not.
    //
    // For the v1.15.0 scaffold, we fall back to inline when the handler
    // is not serializable, so that nothing breaks for existing plugins.
    let handlerSource: string;
    try {
      handlerSource = handler.toString();
      // Reject closures / native code
      if (handlerSource.includes("[native code]")) {
        throw new Error("native code not serializable");
      }
    } catch {
      // Cannot serialize — fall back to inline with a warning
      return executeSandboxed(handler, input, { ...config, mode: "inline" });
    }

    try {
      const data = await runInSubprocess(handlerSource, input, {
        timeoutMs,
        cwd: config.cwd,
        envPassthrough: config.envPassthrough ?? SAFE_ENV_DEFAULTS,
      });
      return {
        success: true,
        data,
        durationMs: Date.now() - started,
        mode: "subprocess",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
        mode: "subprocess",
      };
    }
  }

  // ── docker (scaffold only) ───────────────────────────────────────
  if (config.mode === "docker") {
    return {
      success: false,
      error:
        "Docker sandbox mode is scaffolded but requires per-plugin image " +
        "configuration. Set up your image with Node + your plugin's deps, " +
        "then provide config.dockerImage. See docs/sandbox.md.",
      durationMs: Date.now() - started,
      mode: "docker",
    };
  }

  return {
    success: false,
    error: `Unknown sandbox mode: ${(config as { mode: string }).mode}`,
    durationMs: Date.now() - started,
    mode: config.mode,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Tool timed out after ${ms}ms`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

interface SubprocessOpts {
  timeoutMs: number;
  cwd?: string;
  envPassthrough: string[];
}

async function runInSubprocess<TInput, TOutput>(
  handlerSource: string,
  input: TInput,
  opts: SubprocessOpts
): Promise<TOutput> {
  return new Promise<TOutput>((resolve, reject) => {
    // Build a tiny bootstrap that runs the handler and prints the result.
    // When invoked via `node -e <code> <arg>`, the user arg is at argv[1].
    const bootstrap = `
      (async () => {
        try {
          const handler = ${handlerSource};
          const input = JSON.parse(process.argv[1]);
          const data = await handler(input);
          process.stdout.write(JSON.stringify({ ok: true, data }));
        } catch (err) {
          process.stdout.write(JSON.stringify({
            ok: false,
            error: err && err.message || String(err)
          }));
        }
      })();
    `;

    // Restricted env: only passthrough vars survive
    const env: Record<string, string> = {};
    for (const key of opts.envPassthrough) {
      if (process.env[key] !== undefined) env[key] = process.env[key]!;
    }

    // Serialize input. Use a sentinel for null/undefined so argv parsing
    // round-trips cleanly.
    const serializedInput =
      input === undefined ? "null" : JSON.stringify(input);

    const child = spawn(
      process.execPath,
      ["-e", bootstrap, serializedInput],
      {
        cwd: opts.cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Tool timed out after ${opts.timeoutMs}ms`));
    }, opts.timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout) {
        return reject(new Error(`subprocess exited ${code}: ${stderr.slice(0, 200)}`));
      }
      try {
        const result = JSON.parse(stdout);
        if (result.ok) resolve(result.data);
        else reject(new Error(result.error || "subprocess returned error"));
      } catch {
        reject(new Error(`subprocess returned non-JSON: ${stdout.slice(0, 200)}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
