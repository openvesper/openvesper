// ============================================================
// 🌒 @openvesper/plugin-maps
// Geocoding, places, directions, routing
// Uses Google Maps API or free OpenStreetMap/Nominatim/OSRM
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── FREE: OpenStreetMap Nominatim (geocoding) ───────────────

async function geocodeOSM(query: string): Promise<ToolResult> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { "User-Agent": "OpenVesper/1.0 (https://openvesper.com)" } }
    );
    const data = await r.json();
    return {
      success: true,
      data: {
        query,
        results: (data || []).map((d: any) => ({
          name: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          type: d.type,
          class: d.class,
          country: d.address?.country,
          city: d.address?.city || d.address?.town || d.address?.village,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function reverseGeocodeOSM(lat: number, lng: number): Promise<ToolResult> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "User-Agent": "OpenVesper/1.0" } }
    );
    const data = await r.json();
    return {
      success: true,
      data: {
        lat, lng,
        display_name: data.display_name,
        address: data.address,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── FREE: OSRM (routing) ────────────────────────────────────

async function directionsOSRM(fromLat: number, fromLng: number, toLat: number, toLng: number, profile: string): Promise<ToolResult> {
  try {
    const p = profile === "bike" ? "cycling" : profile === "walk" ? "foot" : "driving";
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/${p}/${fromLng},${fromLat};${toLng},${toLat}?overview=false&steps=true`
    );
    const data = await r.json();
    if (!data.routes || data.routes.length === 0) return { success: false, error: "No route found" };
    const route = data.routes[0];
    return {
      success: true,
      data: {
        from: { lat: fromLat, lng: fromLng },
        to: { lat: toLat, lng: toLng },
        profile: p,
        distance_meters: route.distance,
        distance_km: Math.round(route.distance / 100) / 10,
        duration_seconds: route.duration,
        duration_minutes: Math.round(route.duration / 60),
        steps: (route.legs?.[0]?.steps || []).map((s: any) => ({
          instruction: s.maneuver?.type,
          distance_m: s.distance,
          name: s.name,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Google Maps (places nearby, requires API key) ───────────

async function placesNearby(lat: number, lng: number, type: string, radius: number): Promise<ToolResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { success: false, error: "GOOGLE_MAPS_API_KEY required" };

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", String(radius || 1000));
    if (type) url.searchParams.set("type", type);
    url.searchParams.set("key", apiKey);

    const r = await fetch(url.toString());
    const data = await r.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return { success: false, error: data.error_message || data.status };
    }
    return {
      success: true,
      data: {
        location: { lat, lng },
        radius_m: radius || 1000,
        type,
        places: (data.results || []).slice(0, 20).map((p: any) => ({
          name: p.name,
          place_id: p.place_id,
          address: p.vicinity,
          rating: p.rating,
          user_ratings_total: p.user_ratings_total,
          types: p.types?.slice(0, 3),
          lat: p.geometry?.location?.lat,
          lng: p.geometry?.location?.lng,
          open_now: p.opening_hours?.open_now,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function placeDetails(placeId: string): Promise<ToolResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { success: false, error: "GOOGLE_MAPS_API_KEY required" };

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,website,rating,reviews,types&key=${apiKey}`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== "OK") return { success: false, error: data.error_message || data.status };
    const p = data.result;
    return {
      success: true,
      data: {
        name: p.name,
        address: p.formatted_address,
        phone: p.formatted_phone_number,
        website: p.website,
        rating: p.rating,
        types: p.types,
        opening_hours: p.opening_hours?.weekday_text,
        recent_reviews: (p.reviews || []).slice(0, 3).map((r: any) => ({
          author: r.author_name, rating: r.rating, text: r.text?.slice(0, 200),
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-maps",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Maps — geocoding, places, directions (FREE OSM + optional Google Maps)",
  license: "MIT",
  tools: [
    defineTool({ name: "geocode", description: "Convert address/place name to coordinates (FREE, no API key)", inputSchema: inputSchema({ query: { type: "string", description: "Address or place name" } }, ["query"]), handler: async (i) => geocodeOSM(i.query as string), category: "maps" }),
    defineTool({ name: "reverse_geocode", description: "Convert coordinates to address (FREE)", inputSchema: inputSchema({ lat: { type: "number", description: "Latitude" }, lng: { type: "number", description: "Longitude" } }, ["lat", "lng"]), handler: async (i) => reverseGeocodeOSM(i.lat as number, i.lng as number), category: "maps" }),
    defineTool({ name: "directions", description: "Get directions between two points (FREE OSRM)", inputSchema: inputSchema({ from_lat: { type: "number", description: "From latitude" }, from_lng: { type: "number", description: "From longitude" }, to_lat: { type: "number", description: "To latitude" }, to_lng: { type: "number", description: "To longitude" }, profile: { type: "string", description: "car | bike | walk" } }, ["from_lat", "from_lng", "to_lat", "to_lng"]), handler: async (i) => directionsOSRM(i.from_lat as number, i.from_lng as number, i.to_lat as number, i.to_lng as number, (i.profile as string) || "car"), category: "maps" }),
    defineTool({ name: "places_nearby", description: "Find places near coordinates (Google Maps API, types: restaurant, cafe, gym, hospital, etc.)", inputSchema: inputSchema({ lat: { type: "number", description: "Lat" }, lng: { type: "number", description: "Lng" }, type: { type: "string", description: "Place type" }, radius: { type: "number", description: "Radius (meters)" } }, ["lat", "lng"]), handler: async (i) => placesNearby(i.lat as number, i.lng as number, i.type as string || "", (i.radius as number) || 1000), category: "maps" }),
    defineTool({ name: "place_details", description: "Get detailed info for a place (phone, hours, reviews)", inputSchema: inputSchema({ place_id: { type: "string", description: "Google Places place_id" } }, ["place_id"]), handler: async (i) => placeDetails(i.place_id as string), category: "maps" }),
  ]

});
