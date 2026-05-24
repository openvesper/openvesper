// ============================================================
// 🌒 @openvesper/plugin-music
// Spotify Web API (uses Client Credentials or OAuth)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) return null;
  const data = await r.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 - 60000 };
  return cachedToken.token;
}

async function spotifyApi(path: string, useUserToken = false): Promise<ToolResult> {
  let token: string | null;
  if (useUserToken) {
    token = process.env.SPOTIFY_USER_TOKEN || null;
    if (!token) return { success: false, error: "SPOTIFY_USER_TOKEN required for user-specific actions (OAuth)" };
  } else {
    token = await getAppToken();
    if (!token) return { success: false, error: "SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET required" };
  }

  try {
    const r = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data.error?.message || `Spotify API: ${r.status}`, data };
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function searchTracks(query: string, limit: number): Promise<ToolResult> {
  const r = await spotifyApi(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit || 10}`);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      tracks: ((r.data as any).tracks?.items || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        artists: t.artists.map((a: any) => a.name).join(", "),
        album: t.album.name,
        duration_ms: t.duration_ms,
        popularity: t.popularity,
        url: t.external_urls?.spotify,
        preview_url: t.preview_url,
      })),
    },
  };
}

async function searchArtists(query: string): Promise<ToolResult> {
  const r = await spotifyApi(`/search?q=${encodeURIComponent(query)}&type=artist&limit=10`);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      artists: ((r.data as any).artists?.items || []).map((a: any) => ({
        id: a.id, name: a.name, genres: a.genres, followers: a.followers?.total, popularity: a.popularity,
      })),
    },
  };
}

async function getArtist(artistId: string): Promise<ToolResult> {
  const r = await spotifyApi(`/artists/${artistId}`);
  if (!r.success) return r;
  const a = r.data as any;
  return { success: true, data: { id: a.id, name: a.name, genres: a.genres, followers: a.followers?.total, popularity: a.popularity, image: a.images?.[0]?.url } };
}

async function getArtistTopTracks(artistId: string, market: string): Promise<ToolResult> {
  const r = await spotifyApi(`/artists/${artistId}/top-tracks?market=${market || "US"}`);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      tracks: ((r.data as any).tracks || []).map((t: any) => ({ id: t.id, name: t.name, album: t.album.name, popularity: t.popularity, url: t.external_urls?.spotify })),
    },
  };
}

async function getRecommendations(seedTracks: string, limit: number): Promise<ToolResult> {
  const r = await spotifyApi(`/recommendations?seed_tracks=${seedTracks}&limit=${limit || 10}`);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      recommendations: ((r.data as any).tracks || []).map((t: any) => ({
        id: t.id, name: t.name, artists: t.artists.map((a: any) => a.name).join(", "), popularity: t.popularity, url: t.external_urls?.spotify,
      })),
    },
  };
}

// User-specific (needs OAuth user token)
async function getCurrentlyPlaying(): Promise<ToolResult> {
  return spotifyApi("/me/player/currently-playing", true);
}

async function getMyTopTracks(timeRange: string): Promise<ToolResult> {
  const r = await spotifyApi(`/me/top/tracks?time_range=${timeRange || "medium_term"}&limit=20`, true);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      timeRange: timeRange || "medium_term",
      topTracks: ((r.data as any).items || []).map((t: any) => ({
        name: t.name, artists: t.artists.map((a: any) => a.name).join(", "), popularity: t.popularity,
      })),
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-music",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Spotify — search music, get recommendations, currently playing",
  license: "MIT",
  tools: [
    defineTool({ name: "spotify_search_tracks", description: "Search Spotify for tracks", inputSchema: inputSchema({ query: { type: "string", description: "Search query" }, limit: { type: "number", description: "Max results" } }, ["query"]), handler: async (i) => searchTracks(i.query as string, (i.limit as number) || 10), category: "music" }),
    defineTool({ name: "spotify_search_artists", description: "Search Spotify for artists", inputSchema: inputSchema({ query: { type: "string", description: "Artist name" } }, ["query"]), handler: async (i) => searchArtists(i.query as string), category: "music" }),
    defineTool({ name: "spotify_get_artist", description: "Get artist details", inputSchema: inputSchema({ artist_id: { type: "string", description: "Spotify artist ID" } }, ["artist_id"]), handler: async (i) => getArtist(i.artist_id as string), category: "music" }),
    defineTool({ name: "spotify_artist_top_tracks", description: "Get an artist's top tracks", inputSchema: inputSchema({ artist_id: { type: "string", description: "Artist ID" }, market: { type: "string", description: "Country code (US, TR, etc.)" } }, ["artist_id"]), handler: async (i) => getArtistTopTracks(i.artist_id as string, i.market as string), category: "music" }),
    defineTool({ name: "spotify_recommendations", description: "Get song recommendations based on seed tracks", inputSchema: inputSchema({ seed_tracks: { type: "string", description: "Comma-separated track IDs" }, limit: { type: "number", description: "Number of recommendations" } }, ["seed_tracks"]), handler: async (i) => getRecommendations(i.seed_tracks as string, (i.limit as number) || 10), category: "music" }),
    defineTool({ name: "spotify_currently_playing", description: "Get user's currently playing track (needs SPOTIFY_USER_TOKEN)", inputSchema: inputSchema({}), handler: async () => getCurrentlyPlaying(), category: "music" }),
    defineTool({ name: "spotify_my_top_tracks", description: "Get user's top tracks (needs SPOTIFY_USER_TOKEN)", inputSchema: inputSchema({ time_range: { type: "string", description: "short_term | medium_term | long_term" } }), handler: async (i) => getMyTopTracks(i.time_range as string || "medium_term"), category: "music" }),
  ]

});
