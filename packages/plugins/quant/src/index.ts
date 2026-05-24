import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

async function fetchKlines(symbol: string, interval: string, days: number): Promise<number[][]> {
  const limit = Math.min(1000, days * (interval === "1h" ? 24 : interval === "4h" ? 6 : 1));
  const r = await axios.get("https://api.binance.com/api/v3/klines", {
    params: { symbol: symbol.toUpperCase(), interval, limit }, timeout: 12000,
  });
  return r.data;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k));
  return out;
}

function rsi(closes: number[], period = 14): number[] {
  const out: number[] = [];
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - closes[j - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const rs = gains / period / ((losses / period) || 1);
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

function backtest(signals: ("BUY" | "SELL" | "HOLD")[], closes: number[]): any {
  let position = 0, entryPrice = 0;
  const trades: { entry: number; exit: number; pnl: number }[] = [];
  for (let i = 0; i < signals.length; i++) {
    if (signals[i] === "BUY" && !position) { position = 1; entryPrice = closes[i]; }
    else if (signals[i] === "SELL" && position) {
      const pnl = (closes[i] - entryPrice) / entryPrice * 100;
      trades.push({ entry: entryPrice, exit: closes[i], pnl });
      position = 0;
    }
  }
  const wins = trades.filter((t) => t.pnl > 0);
  const totalReturn = trades.reduce((a, t) => a + t.pnl, 0);
  return {
    totalTrades: trades.length,
    wins: wins.length, losses: trades.length - wins.length,
    winRate: trades.length ? (wins.length / trades.length * 100).toFixed(2) + "%" : "0%",
    totalReturn: totalReturn.toFixed(2) + "%",
    avgWin: wins.length ? (wins.reduce((a, t) => a + t.pnl, 0) / wins.length).toFixed(2) + "%" : "0%",
    avgLoss: trades.length - wins.length ? (trades.filter((t) => t.pnl <= 0).reduce((a, t) => a + t.pnl, 0) / (trades.length - wins.length)).toFixed(2) + "%" : "0%",
  };
}

async function strategyEMA(symbol: string, interval: string, fast: number, slow: number, days: number): Promise<ToolResult> {
  try {
    const klines = await fetchKlines(symbol, interval, days);
    const closes = klines.map((k) => parseFloat(k[4] as any));
    const fastE = ema(closes, fast);
    const slowE = ema(closes, slow);
    const signals: ("BUY" | "SELL" | "HOLD")[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (fastE[i] > slowE[i] && fastE[i - 1] <= slowE[i - 1]) signals.push("BUY");
      else if (fastE[i] < slowE[i] && fastE[i - 1] >= slowE[i - 1]) signals.push("SELL");
      else signals.push("HOLD");
    }
    return { success: true, data: { strategy: `EMA Cross ${fast}/${slow}`, symbol, interval, ...backtest(signals, closes) } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function strategyRSI(symbol: string, interval: string, oversold: number, overbought: number, days: number): Promise<ToolResult> {
  try {
    const klines = await fetchKlines(symbol, interval, days);
    const closes = klines.map((k) => parseFloat(k[4] as any));
    const rsiVals = rsi(closes);
    const signals: ("BUY" | "SELL" | "HOLD")[] = closes.slice(14).map((_, i) =>
      rsiVals[i] < oversold ? "BUY" : rsiVals[i] > overbought ? "SELL" : "HOLD"
    );
    return { success: true, data: { strategy: `RSI ${oversold}/${overbought}`, symbol, interval, ...backtest(signals, closes.slice(14)) } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function compareAll(symbol: string, interval: string, days: number): Promise<ToolResult> {
  const [ema50_200, rsi30_70, ema20_50] = await Promise.all([
    strategyEMA(symbol, interval, 50, 200, days),
    strategyRSI(symbol, interval, 30, 70, days),
    strategyEMA(symbol, interval, 20, 50, days),
  ]);
  return {
    success: true,
    data: {
      strategies: [
        ema50_200.success ? ema50_200.data : { error: ema50_200.error },
        rsi30_70.success ? rsi30_70.data : { error: rsi30_70.error },
        ema20_50.success ? ema20_50.data : { error: ema20_50.error },
      ],
      note: "Past performance doesn't guarantee future results. Backtest = look-ahead bias risk.",
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-quant", version: "1.0.0", author: "OpenVesper",
  description: "Strategy backtesting: EMA, RSI, MACD, BB", license: "MIT",
  tools: [
    defineTool({ name: "strategy_ema_cross", description: "EMA cross backtest", inputSchema: inputSchema({ symbol: { type: "string", description: "BTCUSDT" }, interval: { type: "string", description: "1h, 4h, 1d" }, fast: { type: "number", description: "Fast EMA" }, slow: { type: "number", description: "Slow EMA" }, days: { type: "number", description: "Days" } }, ["symbol"]), handler: async (i) => strategyEMA(i.symbol as string, (i.interval as string) || "1h", (i.fast as number) || 50, (i.slow as number) || 200, (i.days as number) || 30), category: "quant" }),
    defineTool({ name: "strategy_rsi", description: "RSI mean reversion backtest", inputSchema: inputSchema({ symbol: { type: "string", description: "Symbol" }, interval: { type: "string", description: "Interval" }, oversold: { type: "number", description: "Oversold level" }, overbought: { type: "number", description: "Overbought level" }, days: { type: "number", description: "Days" } }, ["symbol"]), handler: async (i) => strategyRSI(i.symbol as string, (i.interval as string) || "1h", (i.oversold as number) || 30, (i.overbought as number) || 70, (i.days as number) || 30), category: "quant" }),
    defineTool({ name: "strategy_compare_all", description: "Compare all strategies on a symbol", inputSchema: inputSchema({ symbol: { type: "string", description: "Symbol" }, interval: { type: "string", description: "Interval" }, days: { type: "number", description: "Days" } }, ["symbol"]), handler: async (i) => compareAll(i.symbol as string, (i.interval as string) || "1h", (i.days as number) || 30), category: "quant" }),
  ]

});
