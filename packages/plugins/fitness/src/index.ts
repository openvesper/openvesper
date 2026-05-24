// ============================================================
// 🌒 @openvesper/plugin-fitness
// Strava activities + ExerciseDB (free workout database)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── Strava (OAuth required) ─────────────────────────────────

async function stravaActivities(perPage: number, before?: number): Promise<ToolResult> {
  const token = process.env.STRAVA_ACCESS_TOKEN;
  if (!token) return { success: false, error: "STRAVA_ACCESS_TOKEN required (OAuth)" };

  try {
    const params = new URLSearchParams({ per_page: String(perPage || 10) });
    if (before) params.set("before", String(before));
    const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      const err = await r.json();
      return { success: false, error: err.message || `Strava: ${r.status}` };
    }
    const data: any[] = await r.json();
    return {
      success: true,
      data: {
        activities: data.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          distance_m: a.distance,
          distance_km: Math.round(a.distance / 100) / 10,
          duration_seconds: a.moving_time,
          duration_minutes: Math.round(a.moving_time / 60),
          elevation_m: a.total_elevation_gain,
          avg_speed_kmh: Math.round(a.average_speed * 3.6 * 10) / 10,
          avg_hr: a.average_heartrate,
          start_date: a.start_date,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function stravaStats(athleteId: string): Promise<ToolResult> {
  const token = process.env.STRAVA_ACCESS_TOKEN;
  if (!token) return { success: false, error: "STRAVA_ACCESS_TOKEN required" };

  try {
    const r = await fetch(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { success: false, error: `Strava: ${r.status}` };
    const data = await r.json();
    return {
      success: true,
      data: {
        recent_runs: data.recent_run_totals,
        recent_rides: data.recent_ride_totals,
        ytd_runs: data.ytd_run_totals,
        ytd_rides: data.ytd_ride_totals,
        all_time_runs: data.all_run_totals,
        all_time_rides: data.all_ride_totals,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── ExerciseDB (FREE workout database via RapidAPI alternative) ─

// Using wger.de — open source fitness database, FREE no key
async function exerciseSearch(query: string): Promise<ToolResult> {
  try {
    const r = await fetch(`https://wger.de/api/v2/exerciseinfo/?language=2&limit=20`);
    const data = await r.json();
    const allExercises = data.results || [];
    const matches = allExercises.filter((e: any) => {
      const name = e.translations?.find((t: any) => t.language === 2)?.name || e.name || "";
      return name.toLowerCase().includes(query.toLowerCase());
    });
    return {
      success: true,
      data: {
        query,
        count: matches.length,
        exercises: matches.slice(0, 15).map((e: any) => ({
          id: e.id,
          name: e.translations?.find((t: any) => t.language === 2)?.name || e.name,
          description: e.translations?.find((t: any) => t.language === 2)?.description?.replace(/<[^>]*>/g, "").slice(0, 300),
          category: e.category?.name,
          muscles: (e.muscles || []).map((m: any) => m.name_en),
          equipment: (e.equipment || []).map((eq: any) => eq.name),
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function exercisesByMuscle(muscleId: number): Promise<ToolResult> {
  try {
    const r = await fetch(`https://wger.de/api/v2/exerciseinfo/?muscles=${muscleId}&language=2&limit=30`);
    const data = await r.json();
    return {
      success: true,
      data: {
        muscleId,
        exercises: (data.results || []).slice(0, 20).map((e: any) => ({
          name: e.translations?.find((t: any) => t.language === 2)?.name || e.name,
          category: e.category?.name,
          equipment: (e.equipment || []).map((eq: any) => eq.name),
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function listMuscles(): Promise<ToolResult> {
  try {
    const r = await fetch(`https://wger.de/api/v2/muscle/`);
    const data = await r.json();
    return {
      success: true,
      data: { muscles: (data.results || []).map((m: any) => ({ id: m.id, name: m.name_en, isFront: m.is_front })) },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Nutrition (Open Food Facts — FREE) ──────────────────────

async function foodInfo(barcode: string): Promise<ToolResult> {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await r.json();
    if (data.status !== 1) return { success: false, error: "Product not found" };
    const p = data.product;
    return {
      success: true,
      data: {
        barcode,
        name: p.product_name,
        brand: p.brands,
        nutriscore: p.nutriscore_grade,
        nova_group: p.nova_group, // ultra-processed scale
        categories: p.categories,
        ingredients: p.ingredients_text?.slice(0, 300),
        nutrients_per_100g: {
          energy_kcal: p.nutriments?.["energy-kcal_100g"],
          fat_g: p.nutriments?.fat_100g,
          carbs_g: p.nutriments?.carbohydrates_100g,
          sugars_g: p.nutriments?.sugars_100g,
          protein_g: p.nutriments?.proteins_100g,
          salt_g: p.nutriments?.salt_100g,
          fiber_g: p.nutriments?.fiber_100g,
        },
        image: p.image_url,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function foodSearch(query: string): Promise<ToolResult> {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20`);
    const data = await r.json();
    return {
      success: true,
      data: {
        query,
        count: data.count,
        products: (data.products || []).slice(0, 15).map((p: any) => ({
          name: p.product_name,
          brand: p.brands,
          nutriscore: p.nutriscore_grade,
          calories_per_100g: p.nutriments?.["energy-kcal_100g"],
          barcode: p.code,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-fitness",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Fitness — Strava activities, exercise DB (wger.de), nutrition (OpenFoodFacts)",
  license: "MIT",
  tools: [
    defineTool({ name: "strava_activities", description: "Get recent Strava activities (runs, rides)", inputSchema: inputSchema({ per_page: { type: "number", description: "How many" } }), handler: async (i) => stravaActivities((i.per_page as number) || 10), category: "fitness" }),
    defineTool({ name: "strava_stats", description: "Get athlete stats (recent + YTD + all time)", inputSchema: inputSchema({ athlete_id: { type: "string", description: "Strava athlete ID" } }, ["athlete_id"]), handler: async (i) => stravaStats(i.athlete_id as string), category: "fitness" }),
    defineTool({ name: "exercise_search", description: "Search exercises by name (FREE wger.de)", inputSchema: inputSchema({ query: { type: "string", description: "Exercise name" } }, ["query"]), handler: async (i) => exerciseSearch(i.query as string), category: "fitness" }),
    defineTool({ name: "exercises_by_muscle", description: "Find exercises targeting a muscle (use list_muscles to get IDs)", inputSchema: inputSchema({ muscle_id: { type: "number", description: "Muscle ID" } }, ["muscle_id"]), handler: async (i) => exercisesByMuscle(i.muscle_id as number), category: "fitness" }),
    defineTool({ name: "list_muscles", description: "List all muscle groups", inputSchema: inputSchema({}), handler: async () => listMuscles(), category: "fitness" }),
    defineTool({ name: "food_info", description: "Get nutrition info for a barcode (FREE OpenFoodFacts)", inputSchema: inputSchema({ barcode: { type: "string", description: "Barcode" } }, ["barcode"]), handler: async (i) => foodInfo(i.barcode as string), category: "fitness" }),
    defineTool({ name: "food_search", description: "Search foods by name", inputSchema: inputSchema({ query: { type: "string", description: "Food name" } }, ["query"]), handler: async (i) => foodSearch(i.query as string), category: "fitness" }),
  ]

});
