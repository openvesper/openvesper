// ============================================================
// 🌒 vesper oauth <login|list|logout>
// ============================================================
//
// Manage OAuth tokens for plugins that need authorized API access.
//
//   vesper oauth login google --client-id <id> [--client-secret <s>]
//   vesper oauth list
//   vesper oauth logout <provider>
//
// PRIVACY: All tokens stored in ~/.openvesper/tokens/<provider>.json
// with file mode 0600. Never transmitted off your machine.

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const TOKENS_DIR = path.join(os.homedir(), ".openvesper", "tokens");

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};
function c(s: string, k: keyof typeof COLOR) {
  return `${COLOR[k]}${s}${COLOR.reset}`;
}

const BUILTIN_PROVIDERS = ["google", "github", "slack"];

interface LoginOpts {
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
}

export async function oauthLogin(provider: string, opts: LoginOpts): Promise<void> {
  if (!BUILTIN_PROVIDERS.includes(provider)) {
    console.error(c(`✗ Unknown provider: ${provider}`, "red"));
    console.error(`  Built-in: ${BUILTIN_PROVIDERS.join(", ")}`);
    process.exit(1);
  }
  if (!opts.clientId) {
    console.error(c("✗ --client-id required", "red"));
    console.error("  Register an OAuth app with the provider first, then pass its Client ID.");
    process.exit(1);
  }

  // Make sure gateway is running
  const gatewayPort = parseInt(process.env.OPENVESPER_GATEWAY_PORT || "18789", 10);
  const healthUrl = `http://127.0.0.1:${gatewayPort}/health`;

  try {
    const h = await fetch(healthUrl).then((r) => (r.ok ? r.json() : null));
    if (!h) throw new Error("not ok");
  } catch {
    console.error(c("✗ Gateway not running", "red"));
    console.error("  Start it first:  " + c("vesper gateway start -d", "cyan"));
    process.exit(1);
  }

  // Kick off OAuth flow via gateway
  console.log(c(`🌒 Starting OAuth flow for ${provider}...`, "cyan"));
  console.log("");

  const resp = await fetch(`http://127.0.0.1:${gatewayPort}/oauth/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      scopes: opts.scopes,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error(c(`✗ OAuth start failed: ${resp.status}`, "red"));
    console.error(body);
    process.exit(1);
  }

  const data = await resp.json();
  console.log(data.message);
  console.log("");
  console.log(c("Watch the gateway logs for the authorization URL:", "dim"));
  console.log(c(`  vesper gateway logs --lines 30`, "cyan"));
  console.log("");
  console.log(c("Then open that URL in a browser and complete the flow.", "dim"));
  console.log(c(`Tokens will be saved to: ${TOKENS_DIR}/${provider}.json`, "dim"));
}

export function oauthList(): void {
  if (!fs.existsSync(TOKENS_DIR)) {
    console.log(c("○ No OAuth tokens yet.", "yellow"));
    console.log("  Try:  " + c("vesper oauth login <provider> --client-id <id>", "cyan"));
    return;
  }

  const files = fs.readdirSync(TOKENS_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log(c("○ No OAuth tokens yet.", "yellow"));
    return;
  }

  console.log("");
  console.log(c("Authorized providers:", "bold"));
  for (const file of files) {
    const provider = file.replace(".json", "");
    try {
      const raw = fs.readFileSync(path.join(TOKENS_DIR, file), "utf-8");
      const t = JSON.parse(raw);
      const expires = t.expiresAt ? new Date(t.expiresAt).toLocaleString() : "no expiry";
      const refresh = t.refreshToken ? c("✓ refresh", "green") : c("· no refresh", "dim");
      console.log(`  ${c(provider, "cyan")}  ${c("expires: " + expires, "dim")}  ${refresh}`);
    } catch {
      console.log(`  ${c(provider, "cyan")}  ${c("(unparseable)", "red")}`);
    }
  }
  console.log("");
}

export function oauthLogout(provider: string): void {
  const filePath = path.join(TOKENS_DIR, `${provider}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(c(`○ Not authorized: ${provider}`, "yellow"));
    return;
  }
  fs.unlinkSync(filePath);
  console.log(c(`✓ Revoked: ${provider}`, "green"));
  console.log(c("  (token deleted locally — also revoke at the provider's console if needed)", "dim"));
}
