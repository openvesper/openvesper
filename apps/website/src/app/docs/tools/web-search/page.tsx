import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Web Search Tool</h1>
      <p className="lead">
        Unified web search across 5 providers. Free DuckDuckGo by default; opt
        into Brave, Tavily, SerpApi, or self-hosted SearXNG with env vars.
      </p>

      <h2>Selecting provider</h2>
      <pre><code>{`# Default — no key needed
OPENVESPER_SEARCH_PROVIDER=duckduckgo

# Or:
OPENVESPER_SEARCH_PROVIDER=brave    BRAVE_SEARCH_API_KEY=...
OPENVESPER_SEARCH_PROVIDER=tavily   TAVILY_API_KEY=...
OPENVESPER_SEARCH_PROVIDER=serpapi  SERPAPI_API_KEY=...
OPENVESPER_SEARCH_PROVIDER=searxng  SEARXNG_URL=https://your.instance`}</code></pre>

      <h2>Tool invocation</h2>
      <pre><code>{`{
  "tool": "web_search",
  "input": {
    "query": "openvesper github",
    "limit": 5,
    "provider": "brave"
  }
}`}</code></pre>

      <h2>Output</h2>
      <pre><code>{`{
  "success": true,
  "data": {
    "query": "openvesper github",
    "provider": "brave",
    "resultCount": 5,
    "results": [
      {
        "title": "openvesper / openvesper",
        "url": "https://github.com/openvesper/openvesper",
        "snippet": "Local-first agent runtime...",
        "source": "brave",
        "publishedAt": "..."
      }
    ]
  }
}`}</code></pre>

      <h2>Privacy</h2>
      <p>
        Search query goes directly from your gateway to the chosen provider per
        their privacy policy. OpenVesper has no servers and sees nothing. For
        max privacy, self-host SearXNG.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>packages/plugins/web-search/</code></p>
    </div>
  );
}
