// ============================================================
// 🌒 @openvesper/plugin-movies
// Movies & TV shows — The Movie Database (TMDB)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

async function tmdb(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return { success: false, error: "TMDB_API_KEY required (free at themoviedb.org)" };

  try {
    const qs = new URLSearchParams({ api_key: key, ...params }).toString();
    const r = await fetch(`https://api.themoviedb.org/3${path}?${qs}`);
    if (!r.ok) return { success: false, error: `TMDB: ${r.status}` };
    return { success: true, data: await r.json() };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Movies ────────────────────────────────────────────────

async function searchMovies(query: string): Promise<ToolResult> {
  const r = await tmdb("/search/movie", { query, language: "en-US" });
  if (!r.success) return r;
  const movies = ((r.data as any).results || []) as any[];
  return {
    success: true,
    data: {
      total: (r.data as any).total_results,
      movies: movies.slice(0, 10).map((m) => ({
        id: m.id,
        title: m.title,
        original_title: m.original_title !== m.title ? m.original_title : undefined,
        release_date: m.release_date,
        rating: m.vote_average,
        vote_count: m.vote_count,
        overview: m.overview?.slice(0, 300),
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      })),
    },
  };
}

async function movieDetails(movieId: number): Promise<ToolResult> {
  const r = await tmdb(`/movie/${movieId}`, {
    append_to_response: "credits,videos,similar,watch/providers",
  });
  if (!r.success) return r;
  const m = r.data as any;
  return {
    success: true,
    data: {
      id: m.id,
      title: m.title,
      original_title: m.original_title,
      tagline: m.tagline,
      overview: m.overview,
      release_date: m.release_date,
      runtime: m.runtime,
      rating: m.vote_average,
      vote_count: m.vote_count,
      genres: (m.genres || []).map((g: any) => g.name),
      budget: m.budget,
      revenue: m.revenue,
      director: (m.credits?.crew || []).find((c: any) => c.job === "Director")?.name,
      cast: (m.credits?.cast || []).slice(0, 10).map((c: any) => ({ name: c.name, character: c.character })),
      trailers: (m.videos?.results || [])
        .filter((v: any) => v.type === "Trailer" && v.site === "YouTube")
        .slice(0, 2)
        .map((v: any) => `https://youtu.be/${v.key}`),
      similar: (m.similar?.results || []).slice(0, 5).map((s: any) => ({ id: s.id, title: s.title, rating: s.vote_average })),
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    },
  };
}

async function trendingMovies(window: string): Promise<ToolResult> {
  const r = await tmdb(`/trending/movie/${window || "week"}`);
  if (!r.success) return r;
  const movies = ((r.data as any).results || []) as any[];
  return {
    success: true,
    data: {
      window: window || "week",
      movies: movies.slice(0, 20).map((m) => ({
        id: m.id,
        title: m.title,
        release_date: m.release_date,
        rating: m.vote_average,
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      })),
    },
  };
}

async function topRatedMovies(): Promise<ToolResult> {
  const r = await tmdb("/movie/top_rated");
  if (!r.success) return r;
  const movies = ((r.data as any).results || []) as any[];
  return {
    success: true,
    data: {
      movies: movies.slice(0, 20).map((m) => ({
        id: m.id,
        title: m.title,
        release_date: m.release_date,
        rating: m.vote_average,
        vote_count: m.vote_count,
      })),
    },
  };
}

async function nowPlaying(): Promise<ToolResult> {
  const r = await tmdb("/movie/now_playing");
  if (!r.success) return r;
  return {
    success: true,
    data: {
      movies: ((r.data as any).results || []).slice(0, 20).map((m: any) => ({
        id: m.id,
        title: m.title,
        release_date: m.release_date,
        rating: m.vote_average,
      })),
    },
  };
}

async function upcomingMovies(): Promise<ToolResult> {
  const r = await tmdb("/movie/upcoming");
  if (!r.success) return r;
  return {
    success: true,
    data: {
      movies: ((r.data as any).results || []).slice(0, 20).map((m: any) => ({
        id: m.id,
        title: m.title,
        release_date: m.release_date,
      })),
    },
  };
}

// ── TV Shows ──────────────────────────────────────────────

async function searchTV(query: string): Promise<ToolResult> {
  const r = await tmdb("/search/tv", { query });
  if (!r.success) return r;
  const shows = ((r.data as any).results || []) as any[];
  return {
    success: true,
    data: {
      shows: shows.slice(0, 10).map((s) => ({
        id: s.id,
        name: s.name,
        first_air_date: s.first_air_date,
        rating: s.vote_average,
        overview: s.overview?.slice(0, 300),
        poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
      })),
    },
  };
}

async function tvDetails(tvId: number): Promise<ToolResult> {
  const r = await tmdb(`/tv/${tvId}`, { append_to_response: "credits,videos" });
  if (!r.success) return r;
  const s = r.data as any;
  return {
    success: true,
    data: {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      overview: s.overview,
      first_air: s.first_air_date,
      last_air: s.last_air_date,
      status: s.status,
      seasons: s.number_of_seasons,
      episodes: s.number_of_episodes,
      networks: (s.networks || []).map((n: any) => n.name),
      genres: (s.genres || []).map((g: any) => g.name),
      rating: s.vote_average,
      created_by: (s.created_by || []).map((c: any) => c.name),
      cast: (s.credits?.cast || []).slice(0, 10).map((c: any) => ({ name: c.name, character: c.character })),
    },
  };
}

async function popularTV(): Promise<ToolResult> {
  const r = await tmdb("/tv/popular");
  if (!r.success) return r;
  return {
    success: true,
    data: {
      shows: ((r.data as any).results || []).slice(0, 20).map((s: any) => ({
        id: s.id,
        name: s.name,
        first_air_date: s.first_air_date,
        rating: s.vote_average,
      })),
    },
  };
}

async function recommendMovies(seedMovieId: number): Promise<ToolResult> {
  const r = await tmdb(`/movie/${seedMovieId}/recommendations`);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      recommendations: ((r.data as any).results || []).slice(0, 15).map((m: any) => ({
        id: m.id,
        title: m.title,
        release_date: m.release_date,
        rating: m.vote_average,
      })),
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-movies",
  version: "3.3.0",
  author: "OpenVesper",
  description: "Movies & TV — TMDB search, details, trending, recommendations",
  license: "MIT",
  tools: [
    defineTool({ name: "search_movies", description: "Search movies by title", inputSchema: inputSchema({ query: { type: "string" } }, ["query"]), handler: async (i) => searchMovies(i.query as string), category: "movies" }),
    defineTool({ name: "movie_details", description: "Get full movie details (cast, crew, trailers, similar)", inputSchema: inputSchema({ movie_id: { type: "number" } }, ["movie_id"]), handler: async (i) => movieDetails(i.movie_id as number), category: "movies" }),
    defineTool({ name: "trending_movies", description: "Get trending movies (day or week)", inputSchema: inputSchema({ window: { type: "string", description: "day or week (default)" } }), handler: async (i) => trendingMovies(i.window as string), category: "movies" }),
    defineTool({ name: "top_rated_movies", description: "Top rated movies of all time", inputSchema: inputSchema({}), handler: async () => topRatedMovies(), category: "movies" }),
    defineTool({ name: "now_playing_movies", description: "Movies currently in theaters", inputSchema: inputSchema({}), handler: async () => nowPlaying(), category: "movies" }),
    defineTool({ name: "upcoming_movies", description: "Upcoming movie releases", inputSchema: inputSchema({}), handler: async () => upcomingMovies(), category: "movies" }),
    defineTool({ name: "search_tv", description: "Search TV shows by name", inputSchema: inputSchema({ query: { type: "string" } }, ["query"]), handler: async (i) => searchTV(i.query as string), category: "movies" }),
    defineTool({ name: "tv_details", description: "Get full TV show details", inputSchema: inputSchema({ tv_id: { type: "number" } }, ["tv_id"]), handler: async (i) => tvDetails(i.tv_id as number), category: "movies" }),
    defineTool({ name: "popular_tv", description: "Popular TV shows", inputSchema: inputSchema({}), handler: async () => popularTV(), category: "movies" }),
    defineTool({ name: "movie_recommendations", description: "Get recommendations based on a movie ID", inputSchema: inputSchema({ movie_id: { type: "number" } }, ["movie_id"]), handler: async (i) => recommendMovies(i.movie_id as number), category: "movies" }),
  ],
});
