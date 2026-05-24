// ============================================================
// 🌒 @openvesper/plugin-weather
// Weather forecasts via Open-Meteo (FREE, no API key)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── Geocoding (FREE Open-Meteo Geocoding API) ──────────────

async function geocode(location: string): Promise<{ lat: number; lng: number; name: string; country: string } | null> {
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en`);
    const data = await r.json();
    if (!data.results || data.results.length === 0) return null;
    const first = data.results[0];
    return { lat: first.latitude, lng: first.longitude, name: first.name, country: first.country };
  } catch {
    return null;
  }
}

const WMO_CODES: Record<number, string> = {
  0: "☀️ Clear sky",
  1: "🌤 Mainly clear",
  2: "⛅ Partly cloudy",
  3: "☁️ Overcast",
  45: "🌫 Fog",
  48: "🌫 Rime fog",
  51: "🌦 Light drizzle",
  53: "🌦 Moderate drizzle",
  55: "🌦 Dense drizzle",
  61: "🌧 Light rain",
  63: "🌧 Moderate rain",
  65: "🌧 Heavy rain",
  71: "🌨 Light snow",
  73: "🌨 Moderate snow",
  75: "❄️ Heavy snow",
  80: "🌧 Light showers",
  81: "🌧 Moderate showers",
  82: "⛈ Violent showers",
  95: "⛈ Thunderstorm",
  96: "⛈ Thunderstorm with hail",
  99: "⛈ Heavy thunderstorm with hail",
};

// ── Current weather ─────────────────────────────────────────

async function currentWeather(location: string): Promise<ToolResult> {
  const geo = await geocode(location);
  if (!geo) return { success: false, error: `Location not found: ${location}` };

  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto`
    );
    const data = await r.json();
    const c = data.current;
    return {
      success: true,
      data: {
        location: `${geo.name}, ${geo.country}`,
        coordinates: { lat: geo.lat, lng: geo.lng },
        timestamp: c.time,
        condition: WMO_CODES[c.weather_code] || "Unknown",
        temperature_c: c.temperature_2m,
        feels_like_c: c.apparent_temperature,
        humidity_pct: c.relative_humidity_2m,
        cloud_cover_pct: c.cloud_cover,
        wind_speed_kmh: c.wind_speed_10m,
        wind_direction_deg: c.wind_direction_10m,
        precipitation_mm: c.precipitation,
        is_day: c.is_day === 1,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Daily forecast (1-16 days) ──────────────────────────────

async function dailyForecast(location: string, days: number): Promise<ToolResult> {
  const geo = await geocode(location);
  if (!geo) return { success: false, error: `Location not found: ${location}` };

  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=${Math.min(days || 7, 16)}`
    );
    const data = await r.json();
    const d = data.daily;
    const forecast = d.time.map((date: string, i: number) => ({
      date,
      condition: WMO_CODES[d.weather_code[i]] || "Unknown",
      temp_max_c: d.temperature_2m_max[i],
      temp_min_c: d.temperature_2m_min[i],
      precipitation_mm: d.precipitation_sum[i],
      precipitation_chance_pct: d.precipitation_probability_max[i],
      max_wind_kmh: d.wind_speed_10m_max[i],
      uv_index_max: d.uv_index_max[i],
      sunrise: d.sunrise[i].split("T")[1],
      sunset: d.sunset[i].split("T")[1],
    }));
    return { success: true, data: { location: `${geo.name}, ${geo.country}`, days: forecast.length, forecast } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Hourly forecast ─────────────────────────────────────────

async function hourlyForecast(location: string, hours: number): Promise<ToolResult> {
  const geo = await geocode(location);
  if (!geo) return { success: false, error: `Location not found: ${location}` };

  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_hours=${Math.min(hours || 24, 240)}`
    );
    const data = await r.json();
    const h = data.hourly;
    const forecast = h.time.slice(0, hours || 24).map((time: string, i: number) => ({
      time,
      condition: WMO_CODES[h.weather_code[i]] || "Unknown",
      temp_c: h.temperature_2m[i],
      precipitation_chance_pct: h.precipitation_probability[i],
      precipitation_mm: h.precipitation[i],
      wind_kmh: h.wind_speed_10m[i],
    }));
    return { success: true, data: { location: `${geo.name}, ${geo.country}`, hours: forecast.length, forecast } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Air quality ─────────────────────────────────────────────

async function airQuality(location: string): Promise<ToolResult> {
  const geo = await geocode(location);
  if (!geo) return { success: false, error: `Location not found: ${location}` };

  try {
    const r = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${geo.lat}&longitude=${geo.lng}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`
    );
    const data = await r.json();
    const c = data.current;
    return {
      success: true,
      data: {
        location: `${geo.name}, ${geo.country}`,
        timestamp: c.time,
        european_aqi: c.european_aqi,
        us_aqi: c.us_aqi,
        pm10_ugm3: c.pm10,
        pm2_5_ugm3: c.pm2_5,
        ozone_ugm3: c.ozone,
        carbon_monoxide_ugm3: c.carbon_monoxide,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Marine forecast ─────────────────────────────────────────

async function marineForecast(location: string): Promise<ToolResult> {
  const geo = await geocode(location);
  if (!geo) return { success: false, error: `Location not found: ${location}` };

  try {
    const r = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${geo.lat}&longitude=${geo.lng}&current=wave_height,wave_direction,wave_period,wind_wave_height,sea_surface_temperature&timezone=auto`
    );
    const data = await r.json();
    if (data.error) return { success: false, error: "Marine forecast not available for this location (probably inland)" };
    const c = data.current;
    return {
      success: true,
      data: {
        location: `${geo.name}, ${geo.country}`,
        timestamp: c.time,
        wave_height_m: c.wave_height,
        wave_direction_deg: c.wave_direction,
        wave_period_s: c.wave_period,
        wind_wave_height_m: c.wind_wave_height,
        sea_surface_temp_c: c.sea_surface_temperature,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-weather",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Weather forecasts via Open-Meteo (FREE, no API key needed)",
  license: "MIT",
  tools: [
    defineTool({
      name: "current_weather",
      description: "Get current weather for a location (city name, address, or 'Tokyo, Japan')",
      inputSchema: inputSchema({ location: { type: "string", description: "City/place name" } }, ["location"]),
      handler: async (i) => currentWeather(i.location as string),
      category: "weather",
    }),
    defineTool({
      name: "daily_forecast",
      description: "Get daily weather forecast (up to 16 days)",
      inputSchema: inputSchema({
        location: { type: "string", description: "Location" },
        days: { type: "number", description: "Days ahead (1-16, default 7)" },
      }, ["location"]),
      handler: async (i) => dailyForecast(i.location as string, (i.days as number) || 7),
      category: "weather",
    }),
    defineTool({
      name: "hourly_forecast",
      description: "Get hourly weather forecast (up to 240 hours)",
      inputSchema: inputSchema({
        location: { type: "string", description: "Location" },
        hours: { type: "number", description: "Hours ahead (1-240, default 24)" },
      }, ["location"]),
      handler: async (i) => hourlyForecast(i.location as string, (i.hours as number) || 24),
      category: "weather",
    }),
    defineTool({
      name: "air_quality",
      description: "Get air quality index (PM2.5, PM10, ozone, AQI)",
      inputSchema: inputSchema({ location: { type: "string", description: "Location" } }, ["location"]),
      handler: async (i) => airQuality(i.location as string),
      category: "weather",
    }),
    defineTool({
      name: "marine_forecast",
      description: "Get marine forecast (waves, sea temp) — coastal locations only",
      inputSchema: inputSchema({ location: { type: "string", description: "Coastal location" } }, ["location"]),
      handler: async (i) => marineForecast(i.location as string),
      category: "weather",
    }),
  ]

});
