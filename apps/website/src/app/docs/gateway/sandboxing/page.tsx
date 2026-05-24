import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Sandboxing</h1>
      <p className="lead">
        How OpenVesper bounds what tools can do. Especially relevant for the
        <code>filesystem</code> and <code>shell</code> plugins, which by
        design can touch your system.
      </p>

      <h2>Filesystem sandbox</h2>
      <p>
        The <code>filesystem</code> plugin uses a <code>safePath()</code>{" "}
        helper that resolves every requested path and ensures it stays
        within the configured workspace boundary.
      </p>

      <p>What gets rejected:</p>
      <ul>
        <li>Paths with <code>..</code> traversal that would escape the workspace</li>
        <li>Symlinks pointing outside the workspace</li>
        <li>Absolute paths to system directories (<code>/etc</code>, <code>/root</code>, <code>~/.ssh</code>)</li>
      </ul>

      <p>
        By default, the workspace boundary is the current working directory
        when you ran the CLI. Configure with <code>OPENVESPER_WORKSPACE</code>{" "}
        in your env if you want to scope differently.
      </p>

      <h2>Shell sandbox</h2>
      <p>
        The <code>shell</code> plugin blocks dangerous command patterns
        before passing anything to a child process:
      </p>

      <ul>
        <li><code>rm -rf /</code>, <code>rm -rf ~</code>, and variants</li>
        <li>Fork bombs (<code>:(){`{ :|:& };:`}</code>)</li>
        <li><code>mkfs.*</code> filesystem formatting</li>
        <li><code>dd if=/dev/...</code> raw disk writes</li>
        <li><code>shutdown</code>, <code>reboot</code>, <code>halt</code></li>
        <li>Network bind on privileged ports without sudo context</li>
      </ul>

      <p>
        Every shell call also runs with a 30-second timeout by default.
        Override with the tool's <code>timeout_ms</code> input.
      </p>

      <h2>Permission flags on tools</h2>
      <p>Every tool declares what it needs:</p>

      <table>
        <thead><tr><th>Permission</th><th>Auto-allow?</th><th>Behavior</th></tr></thead>
        <tbody>
          <tr><td><em>(unset)</em></td><td>Yes</td><td>Pure / read-only computation</td></tr>
          <tr><td><code>external</code></td><td>Yes</td><td>Calls an external HTTP API</td></tr>
          <tr><td><code>filesystem</code></td><td>Yes (sandboxed)</td><td>File reads/writes, bounded by safePath</td></tr>
          <tr><td><code>shell</code></td><td>Yes (sandboxed)</td><td>Shell commands, blocked patterns rejected</td></tr>
          <tr><td><code>mutation</code></td><td>Prompts in interactive mode</td><td>Side effects: send, transfer, post</td></tr>
        </tbody>
      </table>

      <h2>Network restrictions</h2>
      <p>
        OpenVesper does not enforce network egress restrictions at the
        framework level. Tools call the APIs they're designed to call.
        If you want to restrict outbound traffic, run OpenVesper in a
        container or VM with a firewall.
      </p>

      <h2>Memory and conversation isolation</h2>
      <p>
        Each agent has its own memory and conversation state. An agent's
        memory file is not readable by another agent at runtime — the
        runtime loads only the active agent's <code>MEMORY.md</code>.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/gateway/security">Full security policy</Link></li>
        <li><Link href="/docs/gateway/configuration">Configuration reference</Link></li>
      </ul>
    </div>
  );
}
