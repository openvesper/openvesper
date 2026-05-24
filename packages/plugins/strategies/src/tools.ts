// ============================================================
// 🛸 Terminal of UFO — Strategy System
// Templates + Backtest + Custom Strategy Builder
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }
interface Trade { entry: number; exit: number; side: "LONG"|"SHORT"; pnl: number; pnlPct: number; }
interface StrategyResult {
  name: string; trades: Trade[];
  metrics: {
    totalTrades: number; winRate: string;
    totalPnL: string; avgPnL: string;
    maxWin: string; maxLoss: string;
    sharpeRatio: string; profitFactor: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getBinanceCandles(symbol: string, interval = "1h", limit = 500): Promise<Candle[]> {
  const r = await axios.get("https://api.binance.com/api/v3/klines", {
    params: { symbol: symbol.toUpperCase(), interval, limit }, timeout: 12000,
  });
  return r.data.map((k: unknown[]) => ({
    time: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low:  parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

function sma(data: number[], period: number, idx: number): number {
  if (idx < period - 1) return data[idx];
  const slice = data.slice(idx - period + 1, idx + 1);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function rsi(data: number[], idx: number, period = 14): number {
  if (idx < period) return 50;
  let gains = 0, losses = 0;
  for (let i = idx - period + 1; i <= idx; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change; else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
}

function macd(data: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = ema(data, 12);
  const ema26 = ema(data, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signal[i]);
  return { macd: macdLine, signal, histogram };
}

function calcMetrics(trades: Trade[], name: string): StrategyResult {
  if (!trades.length) return {
    name, trades,
    metrics: { totalTrades: 0, winRate: "0%", totalPnL: "0", avgPnL: "0", maxWin: "0", maxLoss: "0", sharpeRatio: "N/A", profitFactor: "N/A" },
  };

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
  const winSum = wins.reduce((a, t) => a + t.pnl, 0);
  const lossSum = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const avgPnL = totalPnL / trades.length;
  const stdDev = Math.sqrt(trades.reduce((a, t) => a + Math.pow(t.pnlPct - avgPnL, 2), 0) / trades.length);
  const sharpe = stdDev > 0 ? (avgPnL / stdDev) * Math.sqrt(365) : 0;

  return {
    name, trades,
    metrics: {
      totalTrades: trades.length,
      winRate: `${((wins.length / trades.length) * 100).toFixed(1)}%`,
      totalPnL: totalPnL.toFixed(2),
      avgPnL: avgPnL.toFixed(2),
      maxWin: Math.max(...trades.map((t) => t.pnl)).toFixed(2),
      maxLoss: Math.min(...trades.map((t) => t.pnl)).toFixed(2),
      sharpeRatio: sharpe.toFixed(2),
      profitFactor: lossSum > 0 ? (winSum / lossSum).toFixed(2) : "Infinity",
    },
  };
}

// ── Strategy Templates ────────────────────────────────────────────────────────

export async function strategyEMAcross(symbol: string, interval = "1h", fast = 50, slow = 200, days = 30): Promise<ToolResult> {
  try {
    const limit = Math.min(days * (interval === "1h" ? 24 : interval === "4h" ? 6 : 1), 1000);
    const candles = await getBinanceCandles(symbol, interval, limit);
    const closes = candles.map((c) => c.close);
    const emaFast = ema(closes, fast);
    const emaSlow = ema(closes, slow);
    const trades: Trade[] = [];
    let position: { entry: number; side: "LONG"|"SHORT" } | null = null;

    for (let i = slow; i < candles.length; i++) {
      const goldCross = emaFast[i] > emaSlow[i] && emaFast[i - 1] <= emaSlow[i - 1];
      const deathCross = emaFast[i] < emaSlow[i] && emaFast[i - 1] >= emaSlow[i - 1];

      if (!position && goldCross) {
        position = { entry: candles[i].close, side: "LONG" };
      } else if (!position && deathCross) {
        position = { entry: candles[i].close, side: "SHORT" };
      } else if (position) {
        if ((position.side === "LONG" && deathCross) || (position.side === "SHORT" && goldCross)) {
          const exit = candles[i].close;
          const pnlPct = position.side === "LONG"
            ? ((exit - position.entry) / position.entry) * 100
            : ((position.entry - exit) / position.entry) * 100;
          trades.push({ entry: position.entry, exit, side: position.side, pnl: pnlPct, pnlPct });
          position = null;
        }
      }
    }

    return {
      success: true,
      data: {
        strategy: "EMA Cross",
        params: { fast, slow, symbol, interval, days },
        ...calcMetrics(trades, "EMA Cross"),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `EMA cross: ${e instanceof Error ? e.message : e}` };
  }
}

export async function strategyRSI(symbol: string, interval = "1h", oversold = 30, overbought = 70, days = 30): Promise<ToolResult> {
  try {
    const limit = Math.min(days * (interval === "1h" ? 24 : interval === "4h" ? 6 : 1), 1000);
    const candles = await getBinanceCandles(symbol, interval, limit);
    const closes = candles.map((c) => c.close);
    const trades: Trade[] = [];
    let position: { entry: number; side: "LONG"|"SHORT" } | null = null;

    for (let i = 20; i < candles.length; i++) {
      const r = rsi(closes, i);
      if (!position && r < oversold) {
        position = { entry: candles[i].close, side: "LONG" };
      } else if (position && position.side === "LONG" && r > overbought) {
        const exit = candles[i].close;
        const pnlPct = ((exit - position.entry) / position.entry) * 100;
        trades.push({ entry: position.entry, exit, side: position.side, pnl: pnlPct, pnlPct });
        position = null;
      }
    }

    return {
      success: true,
      data: {
        strategy: "RSI Mean Reversion",
        params: { oversold, overbought, symbol, interval, days },
        ...calcMetrics(trades, "RSI Mean Reversion"),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `RSI strategy: ${e instanceof Error ? e.message : e}` };
  }
}

export async function strategyMACD(symbol: string, interval = "1h", days = 30): Promise<ToolResult> {
  try {
    const limit = Math.min(days * (interval === "1h" ? 24 : interval === "4h" ? 6 : 1), 1000);
    const candles = await getBinanceCandles(symbol, interval, limit);
    const closes = candles.map((c) => c.close);
    const { histogram } = macd(closes);
    const trades: Trade[] = [];
    let position: { entry: number; side: "LONG"|"SHORT" } | null = null;

    for (let i = 30; i < candles.length; i++) {
      const bullCross = histogram[i] > 0 && histogram[i - 1] <= 0;
      const bearCross = histogram[i] < 0 && histogram[i - 1] >= 0;

      if (!position && bullCross) {
        position = { entry: candles[i].close, side: "LONG" };
      } else if (!position && bearCross) {
        position = { entry: candles[i].close, side: "SHORT" };
      } else if (position) {
        if ((position.side === "LONG" && bearCross) || (position.side === "SHORT" && bullCross)) {
          const exit = candles[i].close;
          const pnlPct = position.side === "LONG"
            ? ((exit - position.entry) / position.entry) * 100
            : ((position.entry - exit) / position.entry) * 100;
          trades.push({ entry: position.entry, exit, side: position.side, pnl: pnlPct, pnlPct });
          position = null;
        }
      }
    }

    return {
      success: true,
      data: {
        strategy: "MACD Momentum",
        params: { symbol, interval, days },
        ...calcMetrics(trades, "MACD Momentum"),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `MACD strategy: ${e instanceof Error ? e.message : e}` };
  }
}

export async function strategyBollingerBreakout(symbol: string, interval = "1h", period = 20, days = 30): Promise<ToolResult> {
  try {
    const limit = Math.min(days * (interval === "1h" ? 24 : interval === "4h" ? 6 : 1), 1000);
    const candles = await getBinanceCandles(symbol, interval, limit);
    const closes = candles.map((c) => c.close);
    const trades: Trade[] = [];
    let position: { entry: number; side: "LONG"|"SHORT" } | null = null;

    for (let i = period; i < candles.length; i++) {
      const slice = closes.slice(i - period, i);
      const mean = slice.reduce((a, b) => a + b) / period;
      const std = Math.sqrt(slice.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / period);
      const upper = mean + 2 * std;
      const lower = mean - 2 * std;
      const price = candles[i].close;

      if (!position && price > upper) position = { entry: price, side: "LONG" };
      else if (!position && price < lower) position = { entry: price, side: "SHORT" };
      else if (position) {
        const shouldExit = (position.side === "LONG" && price < mean) || (position.side === "SHORT" && price > mean);
        if (shouldExit) {
          const exit = price;
          const pnlPct = position.side === "LONG"
            ? ((exit - position.entry) / position.entry) * 100
            : ((position.entry - exit) / position.entry) * 100;
          trades.push({ entry: position.entry, exit, side: position.side, pnl: pnlPct, pnlPct });
          position = null;
        }
      }
    }

    return {
      success: true,
      data: {
        strategy: "Bollinger Breakout",
        params: { period, symbol, interval, days },
        ...calcMetrics(trades, "Bollinger Breakout"),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `BB strategy: ${e instanceof Error ? e.message : e}` };
  }
}

export async function compareAllStrategies(symbol: string, interval = "1h", days = 30): Promise<ToolResult> {
  try {
    const [ema, rsiR, macdR, bb] = await Promise.all([
      strategyEMAcross(symbol, interval, 50, 200, days),
      strategyRSI(symbol, interval, 30, 70, days),
      strategyMACD(symbol, interval, days),
      strategyBollingerBreakout(symbol, interval, 20, days),
    ]);

    const results = [ema, rsiR, macdR, bb]
      .filter((r) => r.success)
      .map((r) => {
        const d = r.data as { strategy: string; metrics: { totalTrades: number; winRate: string; totalPnL: string; sharpeRatio: string } };
        return {
          strategy: d.strategy,
          trades: d.metrics.totalTrades,
          winRate: d.metrics.winRate,
          totalPnL: d.metrics.totalPnL + "%",
          sharpe: d.metrics.sharpeRatio,
        };
      });

    // Find best by Sharpe
    const sorted = [...results].sort((a, b) => parseFloat(b.sharpe) - parseFloat(a.sharpe));
    const best = sorted[0];

    return {
      success: true,
      data: {
        symbol, interval, days,
        results,
        bestStrategy: best ? `${best.strategy} — Sharpe ${best.sharpe}, ${best.winRate} win rate, ${best.totalPnL} PnL` : "No data",
        disclaimer: "Past performance does not guarantee future results. Backtests have look-ahead bias risks.",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Compare strategies: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Custom Strategy ───────────────────────────────────────────────────────────

export async function runCustomStrategy(config: {
  symbol: string; interval?: string; days?: number;
  entry: { rsi_below?: number; rsi_above?: number; price_above_sma?: number; price_below_sma?: number; macd_bullish?: boolean; };
  exit: { take_profit_pct?: number; stop_loss_pct?: number; rsi_above?: number; rsi_below?: number; };
}): Promise<ToolResult> {
  try {
    const interval = config.interval || "1h";
    const days = config.days || 30;
    const limit = Math.min(days * 24, 1000);
    const candles = await getBinanceCandles(config.symbol, interval, limit);
    const closes = candles.map((c) => c.close);
    const trades: Trade[] = [];
    let position: { entry: number; side: "LONG"|"SHORT"; entryIdx: number } | null = null;
    const macdData = macd(closes);

    for (let i = 30; i < candles.length; i++) {
      const r = rsi(closes, i);
      const price = candles[i].close;

      let entrySignal = false;
      if (config.entry.rsi_below && r < config.entry.rsi_below) entrySignal = true;
      if (config.entry.rsi_above && r > config.entry.rsi_above) entrySignal = true;
      if (config.entry.price_above_sma) {
        const s = sma(closes, config.entry.price_above_sma, i);
        if (price > s) entrySignal = entrySignal && true;
      }
      if (config.entry.macd_bullish && macdData.histogram[i] > 0 && macdData.histogram[i - 1] <= 0) entrySignal = true;

      if (!position && entrySignal) {
        position = { entry: price, side: "LONG", entryIdx: i };
      } else if (position) {
        const pnlPct = ((price - position.entry) / position.entry) * 100;
        let exitSignal = false;
        if (config.exit.take_profit_pct && pnlPct >= config.exit.take_profit_pct) exitSignal = true;
        if (config.exit.stop_loss_pct && pnlPct <= -config.exit.stop_loss_pct) exitSignal = true;
        if (config.exit.rsi_above && r > config.exit.rsi_above) exitSignal = true;
        if (config.exit.rsi_below && r < config.exit.rsi_below) exitSignal = true;

        if (exitSignal) {
          trades.push({ entry: position.entry, exit: price, side: position.side, pnl: pnlPct, pnlPct });
          position = null;
        }
      }
    }

    return {
      success: true,
      data: {
        strategy: "Custom Strategy",
        config,
        ...calcMetrics(trades, "Custom"),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Custom strategy: ${e instanceof Error ? e.message : e}` };
  }
}
