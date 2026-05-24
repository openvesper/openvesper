// ============================================================
// 🌒 @openvesper/plugin-youtube
// YouTube Data API + transcript fetching
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

async function ytApi(endpoint: string, params: Record<string, string>): Promise<ToolResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { success: false, error: "YOUTUBE_API_KEY required (Google Cloud)" };

  try {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    for (const [k, v] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(k, v);
    const r = await fetch(url.toString());
    const data = await r.json();
    if (!r.ok) return { success: false, error: data.error?.message || `YouTube API: ${r.status}`, data };
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function searchVideos(query: string, maxResults: number): Promise<ToolResult> {
  const r = await ytApi("search", {
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(maxResults || 10),
  });
  if (!r.success) return r;
  return {
    success: true,
    data: {
      query,
      videos: ((r.data as any).items || []).map((v: any) => ({
        videoId: v.id.videoId,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        channelId: v.snippet.channelId,
        publishedAt: v.snippet.publishedAt,
        description: v.snippet.description?.slice(0, 200),
        thumbnail: v.snippet.thumbnails?.medium?.url,
        url: `https://youtube.com/watch?v=${v.id.videoId}`,
      })),
    },
  };
}

async function getVideoDetails(videoId: string): Promise<ToolResult> {
  const r = await ytApi("videos", {
    part: "snippet,statistics,contentDetails",
    id: videoId,
  });
  if (!r.success) return r;
  const v = (r.data as any).items?.[0];
  if (!v) return { success: false, error: "Video not found" };
  return {
    success: true,
    data: {
      videoId: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      description: v.snippet.description?.slice(0, 1000),
      publishedAt: v.snippet.publishedAt,
      duration: v.contentDetails.duration,
      views: parseInt(v.statistics.viewCount || "0"),
      likes: parseInt(v.statistics.likeCount || "0"),
      comments: parseInt(v.statistics.commentCount || "0"),
      tags: v.snippet.tags?.slice(0, 10),
      url: `https://youtube.com/watch?v=${v.id}`,
    },
  };
}

async function getChannelInfo(channelId: string): Promise<ToolResult> {
  const r = await ytApi("channels", {
    part: "snippet,statistics",
    id: channelId,
  });
  if (!r.success) return r;
  const c = (r.data as any).items?.[0];
  if (!c) return { success: false, error: "Channel not found" };
  return {
    success: true,
    data: {
      channelId: c.id,
      title: c.snippet.title,
      description: c.snippet.description?.slice(0, 500),
      country: c.snippet.country,
      subscribers: parseInt(c.statistics.subscriberCount || "0"),
      totalViews: parseInt(c.statistics.viewCount || "0"),
      videoCount: parseInt(c.statistics.videoCount || "0"),
      thumbnail: c.snippet.thumbnails?.medium?.url,
    },
  };
}

async function getChannelVideos(channelId: string, maxResults: number): Promise<ToolResult> {
  const r = await ytApi("search", {
    part: "snippet",
    channelId,
    type: "video",
    order: "date",
    maxResults: String(maxResults || 10),
  });
  if (!r.success) return r;
  return {
    success: true,
    data: {
      channelId,
      videos: ((r.data as any).items || []).map((v: any) => ({
        videoId: v.id.videoId,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        url: `https://youtube.com/watch?v=${v.id.videoId}`,
      })),
    },
  };
}

async function getTranscript(videoId: string): Promise<ToolResult> {
  // YouTube doesn't have official transcript API; use timedtext endpoint
  try {
    const langs = ["en", "tr", "es", "fr", "de"];
    for (const lang of langs) {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;
      const r = await fetch(url);
      if (!r.ok) continue;
      const xml = await r.text();
      if (!xml || xml.length < 100) continue;
      // Extract <text> content from XML
      const texts: string[] = [];
      const regex = /<text[^>]*>([^<]+)<\/text>/g;
      let m;
      while ((m = regex.exec(xml)) !== null) {
        texts.push(m[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
      }
      if (texts.length > 0) {
        const transcript = texts.join(" ");
        return {
          success: true,
          data: { videoId, language: lang, transcript: transcript.slice(0, 8000), length: transcript.length },
        };
      }
    }
    return { success: false, error: "No transcript available (video may not have captions)" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function getTrending(regionCode: string, categoryId: string): Promise<ToolResult> {
  const r = await ytApi("videos", {
    part: "snippet,statistics",
    chart: "mostPopular",
    regionCode: regionCode || "US",
    videoCategoryId: categoryId || "0",
    maxResults: "20",
  });
  if (!r.success) return r;
  return {
    success: true,
    data: {
      region: regionCode || "US",
      trending: ((r.data as any).items || []).map((v: any) => ({
        videoId: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        views: parseInt(v.statistics.viewCount || "0"),
        url: `https://youtube.com/watch?v=${v.id}`,
      })),
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-youtube",
  version: "1.0.0",
  author: "OpenVesper",
  description: "YouTube — search, video/channel info, transcripts, trending",
  license: "MIT",
  tools: [
    defineTool({ name: "youtube_search", description: "Search YouTube videos", inputSchema: inputSchema({ query: { type: "string", description: "Search query" }, max_results: { type: "number", description: "Max" } }, ["query"]), handler: async (i) => searchVideos(i.query as string, (i.max_results as number) || 10), category: "youtube" }),
    defineTool({ name: "youtube_video_details", description: "Get detailed video info (views, likes, duration, tags)", inputSchema: inputSchema({ video_id: { type: "string", description: "YouTube video ID" } }, ["video_id"]), handler: async (i) => getVideoDetails(i.video_id as string), category: "youtube" }),
    defineTool({ name: "youtube_channel_info", description: "Get channel info (subscribers, views, video count)", inputSchema: inputSchema({ channel_id: { type: "string", description: "Channel ID" } }, ["channel_id"]), handler: async (i) => getChannelInfo(i.channel_id as string), category: "youtube" }),
    defineTool({ name: "youtube_channel_videos", description: "Get recent videos from a channel", inputSchema: inputSchema({ channel_id: { type: "string", description: "Channel" }, max_results: { type: "number", description: "Max" } }, ["channel_id"]), handler: async (i) => getChannelVideos(i.channel_id as string, (i.max_results as number) || 10), category: "youtube" }),
    defineTool({ name: "youtube_transcript", description: "Get video transcript/captions", inputSchema: inputSchema({ video_id: { type: "string", description: "Video ID" } }, ["video_id"]), handler: async (i) => getTranscript(i.video_id as string), category: "youtube" }),
    defineTool({ name: "youtube_trending", description: "Get trending videos by region", inputSchema: inputSchema({ region: { type: "string", description: "ISO country code (US, TR, JP)" }, category: { type: "string", description: "Category ID (0=all)" } }), handler: async (i) => getTrending(i.region as string, i.category as string), category: "youtube" }),
  ]

});
