import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Apply Patch Tool</h1>
      <p className="lead">
        Applies a unified diff (output of <code>git diff</code>) to local files.
        Mutation permission — gateway prompts for approval before execution.
      </p>

      <h2>Usage</h2>
      <pre><code>{`# Inside an agent conversation:
"Here's the diff to apply:
\`\`\`diff
--- a/src/server.ts
+++ b/src/server.ts
@@ -10,7 +10,7 @@
 export const PORT = 3000;
-export const HOST = '0.0.0.0';
+export const HOST = '127.0.0.1';
 ...
\`\`\`

Apply with apply_patch and dry_run first."`}</code></pre>

      <h2>Parameters</h2>
      <ul>
        <li><code>patch</code> (string, required) — unified diff content</li>
        <li><code>workdir</code> (string) — working dir, default <code>process.cwd()</code></li>
        <li><code>dry_run</code> (boolean) — preview only, don't write. Default <code>false</code>.</li>
      </ul>

      <h2>Output</h2>
      <pre><code>{`{
  "success": true,
  "data": {
    "dryRun": false,
    "filesAffected": 1,
    "applied": 1,
    "wouldApply": 0,
    "conflicts": 0,
    "results": [
      { "file": "src/server.ts", "status": "APPLIED", "hunks": 1 }
    ]
  }
}`}</code></pre>

      <h2>Conflict handling</h2>
      <p>
        If a context line doesn't match the current file content, the hunk is
        rejected with <code>status: "CONFLICT"</code>. The file is not modified.
      </p>

      <h2>Approval flow</h2>
      <p>
        Marked <code>permission: "mutation"</code>. By default the gateway
        prompts via <Link href="/docs/gateway/approvals">Approvals</Link>{" "}
        before writing. Auto-allow rules can opt out per-agent.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>packages/plugins/apply-patch/</code></p>
    </div>
  );
}
