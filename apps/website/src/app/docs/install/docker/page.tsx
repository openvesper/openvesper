import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Docker</h1>
      <p className="lead">
        OpenVesper ships with a multi-stage <code>Dockerfile</code> and a{" "}
        <code>docker-compose.yml</code> for self-hosted deployments.
      </p>

      <h2>Quick start</h2>
      <pre><code>{`# Clone the repo
git clone https://github.com/openvesper/openvesper
cd openvesper

# Build the image
docker build -t openvesper:latest .

# Run with your config mounted in
docker run --rm \\
  -v ~/.openvesper:/root/.openvesper \\
  -e ANTHROPIC_API_KEY=sk-ant-... \\
  openvesper:latest \\
  node apps/cli/dist/index.js -q "test"`}</code></pre>

      <h2>docker-compose</h2>
      <p>
        The shipped <code>docker-compose.yml</code> sets up the CLI service
        with your config volume mounted. Edit it for your use case:
      </p>
      <pre><code>{`docker compose up -d`}</code></pre>

      <h2>What's in the image</h2>
      <ul>
        <li>Node.js 20 base</li>
        <li>All 47 plugins compiled to <code>dist/</code></li>
        <li>CLI binary at <code>apps/cli/dist/index.js</code></li>
        <li>Telegram bot at <code>apps/telegram-bot/dist/index.js</code></li>
      </ul>

      <h2>Image size</h2>
      <p>
        About 350 MB. The multi-stage build keeps build dependencies out of
        the runtime layer.
      </p>

      <h2>Persistent state</h2>
      <p>
        Mount <code>~/.openvesper</code> into the container so memory,
        configuration, and cron state survive container restarts:
      </p>
      <pre><code>{`docker run --rm \\
  -v ~/.openvesper:/root/.openvesper \\
  openvesper:latest \\
  node apps/cli/dist/index.js cron list`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/start/getting-started">Getting Started</Link> — non-Docker setup</li>
        <li><Link href="/docs/gateway/configuration">Configuration</Link> — env vars reference</li>
      </ul>
    </div>
  );
}
