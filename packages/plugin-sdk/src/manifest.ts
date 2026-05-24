// ============================================================
// 🌒 Plugin Manifest — Declarative plugin metadata
// ============================================================
//
// Every plugin can ship a `plugin.json` next to its `package.json`.
// Captures permissions, compatibility, tool exports — checked at install time.
//
// Example plugin.json:
//   {
//     "name": "telegram-channel",
//     "version": "1.0.0",
//     "description": "Telegram bot channel for OpenVesper",
//     "openvesperVersion": ">=1.7.0",
//     "permissions": ["external", "mutation"],
//     "exports": {
//       "tools": ["telegram_send", "telegram_reply"],
//       "agents": [],
//       "channels": ["telegram"]
//     },
//     "config": {
//       "TELEGRAM_BOT_TOKEN": { "required": true, "type": "string", "secret": true },
//       "TELEGRAM_ALLOWED_CHATS": { "required": false, "type": "string[]" }
//     }
//   }

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  /** Minimum compatible OpenVesper version (semver range) */
  openvesperVersion?: string;
  /** Declared permissions — surfaced to user at install time */
  permissions?: ("read" | "external" | "mutation" | "filesystem" | "shell")[];
  /** What this plugin exports */
  exports?: {
    tools?: string[];
    agents?: string[];
    channels?: string[];
    providers?: string[];
  };
  /** Required/optional config the user must provide */
  config?: Record<string, PluginConfigSpec>;
  /** Repository URL */
  repository?: string;
  /** Tags for discovery */
  tags?: string[];
}

export interface PluginConfigSpec {
  required: boolean;
  type: "string" | "number" | "boolean" | "string[]";
  description?: string;
  /** If true, value should be stored in secretStorage / env, not config.json */
  secret?: boolean;
  /** Default value if not provided */
  default?: unknown;
}

export class ManifestValidator {
  validate(m: unknown): { valid: boolean; errors: string[]; manifest?: PluginManifest } {
    const errors: string[] = [];
    if (!m || typeof m !== "object") {
      return { valid: false, errors: ["manifest must be an object"] };
    }
    const obj = m as Record<string, unknown>;
    if (!obj.name || typeof obj.name !== "string") errors.push("name required (string)");
    if (!obj.version || typeof obj.version !== "string") errors.push("version required (semver)");
    if (obj.openvesperVersion && typeof obj.openvesperVersion !== "string") {
      errors.push("openvesperVersion must be a semver range string");
    }
    if (obj.permissions && !Array.isArray(obj.permissions)) {
      errors.push("permissions must be an array");
    }
    if (obj.exports && typeof obj.exports !== "object") {
      errors.push("exports must be an object");
    }
    return { valid: errors.length === 0, errors, manifest: errors.length === 0 ? (obj as unknown as PluginManifest) : undefined };
  }

  /** Display a manifest to the user before they install */
  summarize(m: PluginManifest): string {
    const lines = [
      `📦 ${m.name} v${m.version}`,
      m.description ? `   ${m.description}` : "",
      m.author ? `   By ${m.author}` : "",
      "",
    ];

    if (m.permissions && m.permissions.length > 0) {
      lines.push("Requested permissions:");
      for (const p of m.permissions) {
        const explain: Record<string, string> = {
          read: "read-only data access",
          external: "make external API calls",
          mutation: "perform mutating actions (send messages, post, etc.)",
          filesystem: "read/write files (sandboxed)",
          shell: "run shell commands (sandboxed)",
        };
        lines.push(`  - ${p}: ${explain[p] || p}`);
      }
      lines.push("");
    }

    if (m.exports) {
      lines.push("Exports:");
      if (m.exports.tools?.length) lines.push(`  Tools:    ${m.exports.tools.join(", ")}`);
      if (m.exports.agents?.length) lines.push(`  Agents:   ${m.exports.agents.join(", ")}`);
      if (m.exports.channels?.length) lines.push(`  Channels: ${m.exports.channels.join(", ")}`);
      if (m.exports.providers?.length) lines.push(`  LLM:      ${m.exports.providers.join(", ")}`);
      lines.push("");
    }

    if (m.config) {
      const required = Object.entries(m.config).filter(([_, v]) => v.required);
      const optional = Object.entries(m.config).filter(([_, v]) => !v.required);
      if (required.length > 0) {
        lines.push("Required config (you'll be asked for these):");
        for (const [k, v] of required) {
          lines.push(`  - ${k} (${v.type}${v.secret ? ", secret" : ""}): ${v.description || ""}`);
        }
        lines.push("");
      }
      if (optional.length > 0) {
        lines.push("Optional config:");
        for (const [k, v] of optional) {
          lines.push(`  - ${k}: ${v.description || ""}`);
        }
        lines.push("");
      }
    }

    return lines.filter(Boolean).join("\n");
  }
}

export const manifestValidator = new ManifestValidator();
