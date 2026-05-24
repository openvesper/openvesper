import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Commitments</h1>
      <p className="lead">
        When the agent says <em>"I'll check this in an hour"</em>, that's a
        commitment. OpenVesper tracks them so the agent doesn't forget its own
        promises across sessions.
      </p>

      <h2>Two kinds</h2>
      <ul>
        <li>
          <strong>explicit</strong> — user explicitly asked agent to remember
          ("remind me to check $XYZ in 2 hours")
        </li>
        <li>
          <strong>inferred</strong> — pattern-matched from agent's reply ("I'll
          let you know when..." → automatic commitment record)
        </li>
      </ul>

      <h2>Inferred patterns</h2>
      <p>The system auto-detects these phrases as commitments:</p>
      <ul>
        <li>"I'll let you know..."</li>
        <li>"I'll get back to you..."</li>
        <li>"I'll check..."</li>
        <li>"I'll remind..."</li>
        <li>"I'll follow up..."</li>
        <li>"I'll update you..."</li>
        <li>"Give me N minutes/hours and I'll..."</li>
        <li>"Check back in N hours..."</li>
      </ul>
      <p>It also extracts time mentions ("in 2 hours", "tomorrow", "next week") to populate <code>dueAt</code>.</p>

      <h2>Auto-inclusion in context</h2>
      <p>
        Open commitments are auto-injected into the system prompt at priority
        30, so the agent sees its own outstanding promises on every turn:
      </p>
      <pre><code>{`## Your open commitments to this user

You previously made these promises. Stay aware of them:
- "I'll check the BAGS price in an hour" (due 14:30:00)
- "I'll remind you about the airdrop deadline" (due 2026-05-25)`}</code></pre>

      <h2>API</h2>
      <pre><code>{`GET    /commitments?sessionKey=user-123&status=open
POST   /commitments                  (manual create)
POST   /commitments/:id/fulfill
POST   /commitments/:id/cancel`}</code></pre>

      <h2>Storage</h2>
      <p>
        <code>~/.openvesper/commitments.json</code> (mode 0600).
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/commitments.ts</code></p>
    </div>
  );
}
