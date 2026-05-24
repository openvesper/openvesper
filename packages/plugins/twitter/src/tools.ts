// ============================================================
// 🛸 Terminal of UFO — Twitter/X Tool
// ============================================================
// Uses: RapidAPI Twitter endpoints (free tier available)
// Or: Nitter instances (no key needed, scraping)
// ============================================================

import axios from "axios";
import * as cheerio from "cheerio";
import { ToolResult } from "@openvesper/plugin-sdk";

const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
];

const UA = "Mozilla/5.0 (compatible; TerminalOfUFO/2.0)";

async function getNitterBase(): Promise<string> {
  for (const instance of NITTER_INSTANCES) {
    try {
      await axios.get(instance, { timeout: 5000, headers: { "User-Agent": UA } });
      return instance;
    } catch { continue; }
  }
  return NITTER_INSTANCES[0];
}

// ── Search Tweets ─────────────────────────────────────────────────────────────

export async function searchTweets(query: string, limit = 10): Promise<ToolResult> {
  try {
    // Try RapidAPI first if key provided
    const rapidKey = process.env.RAPIDAPI_KEY;
    if (rapidKey) {
      const r = await axios.get("https://twitter241.p.rapidapi.com/search-v2", {
        params: { q: query, count: limit, type: "Latest" },
        headers: {
          "X-RapidAPI-Key": rapidKey,
          "X-RapidAPI-Host": "twitter241.p.rapidapi.com",
        },
        timeout: 10000,
      });

      const entries = r.data?.result?.timeline?.instructions?.[0]?.entries || [];
      const tweets = entries
        .filter((e: { content?: { itemContent?: { tweet_results?: unknown } } }) => e.content?.itemContent?.tweet_results)
        .slice(0, limit)
        .map((e: {
          content: {
            itemContent: {
              tweet_results: {
                result: {
                  legacy: {
                    full_text: string;
                    favorite_count: number;
                    retweet_count: number;
                    reply_count: number;
                    created_at: string;
                    user_id_str: string;
                  };
                  core?: { user_results?: { result?: { legacy?: { screen_name: string; name: string; followers_count: number } } } };
                }
              }
            }
          }
        }) => {
          const tw = e.content.itemContent.tweet_results.result;
          const user = tw.core?.user_results?.result?.legacy;
          return {
            text: tw.legacy.full_text,
            author: user?.name || "Unknown",
            username: user?.screen_name || "unknown",
            followers: user?.followers_count || 0,
            likes: tw.legacy.favorite_count,
            retweets: tw.legacy.retweet_count,
            replies: tw.legacy.reply_count,
            createdAt: tw.legacy.created_at,
            url: `https://twitter.com/${user?.screen_name}/status/${tw.legacy.user_id_str}`,
          };
        });

      return { success: true, data: { query, tweets, source: "RapidAPI" } };
    }

    // Fallback: Nitter scraping
    const base = await getNitterBase();
    const r = await axios.get(`${base}/search`, {
      params: { q: query, f: "tweets" },
      headers: { "User-Agent": UA },
      timeout: 12000,
    });

    const $ = cheerio.load(r.data);
    const tweets: {
      text: string; username: string; author: string;
      likes: string; retweets: string; date: string; url: string;
    }[] = [];

    $(".timeline-item").each((i, el) => {
      if (i >= limit) return;
      const text = $(el).find(".tweet-content").text().trim();
      const username = $(el).find(".username").text().trim().replace("@", "");
      const author = $(el).find(".fullname").text().trim();
      const likes = $(el).find(".icon-heart").parent().text().trim();
      const retweets = $(el).find(".icon-retweet").parent().text().trim();
      const date = $(el).find(".tweet-date a").attr("title") || "";
      const link = $(el).find(".tweet-link").attr("href") || "";
      if (text) tweets.push({ text, username, author, likes, retweets, date, url: `https://twitter.com${link}` });
    });

    return { success: true, data: { query, tweets, source: "Nitter" } };
  } catch (e: unknown) {
    return { success: false, error: `Twitter search: ${e instanceof Error ? e.message : e}` };
  }
}

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getTwitterProfile(username: string): Promise<ToolResult> {
  try {
    const rapidKey = process.env.RAPIDAPI_KEY;
    if (rapidKey) {
      const r = await axios.get("https://twitter241.p.rapidapi.com/user", {
        params: { username },
        headers: { "X-RapidAPI-Key": rapidKey, "X-RapidAPI-Host": "twitter241.p.rapidapi.com" },
        timeout: 10000,
      });
      const u = r.data?.result?.data?.user?.result?.legacy;
      if (!u) return { success: false, error: "User not found" };
      return {
        success: true,
        data: {
          name: u.name, username: u.screen_name, bio: u.description,
          followers: u.followers_count, following: u.friends_count,
          tweets: u.statuses_count, likes: u.favourites_count,
          verified: u.verified, createdAt: u.created_at,
          location: u.location, website: u.url,
          profileUrl: `https://twitter.com/${u.screen_name}`,
        },
      };
    }

    // Nitter fallback
    const base = await getNitterBase();
    const r = await axios.get(`${base}/${username}`, { headers: { "User-Agent": UA }, timeout: 12000 });
    const $ = cheerio.load(r.data);

    return {
      success: true,
      data: {
        name: $(".profile-card-fullname").text().trim(),
        username,
        bio: $(".profile-bio").text().trim(),
        followers: $(".followers").find(".profile-stat-num").text().trim(),
        following: $(".following").find(".profile-stat-num").text().trim(),
        tweets: $(".tweets").find(".profile-stat-num").text().trim(),
        profileUrl: `https://twitter.com/${username}`,
        source: "Nitter",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Twitter profile: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Crypto Twitter Sentiment ──────────────────────────────────────────────────

export async function getCryptoTwitterSentiment(coin: string): Promise<ToolResult> {
  try {
    const queries = [`$${coin.toUpperCase()}`, `${coin} crypto`, `#${coin}`];
    const results = await Promise.allSettled(queries.map((q) => searchTweets(q, 8)));

    const allTweets: { text: string; likes: number | string; retweets: number | string }[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success) {
        const d = r.value.data as { tweets: { text: string; likes: number | string; retweets: number | string }[] };
        allTweets.push(...(d.tweets || []));
      }
    });

    // Simple sentiment scoring
    const bullishWords = ["moon", "bullish", "buy", "pump", "up", "🚀", "🟢", "breakout", "ath", "accumulate", "long"];
    const bearishWords = ["dump", "bearish", "sell", "crash", "down", "🔴", "rug", "dead", "short", "scam", "avoid"];

    let bullScore = 0, bearScore = 0;
    allTweets.forEach((t) => {
      const text = t.text.toLowerCase();
      bullishWords.forEach((w) => { if (text.includes(w)) bullScore++; });
      bearishWords.forEach((w) => { if (text.includes(w)) bearScore++; });
    });

    const total = bullScore + bearScore || 1;
    const sentiment = bullScore / total > 0.6 ? "BULLISH" : bullScore / total < 0.4 ? "BEARISH" : "NEUTRAL";

    return {
      success: true,
      data: {
        coin: coin.toUpperCase(),
        totalTweets: allTweets.length,
        bullishSignals: bullScore,
        bearishSignals: bearScore,
        sentiment,
        sentimentScore: `${((bullScore / total) * 100).toFixed(1)}% bullish`,
        recentTweets: allTweets.slice(0, 5).map((t) => ({
          text: t.text.slice(0, 140),
          likes: t.likes,
          retweets: t.retweets,
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Twitter sentiment: ${e instanceof Error ? e.message : e}` };
  }
}
