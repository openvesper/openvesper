// ============================================================
// 🌒 @openvesper/core — Webhook Manager
// ============================================================
// Webhooks let external services trigger agents.
// Example: GitHub PR opened → code-reviewer reviews it.
//
// PRIVACY: Webhook payloads are never sent to openvesper.com.
// They are processed locally and passed to the agent runtime.
// ============================================================

import * as crypto from "crypto";

export interface WebhookConfig {
  /**
   * URL path this webhook responds to.
   * Example: "/webhook/github" → POST to <gateway>/webhook/github
   */
  path: string;

  /**
   * Optional: name of env var containing the shared secret for
   * HMAC signature verification (e.g., GITHUB_WEBHOOK_SECRET).
   * Strongly recommended — without it, anyone who knows the URL
   * can trigger the agent.
   */
  secret_env?: string;

  /**
   * Header that contains the signature (e.g., x-hub-signature-256).
   */
  signature_header?: string;

  /**
   * Signature algorithm (default: sha256).
   */
  signature_algo?: "sha1" | "sha256";

  /**
   * Signature prefix (default: "sha256=").
   */
  signature_prefix?: string;

  /**
   * Agent mode to invoke.
   */
  agent: string;

  /**
   * Prompt template — supports {{event.path.to.field}} interpolation.
   * Example: "New PR opened: {{event.pull_request.title}}"
   */
  prompt_template: string;

  /**
   * Optional: filter — only trigger when this condition matches.
   * Example: { "action": "opened" } → only on PR opened events.
   */
  filter?: Record<string, string>;

  /**
   * Where to deliver the agent's response.
   * "telegram:@me" | "slack:#channel" | "none" | "log"
   */
  deliver_to?: string;

  enabled: boolean;
}

export interface WebhookEvent {
  path: string;
  headers: Record<string, string>;
  body: string;
  receivedAt: number;
}

export type WebhookHandler = (
  config: WebhookConfig,
  expandedPrompt: string,
  payload: any
) => Promise<{ success: boolean; output?: string; error?: string }>;

/**
 * Verify HMAC signature for a webhook payload.
 * Returns true if valid (or if no secret configured — which is permissive).
 */
export function verifyWebhookSignature(
  config: WebhookConfig,
  body: string,
  receivedSignature: string | undefined
): { valid: boolean; reason?: string } {
  if (!config.secret_env) {
    // No secret configured — accept all. We log a warning so users notice.
    return { valid: true, reason: "no-secret-configured" };
  }

  const secret = process.env[config.secret_env];
  if (!secret) {
    return { valid: false, reason: `env var ${config.secret_env} not set` };
  }

  if (!receivedSignature) {
    return { valid: false, reason: "no signature header" };
  }

  const algo = config.signature_algo || "sha256";
  const prefix = config.signature_prefix || `${algo}=`;
  const expected = prefix + crypto.createHmac(algo, secret).update(body).digest("hex");

  // Timing-safe comparison
  try {
    const a = Buffer.from(receivedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return { valid: false, reason: "signature length mismatch" };
    const valid = crypto.timingSafeEqual(a, b);
    return { valid, reason: valid ? undefined : "signature mismatch" };
  } catch {
    return { valid: false, reason: "signature comparison failed" };
  }
}

/**
 * Apply event filter: return true if the event passes all filter conditions.
 * Filter values use dot-notation paths into the parsed JSON payload.
 */
export function matchesFilter(payload: any, filter?: Record<string, string>): boolean {
  if (!filter) return true;
  for (const [pathExpr, expected] of Object.entries(filter)) {
    const actual = getByPath(payload, pathExpr);
    if (String(actual) !== expected) return false;
  }
  return true;
}

/**
 * Get a value from an object by dot path. Example: "pull_request.title"
 */
export function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/**
 * Expand prompt template by interpolating {{event.path}} expressions.
 */
export function expandWebhookPrompt(template: string, payload: any): string {
  return template.replace(/\{\{event\.([\w.]+)\}\}/g, (_match, pathExpr) => {
    const value = getByPath(payload, pathExpr);
    return value === undefined ? "" : String(value);
  });
}

// ────────────────────────────────────────────────────────────
// Webhook router
// ────────────────────────────────────────────────────────────

export class WebhookRouter {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private handler: WebhookHandler;
  private verbose: boolean;

  constructor(handler: WebhookHandler, verbose = false) {
    this.handler = handler;
    this.verbose = verbose;
  }

  /**
   * Register a webhook config under its path.
   */
  register(config: WebhookConfig): void {
    this.webhooks.set(config.path, config);
  }

  /**
   * Unregister a webhook.
   */
  unregister(path: string): boolean {
    return this.webhooks.delete(path);
  }

  /**
   * List all registered webhooks.
   */
  list(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Process an inbound webhook event.
   * Returns a result with HTTP-shaped status + body for the caller to serve.
   */
  async handle(event: WebhookEvent): Promise<{
    status: number;
    body: any;
  }> {
    const config = this.webhooks.get(event.path);
    if (!config) return { status: 404, body: { error: "webhook not registered" } };
    if (!config.enabled) return { status: 503, body: { error: "webhook disabled" } };

    // Verify signature
    const sigHeader = config.signature_header || "x-hub-signature-256";
    const receivedSig = event.headers[sigHeader.toLowerCase()];
    const { valid, reason } = verifyWebhookSignature(config, event.body, receivedSig);

    if (!valid) {
      if (this.verbose) {
        // eslint-disable-next-line no-console
        console.warn(`[webhook] rejected ${event.path}: ${reason}`);
      }
      return { status: 401, body: { error: `signature verification failed: ${reason}` } };
    }

    // Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return { status: 400, body: { error: "invalid JSON payload" } };
    }

    // Apply filter
    if (!matchesFilter(payload, config.filter)) {
      return { status: 200, body: { ok: true, filtered: true } };
    }

    // Expand prompt
    const expandedPrompt = expandWebhookPrompt(config.prompt_template, payload);

    if (this.verbose) {
      // eslint-disable-next-line no-console
      console.log(`[webhook] triggered ${event.path} → agent ${config.agent}`);
    }

    // Run agent (async — we don't block the webhook response)
    this.handler(config, expandedPrompt, payload).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[webhook] handler error for ${event.path}:`, err);
    });

    return { status: 202, body: { ok: true, accepted: true } };
  }
}
