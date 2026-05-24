import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Crypto Plugins</h1>
      <p className="lead">
        18 of the 47 plugins are crypto-specific. All are <strong>read-only</strong> —
        OpenVesper does not bundle trading execution, key management, or signing code by default — you can add them in your own plugins if you need them.
        We orchestrate, analyze, and research. We don't move funds.
      </p>

      <h2>Privacy and security commitments</h2>
      <ul>
        <li>No plugin in this repository reads a main wallet private key or seed phrase.</li>
        <li>No bundled agent persona requests a seed phrase. (What you author yourself is your call.)</li>
        <li>No example, doc, or tutorial in this repository instructs pasting a main wallet key into <code>.env</code>.</li>
        <li>Trading on perpetual DEXes (Hyperliquid, Lighter, Drift) is <strong>not bundled</strong>. Use those venues' official clients separately — or write your own plugin if you want an agent to drive them.</li>
      </ul>

      <p>
        See <Link href="/docs/gateway/security">Security policy</Link> for the full
        Wallet Key Policy and how this is enforced in code.
      </p>

      <h2>The 18 crypto plugins</h2>

      <h3>Market data (read-only)</h3>
      <table>
        <thead><tr><th>Plugin</th><th>Source</th><th>Capabilities</th></tr></thead>
        <tbody>
          <tr><td><code>crypto</code></td><td>CoinGecko, Binance</td><td>Spot prices, technical indicators, OHLC</td></tr>
          <tr><td><code>derivatives</code></td><td>Coinglass, Binance</td><td>Fear & Greed, OI, L/S ratio, liquidations, volatility</td></tr>
          <tr><td><code>defi</code></td><td>DefiLlama</td><td>TVL, protocol details, yield, chain stats</td></tr>
          <tr><td><code>whale</code></td><td>Etherscan, Helius</td><td>Large transfer detection, exchange flows</td></tr>
          <tr><td><code>onchain</code></td><td>Block explorers</td><td>Transaction lookup, contract reads, ABI decoding</td></tr>
        </tbody>
      </table>

      <h3>Solana ecosystem</h3>
      <table>
        <thead><tr><th>Plugin</th><th>Source</th><th>Capabilities</th></tr></thead>
        <tbody>
          <tr><td><code>solana</code></td><td>Helius, public RPCs</td><td>Account info, SPL balances, token metadata</td></tr>
          <tr><td><code>solana-dev</code></td><td>Anchor IDL, Token-2022</td><td>Anchor program decode, cNFT lookup, account parsing</td></tr>
          <tr><td><code>bagsfm</code></td><td>Bags.fm public API</td><td>Token analytics, holder distribution</td></tr>
          <tr><td><code>memescan</code></td><td>GeckoTerminal, Birdeye</td><td>Trending pairs, multi-DEX scan, signal scoring</td></tr>
          <tr><td><code>base-meme</code></td><td>BaseScan, GeckoTerminal</td><td>Base chain memecoin scanning</td></tr>
        </tbody>
      </table>

      <h3>Research & alerts</h3>
      <table>
        <thead><tr><th>Plugin</th><th>Source</th><th>Capabilities</th></tr></thead>
        <tbody>
          <tr><td><code>airdrop</code></td><td>Public airdrop trackers</td><td>Active campaign list, eligibility checks</td></tr>
          <tr><td><code>nft</code></td><td>OpenSea, Magic Eden</td><td>Floor prices, collection stats, recent sales</td></tr>
          <tr><td><code>security</code></td><td>GoPlus, Etherscan</td><td>Token honeypot check, contract verification status</td></tr>
          <tr><td><code>macro</code></td><td>RSS, public APIs</td><td>Macro news, economic calendar, central bank updates</td></tr>
        </tbody>
      </table>

      <h3>Strategy & analytics</h3>
      <table>
        <thead><tr><th>Plugin</th><th>Source</th><th>Capabilities</th></tr></thead>
        <tbody>
          <tr><td><code>strategies</code></td><td>Local computation</td><td>Backtest scaffolds, Pine Script generation, signal logic</td></tr>
          <tr><td><code>tracking</code></td><td>Public APIs</td><td>Portfolio tracking from public addresses</td></tr>
          <tr><td><code>banking</code></td><td>Plaid (BYO)</td><td>Fiat balance read (requires Plaid key)</td></tr>
        </tbody>
      </table>

      <h2>Example: scanning Solana meme coins</h2>
      <pre><code>{`# Find trending Solana memes with strong buy pressure
node apps/cli/dist/index.js agent --message \\
  "Scan top 20 trending Solana memes on GeckoTerminal,
   filter by liquidity > $50k, sort by buy pressure"`}</code></pre>

      <p>
        The runtime routes this to the <code>memescan</code> plugin which
        calls GeckoTerminal's public API, filters, scores, and returns the
        results.
      </p>

      <h2>Example: reading a Solana account</h2>
      <pre><code>{`# Get the SPL token holdings for a wallet
node apps/cli/dist/index.js agent --message \\
  "What SPL tokens does 9WzD...A4d hold? Use Helius RPC."`}</code></pre>

      <p>
        Routes to <code>plugin-solana</code> → calls{" "}
        <code>getTokenAccountsByOwner</code> via the public Helius RPC →
        returns token balances with metadata.
      </p>

      <h2>API keys needed</h2>
      <p>Most plugins work with free public APIs. A few benefit from keys for higher rate limits:</p>
      <pre><code>{`# Optional — improve rate limits
HELIUS_API_KEY=               # Solana, free tier OK
BIRDEYE_API_KEY=              # Solana market data
COINGECKO_API_KEY=            # Price data
ETHERSCAN_API_KEY=            # Ethereum explorer
BASESCAN_API_KEY=             # Base explorer
ARBISCAN_API_KEY=             # Arbitrum explorer`}</code></pre>

      <h2>What's NOT included</h2>
      <p>By design, these are not in the framework:</p>
      <ul>
        <li>Perpetual DEX trading (Hyperliquid, Lighter, Drift)</li>
        <li>Wallet creation or seed phrase handling</li>
        <li>Transaction signing (we never see your keys)</li>
        <li>Auto-trading or order placement on any venue</li>
        <li>Withdrawals or fund movement of any kind</li>
      </ul>

      <p>
        If you want to add these capabilities, write your own plugin in your
        own fork. Keep signing code in a separate, carefully audited process
        with stricter security boundaries.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/integrations">Browse all 47 plugins</Link></li>
        <li><Link href="/docs/concepts/plugins">Plugin authoring guide</Link></li>
        <li><Link href="/docs/gateway/security">Security policy</Link></li>
      </ul>
    </div>
  );
}
