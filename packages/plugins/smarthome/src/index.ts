// ============================================================
// 🌒 @openvesper/plugin-smarthome
// Home Assistant REST API integration
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

async function haApi(path: string, options: RequestInit = {}): Promise<ToolResult> {
  const host = process.env.HOMEASSISTANT_URL || process.env.HASS_URL;
  const token = process.env.HOMEASSISTANT_TOKEN || process.env.HASS_TOKEN;
  if (!host || !token) return { success: false, error: "HOMEASSISTANT_URL and HOMEASSISTANT_TOKEN required" };

  try {
    const url = `${host.replace(/\/$/, "")}/api${path}`;
    const r = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!r.ok) {
      const err = await r.text();
      return { success: false, error: `Home Assistant: ${r.status} ${err.slice(0, 200)}` };
    }
    const data = await r.json();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function listEntities(domain?: string): Promise<ToolResult> {
  const r = await haApi("/states");
  if (!r.success) return r;
  let entities = (r.data as any[]) || [];
  if (domain) entities = entities.filter((e) => e.entity_id.startsWith(domain + "."));
  return {
    success: true,
    data: {
      count: entities.length,
      entities: entities.slice(0, 50).map((e) => ({
        entity_id: e.entity_id,
        state: e.state,
        friendly_name: e.attributes?.friendly_name,
        last_changed: e.last_changed,
      })),
    },
  };
}

async function getEntity(entityId: string): Promise<ToolResult> {
  return haApi(`/states/${entityId}`);
}

async function callService(domain: string, service: string, entityId?: string, data?: Record<string, unknown>): Promise<ToolResult> {
  const body: Record<string, unknown> = data ? { ...data } : {};
  if (entityId) body.entity_id = entityId;
  return haApi(`/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function turnOn(entityId: string): Promise<ToolResult> {
  const domain = entityId.split(".")[0];
  return callService(domain, "turn_on", entityId);
}

async function turnOff(entityId: string): Promise<ToolResult> {
  const domain = entityId.split(".")[0];
  return callService(domain, "turn_off", entityId);
}

async function setLight(entityId: string, brightness?: number, rgb?: number[], colorTemp?: number): Promise<ToolResult> {
  const data: Record<string, unknown> = {};
  if (brightness !== undefined) data.brightness_pct = brightness;
  if (rgb && rgb.length === 3) data.rgb_color = rgb;
  if (colorTemp) data.color_temp = colorTemp;
  return callService("light", "turn_on", entityId, data);
}

async function setClimate(entityId: string, temperature: number, mode?: string): Promise<ToolResult> {
  const data: Record<string, unknown> = { temperature };
  if (mode) data.hvac_mode = mode;
  return callService("climate", "set_temperature", entityId, data);
}

async function fireEvent(eventType: string, eventData: Record<string, unknown>): Promise<ToolResult> {
  return haApi(`/events/${eventType}`, {
    method: "POST",
    body: JSON.stringify(eventData),
  });
}

async function getHistory(entityId: string, hours: number): Promise<ToolResult> {
  const since = new Date(Date.now() - (hours || 24) * 3600 * 1000).toISOString();
  return haApi(`/history/period/${since}?filter_entity_id=${entityId}`);
}

export default definePlugin({
  name: "@openvesper/plugin-smarthome",
  version: "3.3.0",
  author: "OpenVesper",
  description: "Smart Home — Home Assistant integration (lights, climate, sensors, services)",
  license: "MIT",
  tools: [
    defineTool({ name: "ha_list_entities", description: "List entities (optionally filter by domain: light, switch, sensor, climate)", inputSchema: inputSchema({ domain: { type: "string", description: "Optional: light, switch, sensor, climate, etc." } }), handler: async (i) => listEntities(i.domain as string), category: "smarthome" }),
    defineTool({ name: "ha_get_entity", description: "Get state of a specific entity", inputSchema: inputSchema({ entity_id: { type: "string", description: "Entity ID (e.g. light.kitchen)" } }, ["entity_id"]), handler: async (i) => getEntity(i.entity_id as string), category: "smarthome" }),
    defineTool({ name: "ha_turn_on", description: "Turn on an entity (light, switch, fan, etc.)", inputSchema: inputSchema({ entity_id: { type: "string", description: "Entity ID" } }, ["entity_id"]), handler: async (i) => turnOn(i.entity_id as string), category: "smarthome", permission: "execute" }),
    defineTool({ name: "ha_turn_off", description: "Turn off an entity", inputSchema: inputSchema({ entity_id: { type: "string", description: "Entity ID" } }, ["entity_id"]), handler: async (i) => turnOff(i.entity_id as string), category: "smarthome", permission: "execute" }),
    defineTool({ name: "ha_set_light", description: "Set light state (brightness 0-100, rgb [r,g,b] 0-255, color_temp K)", inputSchema: inputSchema({ entity_id: { type: "string", description: "Light entity" }, brightness: { type: "number", description: "0-100 percent" }, rgb: { type: "array", description: "[r, g, b] 0-255" }, color_temp: { type: "number", description: "Kelvin (warm=2700, cool=6500)" } }, ["entity_id"]), handler: async (i) => setLight(i.entity_id as string, i.brightness as number, i.rgb as number[], i.color_temp as number), category: "smarthome", permission: "execute" }),
    defineTool({ name: "ha_set_climate", description: "Set thermostat temperature and mode (heat, cool, auto, off)", inputSchema: inputSchema({ entity_id: { type: "string", description: "Climate entity" }, temperature: { type: "number", description: "Target temp" }, mode: { type: "string", description: "heat | cool | auto | off" } }, ["entity_id", "temperature"]), handler: async (i) => setClimate(i.entity_id as string, i.temperature as number, i.mode as string), category: "smarthome", permission: "execute" }),
    defineTool({ name: "ha_call_service", description: "Call any Home Assistant service (advanced)", inputSchema: inputSchema({ domain: { type: "string", description: "Service domain (light, switch, etc.)" }, service: { type: "string", description: "Service name (turn_on, turn_off, toggle, etc.)" }, entity_id: { type: "string", description: "Target entity (optional)" }, data: { type: "string", description: "JSON service data (optional)" } }, ["domain", "service"]), handler: async (i) => { let d = {}; try { if (i.data) d = JSON.parse(i.data as string); } catch {} return callService(i.domain as string, i.service as string, i.entity_id as string, d); }, category: "smarthome", permission: "execute" }),
    defineTool({ name: "ha_fire_event", description: "Fire a custom Home Assistant event", inputSchema: inputSchema({ event_type: { type: "string", description: "Event type" }, event_data: { type: "string", description: "JSON event data" } }, ["event_type"]), handler: async (i) => { let d = {}; try { if (i.event_data) d = JSON.parse(i.event_data as string); } catch {} return fireEvent(i.event_type as string, d); }, category: "smarthome", permission: "execute" }),
    defineTool({ name: "ha_history", description: "Get history of an entity over the past N hours", inputSchema: inputSchema({ entity_id: { type: "string", description: "Entity ID" }, hours: { type: "number", description: "Hours back (default 24)" } }, ["entity_id"]), handler: async (i) => getHistory(i.entity_id as string, (i.hours as number) || 24), category: "smarthome" }),
  ]

});
