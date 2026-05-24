// ============================================================
// 🌒 @openvesper/plugin-calendar
// Google Calendar API (OAuth2 access token)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

async function calApi(path: string, options: RequestInit = {}): Promise<ToolResult> {
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!token) return { success: false, error: "GOOGLE_ACCESS_TOKEN required (OAuth2 access token with calendar scope)" };

  try {
    const r = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data.error?.message || `Calendar API: ${r.status}`, data };
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function listEvents(calendarId: string, timeMin: string, timeMax: string, maxResults: number): Promise<ToolResult> {
  const params = new URLSearchParams({
    timeMin: timeMin || new Date().toISOString(),
    maxResults: String(maxResults || 10),
    singleEvents: "true",
    orderBy: "startTime",
  });
  if (timeMax) params.set("timeMax", timeMax);

  const r = await calApi(`/calendars/${encodeURIComponent(calendarId || "primary")}/events?${params}`);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      events: ((r.data as any).items || []).map((e: any) => ({
        id: e.id,
        summary: e.summary,
        description: e.description,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location,
        attendees: e.attendees?.map((a: any) => a.email),
        link: e.htmlLink,
      })),
    },
  };
}

async function createEvent(
  calendarId: string,
  summary: string,
  start: string,
  end: string,
  description: string,
  location: string,
  attendees: string[]
): Promise<ToolResult> {
  const body: any = {
    summary,
    description,
    location,
    start: { dateTime: start, timeZone: "UTC" },
    end: { dateTime: end, timeZone: "UTC" },
  };
  if (attendees && attendees.length > 0) {
    body.attendees = attendees.map((email) => ({ email }));
  }

  const r = await calApi(`/calendars/${encodeURIComponent(calendarId || "primary")}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.success) return r;
  const d = r.data as any;
  return {
    success: true,
    data: { id: d.id, summary: d.summary, start: d.start, end: d.end, htmlLink: d.htmlLink },
  };
}

async function updateEvent(calendarId: string, eventId: string, updates: Record<string, unknown>): Promise<ToolResult> {
  return calApi(`/calendars/${encodeURIComponent(calendarId || "primary")}/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

async function deleteEvent(calendarId: string, eventId: string): Promise<ToolResult> {
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!token) return { success: false, error: "GOOGLE_ACCESS_TOKEN required" };
  try {
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || "primary")}/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { success: false, error: `Delete failed: ${r.status}` };
    return { success: true, data: { eventId, deleted: true } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function listCalendars(): Promise<ToolResult> {
  const r = await calApi("/users/me/calendarList");
  if (!r.success) return r;
  return {
    success: true,
    data: {
      calendars: ((r.data as any).items || []).map((c: any) => ({
        id: c.id,
        summary: c.summary,
        primary: c.primary,
        timezone: c.timeZone,
        access_role: c.accessRole,
      })),
    },
  };
}

async function quickAdd(calendarId: string, text: string): Promise<ToolResult> {
  // Natural language event creation: "Dinner with John tomorrow at 7pm"
  const params = new URLSearchParams({ text });
  return calApi(`/calendars/${encodeURIComponent(calendarId || "primary")}/events/quickAdd?${params}`, {
    method: "POST",
  });
}

export default definePlugin({
  name: "@openvesper/plugin-calendar",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Google Calendar — events, scheduling, availability",
  license: "MIT",
  tools: [
    defineTool({ name: "calendar_list_events", description: "List upcoming events (ISO 8601 dates)", inputSchema: inputSchema({ calendar_id: { type: "string", description: "Calendar ID (default 'primary')" }, time_min: { type: "string", description: "ISO start (default: now)" }, time_max: { type: "string", description: "ISO end (optional)" }, max_results: { type: "number", description: "Max events" } }), handler: async (i) => listEvents(i.calendar_id as string || "primary", i.time_min as string || "", i.time_max as string || "", (i.max_results as number) || 10), category: "calendar" }),
    defineTool({ name: "calendar_create_event", description: "Create a new calendar event", inputSchema: inputSchema({ calendar_id: { type: "string", description: "Calendar ID" }, summary: { type: "string", description: "Title" }, start: { type: "string", description: "ISO start datetime" }, end: { type: "string", description: "ISO end datetime" }, description: { type: "string", description: "Notes" }, location: { type: "string", description: "Location" }, attendees: { type: "array", description: "Array of email addresses" } }, ["summary", "start", "end"]), handler: async (i) => createEvent(i.calendar_id as string || "primary", i.summary as string, i.start as string, i.end as string, i.description as string || "", i.location as string || "", (i.attendees as string[]) || []), category: "calendar", permission: "write" }),
    defineTool({ name: "calendar_quick_add", description: "Add event from natural language (e.g. 'Coffee with Sam tomorrow 3pm')", inputSchema: inputSchema({ text: { type: "string", description: "Natural language event" }, calendar_id: { type: "string", description: "Calendar" } }, ["text"]), handler: async (i) => quickAdd(i.calendar_id as string || "primary", i.text as string), category: "calendar", permission: "write" }),
    defineTool({ name: "calendar_update_event", description: "Update an event (provide updates as JSON)", inputSchema: inputSchema({ calendar_id: { type: "string", description: "Calendar" }, event_id: { type: "string", description: "Event ID" }, updates: { type: "string", description: "JSON updates" } }, ["event_id", "updates"]), handler: async (i) => { let u = {}; try { u = JSON.parse(i.updates as string); } catch { return { success: false, error: "Invalid updates JSON" }; } return updateEvent(i.calendar_id as string || "primary", i.event_id as string, u); }, category: "calendar", permission: "write" }),
    defineTool({ name: "calendar_delete_event", description: "Delete an event", inputSchema: inputSchema({ calendar_id: { type: "string", description: "Calendar" }, event_id: { type: "string", description: "Event ID" } }, ["event_id"]), handler: async (i) => deleteEvent(i.calendar_id as string || "primary", i.event_id as string), category: "calendar", permission: "write" }),
    defineTool({ name: "calendar_list_calendars", description: "List all accessible calendars", inputSchema: inputSchema({}), handler: async () => listCalendars(), category: "calendar" }),
  ]

});
