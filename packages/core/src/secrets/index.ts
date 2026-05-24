// ============================================================
// 🌒 Secrets manager — opt-in OS keychain integration
// ============================================================
//
// By default OpenVesper reads API keys from .env files (mode 0600).
// For users who prefer keys in their OS keychain:
//   - macOS:  Keychain (via `security` CLI)
//   - Linux:  Secret Service (via `secret-tool`, libsecret)
//   - Linux:  KWallet (kwalletcli) — fallback
//   - 1Password CLI — `op read` for entries
//
// Usage in code:
//
//   import { getSecret } from "@openvesper/core/secrets";
//   const key = await getSecret("ANTHROPIC_API_KEY") || process.env.ANTHROPIC_API_KEY;
//
// CLI:
//   vesper secret set ANTHROPIC_API_KEY
//   vesper secret get ANTHROPIC_API_KEY
//   vesper secret rm ANTHROPIC_API_KEY
//   vesper secret list
//
// All operations shell out to the platform tool. No long-running
// daemon process holds keys in memory beyond what the LLM call needs.
// ============================================================

import { spawnSync } from "node:child_process";

export type SecretBackend = "macos-keychain" | "secret-tool" | "kwallet" | "op" | "none";

const SERVICE_NAME = "openvesper";

/**
 * Detect which secrets backend is available on this system.
 * Returns "none" if no supported tool is found (caller should fall back
 * to .env / process.env).
 */
export function detectBackend(): SecretBackend {
  if (process.platform === "darwin") {
    if (which("security")) return "macos-keychain";
  }
  if (process.platform === "linux") {
    if (which("secret-tool")) return "secret-tool";
    if (which("kwalletcli")) return "kwallet";
  }
  // Cross-platform: 1Password CLI
  if (which("op")) return "op";
  return "none";
}

function which(cmd: string): boolean {
  const result = spawnSync(
    process.platform === "win32" ? "where" : "which",
    [cmd],
    { stdio: "ignore" }
  );
  return result.status === 0;
}

/**
 * Get a secret by name. Returns null if not stored or no backend available.
 */
export async function getSecret(name: string): Promise<string | null> {
  const backend = detectBackend();
  switch (backend) {
    case "macos-keychain":
      return getFromMacOS(name);
    case "secret-tool":
      return getFromSecretTool(name);
    case "kwallet":
      return getFromKwallet(name);
    case "op":
      return getFromOnePassword(name);
    default:
      return null;
  }
}

/**
 * Store a secret. Returns true on success.
 */
export async function setSecret(name: string, value: string): Promise<boolean> {
  const backend = detectBackend();
  switch (backend) {
    case "macos-keychain":
      return setOnMacOS(name, value);
    case "secret-tool":
      return setOnSecretTool(name, value);
    case "kwallet":
      return setOnKwallet(name, value);
    case "op":
      throw new Error(
        "1Password CLI does not support write from this tool. Add the secret in 1Password UI."
      );
    default:
      throw new Error("No supported secrets backend found. Install 'secret-tool' (libsecret) or use .env files.");
  }
}

/**
 * Delete a stored secret.
 */
export async function deleteSecret(name: string): Promise<boolean> {
  const backend = detectBackend();
  switch (backend) {
    case "macos-keychain": {
      const r = spawnSync("security", [
        "delete-generic-password",
        "-a", process.env.USER || "openvesper",
        "-s", `${SERVICE_NAME}.${name}`,
      ], { stdio: "pipe" });
      return r.status === 0;
    }
    case "secret-tool": {
      const r = spawnSync("secret-tool", [
        "clear",
        "service", SERVICE_NAME,
        "key", name,
      ], { stdio: "pipe" });
      return r.status === 0;
    }
    case "kwallet": {
      const r = spawnSync("kwalletcli", [
        "-f", SERVICE_NAME,
        "-e", name,
        "-d",
      ], { stdio: "pipe" });
      return r.status === 0;
    }
    default:
      return false;
  }
}

// ── macOS Keychain ─────────────────────────────────────────────────

function getFromMacOS(name: string): string | null {
  const r = spawnSync(
    "security",
    [
      "find-generic-password",
      "-a", process.env.USER || "openvesper",
      "-s", `${SERVICE_NAME}.${name}`,
      "-w",
    ],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
  );
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

function setOnMacOS(name: string, value: string): boolean {
  // Delete first (no-op if missing), then add
  spawnSync("security", [
    "delete-generic-password",
    "-a", process.env.USER || "openvesper",
    "-s", `${SERVICE_NAME}.${name}`,
  ], { stdio: "ignore" });

  const r = spawnSync("security", [
    "add-generic-password",
    "-a", process.env.USER || "openvesper",
    "-s", `${SERVICE_NAME}.${name}`,
    "-w", value,
  ], { stdio: "pipe" });
  return r.status === 0;
}

// ── Linux: secret-tool (libsecret) ─────────────────────────────────

function getFromSecretTool(name: string): string | null {
  const r = spawnSync(
    "secret-tool",
    ["lookup", "service", SERVICE_NAME, "key", name],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
  );
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

function setOnSecretTool(name: string, value: string): boolean {
  const r = spawnSync(
    "secret-tool",
    ["store", "--label", `OpenVesper: ${name}`, "service", SERVICE_NAME, "key", name],
    { input: value, encoding: "utf-8", stdio: ["pipe", "ignore", "pipe"] }
  );
  return r.status === 0;
}

// ── Linux: KWallet (fallback) ──────────────────────────────────────

function getFromKwallet(name: string): string | null {
  const r = spawnSync(
    "kwalletcli",
    ["-f", SERVICE_NAME, "-e", name],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
  );
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

function setOnKwallet(name: string, value: string): boolean {
  const r = spawnSync(
    "kwalletcli",
    ["-f", SERVICE_NAME, "-e", name, "-q"],
    { input: value, encoding: "utf-8", stdio: ["pipe", "ignore", "pipe"] }
  );
  return r.status === 0;
}

// ── 1Password CLI ──────────────────────────────────────────────────

function getFromOnePassword(name: string): string | null {
  // Expects a 1Password entry titled "OpenVesper" with fields matching env names
  const r = spawnSync(
    "op",
    ["read", `op://Private/OpenVesper/${name}`],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
  );
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

/**
 * List secret names we've stored. Best-effort: macOS lacks a clean API to
 * list per-service, so this returns null on macOS and on backends without
 * native list support. CLI should fall back to "set" or per-env lookup.
 */
export async function listSecrets(): Promise<string[] | null> {
  const backend = detectBackend();
  if (backend === "secret-tool") {
    const r = spawnSync(
      "secret-tool",
      ["search", "--all", "--unlock", "service", SERVICE_NAME],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
    );
    if (r.status !== 0) return [];
    // Output has lines like "attribute.key = ANTHROPIC_API_KEY"
    const keys = new Set<string>();
    for (const line of r.stdout.split("\n")) {
      const m = line.match(/^attribute\.key\s*=\s*(.+)$/);
      if (m) keys.add(m[1].trim());
    }
    return [...keys].sort();
  }
  return null;
}
