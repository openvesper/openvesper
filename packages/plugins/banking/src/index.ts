// ============================================================
// 🌒 @openvesper/plugin-banking
// Stock prices, exchange rates, financial tools
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── Stock prices (Alpha Vantage / Finnhub / FREE Yahoo) ───

async function stockQuoteFREE(symbol: string): Promise<ToolResult> {
  try {
    // Yahoo Finance unofficial (free, no key)
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!r.ok) return { success: false, error: `Yahoo Finance: ${r.status}` };
    const data = await r.json();
    const result = data.chart?.result?.[0];
    if (!result) return { success: false, error: "Symbol not found" };

    const meta = result.meta;
    return {
      success: true,
      data: {
        symbol: meta.symbol,
        name: meta.shortName,
        price: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        change_pct: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
        currency: meta.currency,
        exchange: meta.exchangeName,
        market_state: meta.marketState,
        timestamp: meta.regularMarketTime,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function stockHistory(symbol: string, range: string, interval: string): Promise<ToolResult> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval || "1d"}&range=${range || "1mo"}`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return { success: false, error: `Yahoo Finance: ${r.status}` };
    const data = await r.json();
    const result = data.chart?.result?.[0];
    if (!result) return { success: false, error: "No data" };

    const ts: number[] = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};

    return {
      success: true,
      data: {
        symbol: result.meta?.symbol,
        range,
        interval,
        candles: ts.slice(-50).map((t, i) => ({
          time: new Date(t * 1000).toISOString(),
          open: q.open?.[i],
          high: q.high?.[i],
          low: q.low?.[i],
          close: q.close?.[i],
          volume: q.volume?.[i],
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function searchSymbol(query: string): Promise<ToolResult> {
  try {
    const r = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await r.json();
    return {
      success: true,
      data: {
        query,
        results: (data.quotes || []).slice(0, 10).map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname,
          type: q.quoteType,
          exchange: q.exchDisp,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Exchange rates (FREE) ─────────────────────────────────

async function exchangeRate(from: string, to: string): Promise<ToolResult> {
  try {
    // exchangerate.host - free, no key
    const r = await fetch(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`);
    if (!r.ok) return { success: false, error: `Exchange API: ${r.status}` };
    const data = await r.json();
    const rate = data.rates?.[to.toUpperCase()];
    if (!rate) return { success: false, error: `Rate not found for ${to}` };

    return {
      success: true,
      data: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate,
        date: data.date,
        provider: "exchangerate-api.com",
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function convertCurrency(amount: number, from: string, to: string): Promise<ToolResult> {
  const r = await exchangeRate(from, to);
  if (!r.success) return r;
  const rate = (r.data as any).rate;
  return {
    success: true,
    data: {
      amount,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      converted: amount * rate,
      date: (r.data as any).date,
    },
  };
}

// ── Compound interest / loan calculators ──────────────────

async function compoundInterest(principal: number, annualRate: number, years: number, monthlyContrib: number): Promise<ToolResult> {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  let balance = principal;
  const yearly: number[] = [];

  for (let m = 0; m < months; m++) {
    balance = balance * (1 + monthlyRate) + (monthlyContrib || 0);
    if ((m + 1) % 12 === 0) yearly.push(Math.round(balance * 100) / 100);
  }

  return {
    success: true,
    data: {
      principal,
      annual_rate_pct: annualRate,
      years,
      monthly_contribution: monthlyContrib || 0,
      total_contributed: principal + (monthlyContrib || 0) * months,
      final_balance: Math.round(balance * 100) / 100,
      total_interest: Math.round((balance - principal - (monthlyContrib || 0) * months) * 100) / 100,
      yearly_balances: yearly,
    },
  };
}

async function loanPayment(principal: number, annualRate: number, years: number): Promise<ToolResult> {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const payment = monthlyRate === 0
    ? principal / months
    : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

  return {
    success: true,
    data: {
      principal,
      annual_rate_pct: annualRate,
      years,
      monthly_payment: Math.round(payment * 100) / 100,
      total_payment: Math.round(payment * months * 100) / 100,
      total_interest: Math.round((payment * months - principal) * 100) / 100,
    },
  };
}

// ── Market indices ────────────────────────────────────────

async function marketSummary(): Promise<ToolResult> {
  const indices = ["^GSPC", "^DJI", "^IXIC", "^FTSE", "^N225", "^GDAXI"]; // S&P 500, Dow, Nasdaq, FTSE, Nikkei, DAX
  try {
    const results = await Promise.all(indices.map(async (sym) => {
      const r = await stockQuoteFREE(sym);
      return r.success ? r.data : null;
    }));
    return {
      success: true,
      data: {
        indices: results.filter(Boolean),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-banking",
  version: "3.3.0",
  author: "OpenVesper",
  description: "Banking — stock prices (FREE Yahoo), currency conversion (FREE), loan/compound calculators",
  license: "MIT",
  tools: [
    defineTool({ name: "stock_quote", description: "Get real-time stock quote (FREE Yahoo Finance)", inputSchema: inputSchema({ symbol: { type: "string", description: "Stock symbol (AAPL, TSLA, MSFT)" } }, ["symbol"]), handler: async (i) => stockQuoteFREE(i.symbol as string), category: "banking" }),
    defineTool({ name: "stock_history", description: "Historical stock prices/candles", inputSchema: inputSchema({ symbol: { type: "string", description: "Symbol" }, range: { type: "string", description: "1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max" }, interval: { type: "string", description: "1m, 5m, 1h, 1d, 1wk, 1mo" } }, ["symbol"]), handler: async (i) => stockHistory(i.symbol as string, (i.range as string) || "1mo", (i.interval as string) || "1d"), category: "banking" }),
    defineTool({ name: "stock_search", description: "Search for stock symbols by name", inputSchema: inputSchema({ query: { type: "string", description: "Company name or symbol" } }, ["query"]), handler: async (i) => searchSymbol(i.query as string), category: "banking" }),
    defineTool({ name: "exchange_rate", description: "Get currency exchange rate (FREE)", inputSchema: inputSchema({ from: { type: "string", description: "From currency (USD)" }, to: { type: "string", description: "To currency (EUR, TRY)" } }, ["from", "to"]), handler: async (i) => exchangeRate(i.from as string, i.to as string), category: "banking" }),
    defineTool({ name: "convert_currency", description: "Convert amount between currencies", inputSchema: inputSchema({ amount: { type: "number", description: "Amount" }, from: { type: "string", description: "From currency" }, to: { type: "string", description: "To currency" } }, ["amount", "from", "to"]), handler: async (i) => convertCurrency(i.amount as number, i.from as string, i.to as string), category: "banking" }),
    defineTool({ name: "compound_interest", description: "Calculate compound interest with monthly contributions", inputSchema: inputSchema({ principal: { type: "number", description: "Initial amount" }, annual_rate: { type: "number", description: "Annual rate (e.g. 7 for 7%)" }, years: { type: "number", description: "Number of years" }, monthly_contribution: { type: "number", description: "Monthly addition (optional)" } }, ["principal", "annual_rate", "years"]), handler: async (i) => compoundInterest(i.principal as number, i.annual_rate as number, i.years as number, (i.monthly_contribution as number) || 0), category: "banking" }),
    defineTool({ name: "loan_payment", description: "Calculate monthly loan/mortgage payment", inputSchema: inputSchema({ principal: { type: "number", description: "Loan amount" }, annual_rate: { type: "number", description: "Annual rate" }, years: { type: "number", description: "Loan term in years" } }, ["principal", "annual_rate", "years"]), handler: async (i) => loanPayment(i.principal as number, i.annual_rate as number, i.years as number), category: "banking" }),
    defineTool({ name: "market_summary", description: "Get global market summary (S&P 500, Dow, Nasdaq, FTSE, Nikkei, DAX)", inputSchema: inputSchema({}), handler: async () => marketSummary(), category: "banking" }),
  ]

});
