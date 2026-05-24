// ============================================================
// 🌒 OAuth Flow — Local PKCE-based OAuth for plugins
// ============================================================
//
// Some plugins (Gmail, Google Calendar, Slack, etc.) need OAuth tokens.
// This module runs the OAuth dance entirely on the user's machine:
//
//   1. Generate state + PKCE verifier
//   2. Open browser to provider's auth URL
//   3. Catch callback on a temporary local HTTP server
//   4. Exchange code for tokens
//   5. Store tokens in ~/.openvesper/tokens/<provider>.json (mode 0600)
//
// PRIVACY: Tokens NEVER leave the user's machine. OpenVesper has no
// servers. The OAuth flow uses each provider's standard endpoints.

import http from "http";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { URL } from "url";

const TOKENS_DIR = path.join(os.homedir(), ".openvesper", "tokens");

export interface OAuthProvider {
  name: string;          // "google", "slack", "github", etc.
  authUrl: string;       // e.g. https://accounts.google.com/o/oauth2/v2/auth
  tokenUrl: string;      // e.g. https://oauth2.googleapis.com/token
  clientId: string;
  scopes: string[];
  /** Some providers (Google) also need a clientSecret for code exchange */
  clientSecret?: string;
  /** Use PKCE? (most modern providers support it) */
  usePKCE?: boolean;
}

export interface OAuthTokens {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  savedAt: number;
}

/** Built-in provider templates. User must supply their own clientId. */
export const BUILTIN_PROVIDERS: Record<string, Omit<OAuthProvider, "clientId" | "clientSecret">> = {
  google: {
    name: "google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/calendar",
    ],
    usePKCE: true,
  },
  github: {
    name: "github",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "user"],
    usePKCE: false,
  },
  slack: {
    name: "slack",
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["chat:write", "channels:read"],
    usePKCE: false,
  },
};

function genState(): string {
  return crypto.randomBytes(16).toString("hex");
}

function genPKCEVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function pkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

async function ensureTokensDir() {
  await fs.mkdir(TOKENS_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Run the full OAuth flow. Blocks until user completes auth in browser.
 * Returns the saved tokens.
 */
export async function runOAuthFlow(
  provider: OAuthProvider,
  options: { port?: number; openBrowser?: boolean } = {}
): Promise<OAuthTokens> {
  const port = options.port ?? 53174;
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const state = genState();
  const verifier = provider.usePKCE ? genPKCEVerifier() : null;
  const challenge = verifier ? pkceChallenge(verifier) : null;

  // Build auth URL
  const authUrl = new URL(provider.authUrl);
  authUrl.searchParams.set("client_id", provider.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", provider.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  if (challenge) {
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
  }
  if (provider.name === "google") {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
  }

  // Start temporary local HTTP server
  const codePromise = new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        if (!req.url) return;
        const url = new URL(req.url, redirectUri);
        if (url.pathname !== "/callback") {
          res.writeHead(404).end("not found");
          return;
        }
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" }).end(
            `<html><body><h2>OAuth error</h2><p>${error}</p><p>You can close this tab.</p></body></html>`
          );
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (returnedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html" }).end(
            `<html><body><h2>State mismatch</h2><p>Possible CSRF. Try again.</p></body></html>`
          );
          server.close();
          reject(new Error("OAuth state mismatch"));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" }).end(
            `<html><body><h2>No code returned</h2></body></html>`
          );
          server.close();
          reject(new Error("No OAuth code in callback"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" }).end(`
          <html><body style="font-family: system-ui; padding: 2rem;">
            <h2>🌒 OpenVesper</h2>
            <p>Authorization complete for <b>${provider.name}</b>. You can close this tab.</p>
          </body></html>
        `);
        server.close();
        resolve(code);
      } catch (err) {
        reject(err);
      }
    });

    server.listen(port, "127.0.0.1", () => {
      console.log(`[oauth] Listening on http://127.0.0.1:${port}/callback`);
      console.log(`[oauth] Open this URL in your browser:\n\n  ${authUrl.toString()}\n`);
    });

    // Timeout after 5 min
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth flow timed out (5 min). Try again."));
    }, 5 * 60 * 1000);
  });

  const code = await codePromise;

  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: provider.clientId,
  });
  if (provider.clientSecret) tokenParams.set("client_secret", provider.clientSecret);
  if (verifier) tokenParams.set("code_verifier", verifier);

  const tokenResp = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: tokenParams.toString(),
  });

  if (!tokenResp.ok) {
    const body = await tokenResp.text();
    throw new Error(`Token exchange failed: ${tokenResp.status} ${body}`);
  }

  const data = (await tokenResp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  const tokens: OAuthTokens = {
    provider: provider.name,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    scope: data.scope,
    savedAt: Date.now(),
  };

  await ensureTokensDir();
  const tokenPath = path.join(TOKENS_DIR, `${provider.name}.json`);
  await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });

  return tokens;
}

export async function loadTokens(providerName: string): Promise<OAuthTokens | null> {
  try {
    const raw = await fs.readFile(path.join(TOKENS_DIR, `${providerName}.json`), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function deleteTokens(providerName: string): Promise<boolean> {
  try {
    await fs.unlink(path.join(TOKENS_DIR, `${providerName}.json`));
    return true;
  } catch {
    return false;
  }
}

export async function listProviders(): Promise<string[]> {
  try {
    const files = await fs.readdir(TOKENS_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}
