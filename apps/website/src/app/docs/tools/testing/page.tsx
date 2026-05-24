import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Plugin Testing Helpers</h1>
      <p className="lead">
        Utilities for writing tests against OpenVesper plugins without running
        a real LLM or gateway.
      </p>

      <h2>Importing</h2>
      <pre><code>{`import {
  mockRuntime,
  expectTool,
  mockFetch,
} from "@openvesper/plugin-sdk/testing";`}</code></pre>

      <h2>mockRuntime()</h2>
      <pre><code>{`import myPlugin from "../src/index.js";

test("crypto_price returns BTC price", async () => {
  const runtime = mockRuntime();
  runtime.registerPlugin(myPlugin);

  const result = await runtime.callTool("crypto_price", { symbol: "BTC" });
  expectTool(result).toSucceed().toReturnData((d: any) => typeof d.price === "number");
  expect(runtime.getCallCount("crypto_price")).toBe(1);
});`}</code></pre>

      <h2>expectTool() assertions</h2>
      <pre><code>{`expectTool(result)
  .toSucceed()
  .toReturnData((d: any) => d.score > 50)
  .toHaveDataMatching({ status: "active" });

expectTool(badResult)
  .toFail()
  .toFailWith(/rate limit/i);`}</code></pre>

      <h2>mockFetch() — intercept HTTP</h2>
      <pre><code>{`const restore = mockFetch(async (url) => {
  if (url.includes("api.coingecko.com")) {
    return { ok: true, json: async () => ({ bitcoin: { usd: 100000 } }) };
  }
  return { ok: false, status: 404 };
});

// ... run tests ...

restore();`}</code></pre>

      <h2>withEnv() — scoped env vars</h2>
      <pre><code>{`await runtime.withEnv({ HELIUS_API_KEY: "test" }, async () => {
  const result = await runtime.callTool("solana_balance", { address });
  expectTool(result).toSucceed();
});`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/tools/plugin-sdk">Plugin SDK</Link></li>
      </ul>
    </div>
  );
}
