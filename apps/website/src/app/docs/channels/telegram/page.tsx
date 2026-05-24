export default function Page() {
  return (
    <div>
      <h1>Telegram</h1>

      <h2>Setup</h2>
      <ol>
        <li>Create a bot with <a href="https://t.me/BotFather">@BotFather</a></li>
        <li>Get the token</li>
        <li>Set in your config:</li>
      </ol>

      <pre><code>{`{
  "channels": {
    "telegram": {
      "token": "1234:ABC...",
      "dmPolicy": "pairing",
      "allowFrom": ["@your_username"]
    }
  }
}`}</code></pre>

      <p>Restart the gateway: <code>vesper restart</code></p>

      <h2>Test</h2>
      <p>Send <code>/help</code> to your bot. You should get the welcome message.</p>

      <h2>DM Pairing</h2>
      <p>For security, unknown senders get a pairing code. Approve them:</p>
      <pre><code>{`vesper pairing approve telegram <code>`}</code></pre>

      <h2>Bot commands</h2>
      <ul>
        <li><code>/start</code> — Welcome</li>
        <li><code>/help</code> — Help</li>
        <li><code>/agent &lt;mode&gt;</code> — Switch agent</li>
        <li><code>/reset</code> — Clear conversation</li>
        <li><code>/status</code> — Bot status</li>
      </ul>
    </div>
  );
}
