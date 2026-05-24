// ============================================================
// 🌒 Remote Gateway Helpers
// ============================================================
//
// Gateway runs on 127.0.0.1 by default. For remote access (e.g. gateway
// on a VPS, CLI on your laptop), use a secure tunnel — we never advise
// binding 0.0.0.0 directly.
//
// This module prints the recommended tunnel commands for common setups.
//
// PRIVACY: Tunnels use end-to-end encryption (SSH/Tailscale/Cloudflare).
// Gateway still listens only on loopback inside the host.

export interface RemoteGatewayConfig {
  /** Hostname or IP of the remote machine */
  host: string;
  /** SSH user (if using SSH tunnel) */
  user?: string;
  /** SSH port */
  port?: number;
  /** Local port to bind tunnel to */
  localPort?: number;
  /** Remote gateway port */
  remotePort?: number;
}

export interface TunnelInstructions {
  method: string;
  command: string;
  notes: string[];
}

export function sshTunnelInstructions(cfg: RemoteGatewayConfig): TunnelInstructions {
  const user = cfg.user || "your-user";
  const port = cfg.port || 22;
  const local = cfg.localPort || 18789;
  const remote = cfg.remotePort || 18789;

  return {
    method: "SSH local port forward",
    command: `ssh -N -L 127.0.0.1:${local}:127.0.0.1:${remote} -p ${port} ${user}@${cfg.host}`,
    notes: [
      `Runs in foreground. Add -f to background it.`,
      `Gateway must be running on ${cfg.host}:${remote}.`,
      `Your local CLI can now hit http://127.0.0.1:${local} as if local.`,
      `Tip: add this as an ~/.ssh/config entry for easier reconnect.`,
    ],
  };
}

export function tailscaleInstructions(cfg: RemoteGatewayConfig): TunnelInstructions {
  const port = cfg.remotePort || 18789;
  return {
    method: "Tailscale (recommended)",
    command: `# Install tailscale on both machines:\n#   curl -fsSL https://tailscale.com/install.sh | sh\n# Then on the remote machine:\n#   sudo tailscale up\n# And from your laptop:\n#   curl http://${cfg.host}:${port}/health`,
    notes: [
      `Tailscale gives every machine a stable private IP.`,
      `Set OPENVESPER_GATEWAY_HOST=100.x.x.x (your remote's tailnet IP) in the gateway.`,
      `End-to-end encrypted via WireGuard.`,
      `Works through NAT — no firewall punching needed.`,
    ],
  };
}

export function cloudflareTunnelInstructions(cfg: RemoteGatewayConfig): TunnelInstructions {
  const port = cfg.remotePort || 18789;
  return {
    method: "Cloudflare Tunnel",
    command: `# On the remote machine:\ncloudflared tunnel --url http://127.0.0.1:${port}\n# Returns a https://xyz.trycloudflare.com URL you can hit from anywhere.`,
    notes: [
      `Free, no port-forwarding needed.`,
      `For persistent setup: cloudflared tunnel create + DNS record.`,
      `Gateway still bound to 127.0.0.1 on the remote — only Cloudflare can reach it.`,
    ],
  };
}

export function allTunnelOptions(cfg: RemoteGatewayConfig): TunnelInstructions[] {
  return [
    sshTunnelInstructions(cfg),
    tailscaleInstructions(cfg),
    cloudflareTunnelInstructions(cfg),
  ];
}
