export default function Page() {
  return (
    <div>
      <h1>Gateway Configuration</h1>
      <p>OpenVesper reads config from (priority order):</p>
      <ol>
        <li><code>./.openvesper.json</code> — project-specific overrides</li>
        <li><code>~/.openvesper/openvesper.json</code> — global user settings</li>
        <li><code>config/default.json</code> — built-in defaults</li>
      </ol>

      <h2>Minimal config</h2>
      <pre><code>{`{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  }
}`}</code></pre>

      <h2>Full schema</h2>
      <pre><code>{`{
  "agent": {
    "model": "<provider>/<model-id>",
    "temperature": 0.5,
    "max_tokens": 4096,
    "max_iterations": 20
  },
  "permissions": {
    "default": "ask",
    "rules": {
      "read": "allow_always",
      "external": "allow_always",
      "write": "ask",
      "execute": "ask",
      "trade": "ask"
    }
  },
  "memory": {
    "enabled": true,
    "workspace": "~/.openvesper/workspace"
  },
  "trading": {
    "dry_run": true,
    "max_position_usd": 1000
  }
}`}</code></pre>
    </div>
  );
}
