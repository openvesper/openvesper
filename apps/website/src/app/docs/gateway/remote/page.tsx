import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Remote Access</h1>
      <p className="lead">
        Gateway binds to <code>127.0.0.1</code> by default. For remote access
        (gateway on a VPS, CLI on your laptop), use a secure tunnel — never
        expose loopback bind to <code>0.0.0.0</code> directly.
      </p>

      <h2>Three recommended methods</h2>

      <h3>1. SSH tunnel (simplest)</h3>
      <pre><code>{`ssh -N -L 127.0.0.1:18789:127.0.0.1:18789 user@your-vps

# Now from your laptop:
curl http://127.0.0.1:18789/health
# → hits the gateway on your VPS`}</code></pre>
      <p>
        Add <code>-f</code> to background. Add to <code>~/.ssh/config</code>{" "}
        for stable reconnects.
      </p>

      <h3>2. Tailscale (recommended for multiple machines)</h3>
      <pre><code>{`# Install on both:
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# On the VPS, gateway already on 127.0.0.1:18789 — Tailscale
# exposes the machine on its tailnet IP (100.x.x.x).

# Set on the gateway machine:
OPENVESPER_GATEWAY_HOST=100.64.0.5 vesper gateway start
# (your tailnet IP)

# From laptop:
curl http://100.64.0.5:18789/health`}</code></pre>
      <p>End-to-end encrypted via WireGuard. Works through NAT.</p>

      <h3>3. Cloudflare Tunnel (for browser-side access)</h3>
      <pre><code>{`# On the VPS:
cloudflared tunnel --url http://127.0.0.1:18789

# Returns a https://xyz.trycloudflare.com URL
# Use it from anywhere (auth header recommended).`}</code></pre>

      <h2>Get tunnel commands via API</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/remote/instructions \\
  -d '{"host":"my-vps.example.com","user":"alice"}'
# → { host, options: [SSH, Tailscale, Cloudflare] }`}</code></pre>

      <h2>What we don't recommend</h2>
      <ul>
        <li>❌ <code>OPENVESPER_GATEWAY_HOST=0.0.0.0</code> on a public-IP VPS — exposes to the whole internet</li>
        <li>❌ Reverse proxy without auth — same problem</li>
        <li>❌ Cloudflare Tunnel without an Access policy if your agents have mutation tools</li>
      </ul>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/remote-gateway.ts</code></p>
    </div>
  );
}
