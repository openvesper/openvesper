import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Approvals</h1>
      <p className="lead">
        Manual confirmation queue for sensitive tool calls. When an agent wants
        to run a <code>mutation</code>-permission tool, the gateway can require
        your explicit OK before execution.
      </p>

      <h2>Flow</h2>
      <ol>
        <li>Agent invokes a tool marked <code>permission: "mutation"</code></li>
        <li>Gateway checks approval rules</li>
        <li>If <code>auto-allow</code> matches, tool runs immediately</li>
        <li>If <code>auto-deny</code> matches, tool fails</li>
        <li>Otherwise, gateway adds to pending queue</li>
        <li>You decide via <code>/approvals/:id/decide</code> (Telegram buttons, CLI prompt, etc.)</li>
        <li>Default timeout: 5 minutes → auto-deny</li>
      </ol>

      <h2>Pending queue</h2>
      <pre><code>{`curl http://127.0.0.1:18789/approvals/pending
# [
#   {
#     "id": "a_173...",
#     "sessionKey": "user-123",
#     "agent": "defi-strategist",
#     "channel": "telegram",
#     "toolName": "raydium_swap",
#     "toolInput": {"in":"USDC","out":"SOL","amount":100},
#     "permission": "mutation",
#     "createdAt": ...,
#     "expiresAt": ...
#   }
# ]`}</code></pre>

      <h2>Deciding</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/approvals/a_173.../decide \\
  -d '{"decision":"allow","decidedBy":"alice"}'

# Decision values:
#   "allow"               — run this call only
#   "deny"                — reject
#   "allow-and-remember"  — run + add auto-allow rule for future`}</code></pre>

      <h2>Rules</h2>
      <pre><code>{`# Auto-allow telegram_send for all agents
curl -X POST http://127.0.0.1:18789/approvals/rules \\
  -d '{
    "toolPattern": "telegram_send",
    "agent": "*",
    "policy": "auto-allow",
    "reason": "I trust this tool"
  }'

# Auto-deny anything matching raydium_*
curl -X POST http://127.0.0.1:18789/approvals/rules \\
  -d '{
    "toolPattern": "raydium_*",
    "agent": "*",
    "policy": "auto-deny",
    "reason": "no DEX swaps"
  }'`}</code></pre>

      <h2>Storage</h2>
      <p>
        Decisions: <code>~/.openvesper/approvals.json</code> (last 1000)<br/>
        Rules: <code>~/.openvesper/approval-rules.json</code><br/>
        Both mode 0600.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/approvals.ts</code></p>
    </div>
  );
}
