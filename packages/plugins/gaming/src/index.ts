// ============================================================
// 🌒 @openvesper/plugin-gaming
// Steam stats + Twitch streams
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── Steam (FREE — Web API key needed) ──────────────────────

async function steamApi(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
  const key = process.env.STEAM_API_KEY;
  if (!key) return { success: false, error: "STEAM_API_KEY required (get free at steamcommunity.com/dev/apikey)" };

  try {
    const qs = new URLSearchParams({ key, format: "json", ...params }).toString();
    const r = await fetch(`https://api.steampowered.com${path}?${qs}`);
    if (!r.ok) return { success: false, error: `Steam: ${r.status}` };
    return { success: true, data: await r.json() };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function steamProfile(steamId: string): Promise<ToolResult> {
  const r = await steamApi("/ISteamUser/GetPlayerSummaries/v2/", { steamids: steamId });
  if (!r.success) return r;
  const player = ((r.data as any).response?.players || [])[0];
  if (!player) return { success: false, error: "Profile not found or private" };
  return {
    success: true,
    data: {
      steamid: player.steamid,
      name: player.personaname,
      profile_url: player.profileurl,
      avatar: player.avatarfull,
      country: player.loccountrycode,
      created: player.timecreated ? new Date(player.timecreated * 1000).toISOString() : null,
      state: player.personastate === 0 ? "offline" : player.personastate === 1 ? "online" : "in-game",
      currently_playing: player.gameextrainfo,
    },
  };
}

async function steamOwnedGames(steamId: string): Promise<ToolResult> {
  const r = await steamApi("/IPlayerService/GetOwnedGames/v1/", { steamid: steamId, include_appinfo: "1" });
  if (!r.success) return r;
  const games = ((r.data as any).response?.games || []) as any[];
  return {
    success: true,
    data: {
      total: games.length,
      total_playtime_hours: Math.round(games.reduce((sum, g) => sum + g.playtime_forever, 0) / 60),
      top_games: games
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 20)
        .map((g) => ({
          appid: g.appid,
          name: g.name,
          playtime_hours: Math.round(g.playtime_forever / 60),
          playtime_2weeks_hours: g.playtime_2weeks ? Math.round(g.playtime_2weeks / 60) : 0,
        })),
    },
  };
}

async function steamRecentGames(steamId: string): Promise<ToolResult> {
  const r = await steamApi("/IPlayerService/GetRecentlyPlayedGames/v1/", { steamid: steamId });
  if (!r.success) return r;
  const games = ((r.data as any).response?.games || []) as any[];
  return {
    success: true,
    data: {
      total_recent: games.length,
      games: games.map((g) => ({
        name: g.name,
        appid: g.appid,
        playtime_2weeks_hours: Math.round(g.playtime_2weeks / 60),
        playtime_forever_hours: Math.round(g.playtime_forever / 60),
      })),
    },
  };
}

async function steamPlayerCount(appId: number): Promise<ToolResult> {
  try {
    const r = await fetch(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`);
    if (!r.ok) return { success: false, error: `Steam: ${r.status}` };
    const data = await r.json();
    return {
      success: true,
      data: {
        appid: appId,
        current_players: data.response?.player_count || 0,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Twitch (Helix API — Client ID + OAuth) ─────────────────

async function twitchToken(): Promise<string | null> {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;

  try {
    const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, {
      method: "POST",
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function twitchApi(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) return { success: false, error: "TWITCH_CLIENT_ID required" };

  const token = await twitchToken();
  if (!token) return { success: false, error: "Failed to get Twitch app token (check TWITCH_CLIENT_SECRET)" };

  try {
    const qs = new URLSearchParams(params).toString();
    const url = `https://api.twitch.tv/helix${path}${qs ? "?" + qs : ""}`;
    const r = await fetch(url, {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!r.ok) return { success: false, error: `Twitch: ${r.status}` };
    return { success: true, data: await r.json() };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function twitchTopStreams(gameId?: string, limit?: number): Promise<ToolResult> {
  const params: Record<string, string> = { first: String(limit || 10) };
  if (gameId) params.game_id = gameId;
  const r = await twitchApi("/streams", params);
  if (!r.success) return r;
  const streams = ((r.data as any).data || []) as any[];
  return {
    success: true,
    data: {
      streams: streams.map((s) => ({
        user_name: s.user_name,
        title: s.title,
        game_name: s.game_name,
        viewer_count: s.viewer_count,
        language: s.language,
        started_at: s.started_at,
        url: `https://twitch.tv/${s.user_login}`,
      })),
    },
  };
}

async function twitchStreamerInfo(username: string): Promise<ToolResult> {
  const r = await twitchApi("/streams", { user_login: username });
  if (!r.success) return r;
  const stream = ((r.data as any).data || [])[0];
  if (!stream) {
    return { success: true, data: { username, is_live: false } };
  }
  return {
    success: true,
    data: {
      username,
      is_live: true,
      title: stream.title,
      game_name: stream.game_name,
      viewer_count: stream.viewer_count,
      started_at: stream.started_at,
      thumbnail: stream.thumbnail_url,
      url: `https://twitch.tv/${username}`,
    },
  };
}

async function twitchSearchGames(query: string): Promise<ToolResult> {
  const r = await twitchApi("/games", { name: query });
  if (!r.success) return r;
  const games = ((r.data as any).data || []) as any[];
  return {
    success: true,
    data: {
      games: games.map((g) => ({ id: g.id, name: g.name })),
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-gaming",
  version: "3.3.0",
  author: "OpenVesper",
  description: "Gaming — Steam profile/library/playtime, Twitch streams + streamers",
  license: "MIT",
  tools: [
    defineTool({ name: "steam_profile", description: "Get Steam profile info (status, current game, country)", inputSchema: inputSchema({ steam_id: { type: "string", description: "64-bit Steam ID" } }, ["steam_id"]), handler: async (i) => steamProfile(i.steam_id as string), category: "gaming" }),
    defineTool({ name: "steam_library", description: "Get owned games + playtime stats", inputSchema: inputSchema({ steam_id: { type: "string", description: "64-bit Steam ID" } }, ["steam_id"]), handler: async (i) => steamOwnedGames(i.steam_id as string), category: "gaming" }),
    defineTool({ name: "steam_recent_games", description: "Games played in last 2 weeks", inputSchema: inputSchema({ steam_id: { type: "string", description: "64-bit Steam ID" } }, ["steam_id"]), handler: async (i) => steamRecentGames(i.steam_id as string), category: "gaming" }),
    defineTool({ name: "steam_player_count", description: "Get current player count for a Steam game", inputSchema: inputSchema({ app_id: { type: "number", description: "Steam app ID" } }, ["app_id"]), handler: async (i) => steamPlayerCount(i.app_id as number), category: "gaming" }),
    defineTool({ name: "twitch_top_streams", description: "Top live Twitch streams (optionally by game)", inputSchema: inputSchema({ game_id: { type: "string", description: "Twitch game ID (optional)" }, limit: { type: "number", description: "Max streams (default 10)" } }), handler: async (i) => twitchTopStreams(i.game_id as string, i.limit as number), category: "gaming" }),
    defineTool({ name: "twitch_streamer_info", description: "Get info about a Twitch streamer (live status, title, game)", inputSchema: inputSchema({ username: { type: "string", description: "Twitch username" } }, ["username"]), handler: async (i) => twitchStreamerInfo(i.username as string), category: "gaming" }),
    defineTool({ name: "twitch_search_games", description: "Search Twitch games by name", inputSchema: inputSchema({ query: { type: "string", description: "Game name" } }, ["query"]), handler: async (i) => twitchSearchGames(i.query as string), category: "gaming" }),
  ]

});
