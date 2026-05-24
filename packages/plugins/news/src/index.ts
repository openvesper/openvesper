// ============================================================
// 🌒 @openvesper/plugin-news
// News aggregation — NewsAPI, GDELT, Reddit, HackerNews
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── NewsAPI.org (FREE tier 100 req/day) ─────────────────────

async function newsApiSearch(query: string, sortBy: string, language: string): Promise<ToolResult> {
  const apiKey = process.env.NEWSAPI_KEY || process.env.NEWS_API_KEY;
  if (!apiKey) return { success: false, error: "NEWSAPI_KEY required (newsapi.org)" };

  try {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", query);
    url.searchParams.set("sortBy", sortBy || "publishedAt");
    if (language) url.searchParams.set("language", language);
    url.searchParams.set("pageSize", "20");
    url.searchParams.set("apiKey", apiKey);

    const r = await fetch(url.toString());
    const data = await r.json();
    if (data.status !== "ok") return { success: false, error: data.message };

    return {
      success: true,
      data: {
        query,
        total: data.totalResults,
        articles: (data.articles || []).map((a: any) => ({
          title: a.title,
          source: a.source?.name,
          author: a.author,
          publishedAt: a.publishedAt,
          description: a.description,
          url: a.url,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function newsApiTopHeadlines(country: string, category: string): Promise<ToolResult> {
  const apiKey = process.env.NEWSAPI_KEY || process.env.NEWS_API_KEY;
  if (!apiKey) return { success: false, error: "NEWSAPI_KEY required" };

  try {
    const url = new URL("https://newsapi.org/v2/top-headlines");
    if (country) url.searchParams.set("country", country);
    if (category) url.searchParams.set("category", category);
    url.searchParams.set("pageSize", "20");
    url.searchParams.set("apiKey", apiKey);

    const r = await fetch(url.toString());
    const data = await r.json();
    if (data.status !== "ok") return { success: false, error: data.message };

    return {
      success: true,
      data: {
        country: country || "global",
        category: category || "general",
        articles: (data.articles || []).map((a: any) => ({
          title: a.title, source: a.source?.name, publishedAt: a.publishedAt, url: a.url, description: a.description,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── HackerNews (FREE) ───────────────────────────────────────

async function hackerNewsTop(count: number): Promise<ToolResult> {
  try {
    const r = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    const ids: number[] = await r.json();
    const top = ids.slice(0, count || 10);
    const stories = await Promise.all(
      top.map(async (id) => {
        const sr = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return sr.json();
      })
    );
    return {
      success: true,
      data: {
        stories: stories.map((s: any) => ({
          id: s.id, title: s.title, url: s.url, score: s.score, author: s.by, comments: s.descendants,
          hn_url: `https://news.ycombinator.com/item?id=${s.id}`,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function hackerNewsSearch(query: string): Promise<ToolResult> {
  try {
    const r = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=20`);
    const data = await r.json();
    return {
      success: true,
      data: {
        query,
        hits: (data.hits || []).map((h: any) => ({
          objectID: h.objectID,
          title: h.title || h.story_title,
          url: h.url || h.story_url,
          author: h.author,
          points: h.points,
          comments: h.num_comments,
          created: h.created_at,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Reddit (FREE) ───────────────────────────────────────────

async function redditSubreddit(subreddit: string, sort: string, limit: number): Promise<ToolResult> {
  try {
    const sortType = sort || "hot";
    const r = await fetch(`https://www.reddit.com/r/${subreddit}/${sortType}.json?limit=${limit || 25}`, {
      headers: { "User-Agent": "OpenVesper/1.0" },
    });
    const data = await r.json();
    return {
      success: true,
      data: {
        subreddit,
        sort: sortType,
        posts: (data.data?.children || []).map((c: any) => ({
          title: c.data.title,
          author: c.data.author,
          score: c.data.score,
          comments: c.data.num_comments,
          created_utc: c.data.created_utc,
          url: c.data.url,
          permalink: `https://reddit.com${c.data.permalink}`,
          subreddit: c.data.subreddit,
          selftext: c.data.selftext?.slice(0, 300),
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function redditSearch(query: string, subreddit?: string): Promise<ToolResult> {
  try {
    const path = subreddit
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&limit=20`
      : `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=20`;
    const r = await fetch(path, { headers: { "User-Agent": "OpenVesper/1.0" } });
    const data = await r.json();
    return {
      success: true,
      data: {
        query,
        results: (data.data?.children || []).map((c: any) => ({
          title: c.data.title, subreddit: c.data.subreddit, author: c.data.author, score: c.data.score, comments: c.data.num_comments, url: c.data.url,
          permalink: `https://reddit.com${c.data.permalink}`,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-news",
  version: "1.0.0",
  author: "OpenVesper",
  description: "News — NewsAPI, HackerNews, Reddit (mostly free)",
  license: "MIT",
  tools: [
    defineTool({ name: "news_search", description: "Search news articles via NewsAPI", inputSchema: inputSchema({ query: { type: "string", description: "Search query" }, sort_by: { type: "string", description: "publishedAt | relevancy | popularity" }, language: { type: "string", description: "en, tr, es..." } }, ["query"]), handler: async (i) => newsApiSearch(i.query as string, i.sort_by as string, i.language as string), category: "news" }),
    defineTool({ name: "news_top_headlines", description: "Top news headlines by country/category", inputSchema: inputSchema({ country: { type: "string", description: "ISO country code (us, tr, gb)" }, category: { type: "string", description: "business | tech | sports | health | science" } }), handler: async (i) => newsApiTopHeadlines(i.country as string || "", i.category as string || ""), category: "news" }),
    defineTool({ name: "hackernews_top", description: "Top HackerNews stories (FREE)", inputSchema: inputSchema({ count: { type: "number", description: "How many (default 10)" } }), handler: async (i) => hackerNewsTop((i.count as number) || 10), category: "news" }),
    defineTool({ name: "hackernews_search", description: "Search HackerNews (Algolia, FREE)", inputSchema: inputSchema({ query: { type: "string", description: "Search query" } }, ["query"]), handler: async (i) => hackerNewsSearch(i.query as string), category: "news" }),
    defineTool({ name: "reddit_subreddit", description: "Get posts from a subreddit (FREE)", inputSchema: inputSchema({ subreddit: { type: "string", description: "Subreddit name (no /r/)" }, sort: { type: "string", description: "hot | new | top | rising" }, limit: { type: "number", description: "Post count" } }, ["subreddit"]), handler: async (i) => redditSubreddit(i.subreddit as string, i.sort as string, (i.limit as number) || 25), category: "news" }),
    defineTool({ name: "reddit_search", description: "Search Reddit (FREE)", inputSchema: inputSchema({ query: { type: "string", description: "Query" }, subreddit: { type: "string", description: "Limit to subreddit (optional)" } }, ["query"]), handler: async (i) => redditSearch(i.query as string, i.subreddit as string), category: "news" }),
  ]

});
