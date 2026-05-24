// ============================================================
// 🌒 @openvesper/plugin-tracking
// Multi-carrier package tracking (USPS, FedEx, DHL, UPS)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// Carrier detection from tracking number pattern
function detectCarrier(trackingNumber: string): string {
  const tn = trackingNumber.replace(/\s/g, "");

  // USPS: 20-22 digits, or starts with 9
  if (/^9[0-9]{19,21}$/.test(tn) || /^[A-Z]{2}[0-9]{9}US$/.test(tn)) return "usps";

  // UPS: 1Z followed by 16 chars
  if (/^1Z[A-Z0-9]{16}$/i.test(tn)) return "ups";

  // FedEx: 12, 15, or 20 digits
  if (/^[0-9]{12}$/.test(tn) || /^[0-9]{15}$/.test(tn) || /^[0-9]{20}$/.test(tn)) return "fedex";

  // DHL: 10 digits
  if (/^[0-9]{10}$/.test(tn)) return "dhl";

  return "unknown";
}

// ── USPS Tracking ──────────────────────────────────────────

async function trackUsps(trackingNumber: string): Promise<ToolResult> {
  const userId = process.env.USPS_USER_ID;
  if (!userId) return { success: false, error: "USPS_USER_ID required (free at https://www.usps.com/business/web-tools-apis/)" };

  try {
    const xml = `<TrackRequest USERID="${userId}"><TrackID ID="${trackingNumber}"/></TrackRequest>`;
    const r = await fetch(`https://secure.shippingapis.com/ShippingAPI.dll?API=TrackV2&XML=${encodeURIComponent(xml)}`);
    if (!r.ok) return { success: false, error: `USPS: ${r.status}` };
    const text = await r.text();

    // Parse XML response
    const summary = text.match(/<TrackSummary>([\s\S]*?)<\/TrackSummary>/)?.[1] || "";
    const events = [...text.matchAll(/<TrackDetail>(.*?)<\/TrackDetail>/g)].map((m) => m[1]);

    return {
      success: true,
      data: {
        carrier: "USPS",
        tracking_number: trackingNumber,
        summary: stripXmlTags(summary),
        history: events.map(stripXmlTags),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function stripXmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ── UPS Tracking (OAuth) ───────────────────────────────────

async function trackUps(trackingNumber: string): Promise<ToolResult> {
  const id = process.env.UPS_CLIENT_ID;
  const secret = process.env.UPS_CLIENT_SECRET;
  if (!id || !secret) return { success: false, error: "UPS_CLIENT_ID + UPS_CLIENT_SECRET required" };

  try {
    // Get OAuth token
    const tokenRes = await fetch("https://onlinetools.ups.com/security/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok) return { success: false, error: "UPS auth failed" };
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    const r = await fetch(`https://onlinetools.ups.com/api/track/v1/details/${trackingNumber}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { success: false, error: `UPS: ${r.status}` };
    const data = await r.json();
    const pkg = data.trackResponse?.shipment?.[0]?.package?.[0];
    if (!pkg) return { success: false, error: "Not found" };

    return {
      success: true,
      data: {
        carrier: "UPS",
        tracking_number: trackingNumber,
        status: pkg.currentStatus?.description,
        delivery_date: pkg.deliveryDate?.[0]?.date,
        history: (pkg.activity || []).map((a: any) => ({
          date: a.date,
          time: a.time,
          status: a.status?.description,
          location: a.location?.address?.city,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── FedEx Tracking ─────────────────────────────────────────

async function trackFedex(trackingNumber: string): Promise<ToolResult> {
  const id = process.env.FEDEX_CLIENT_ID;
  const secret = process.env.FEDEX_CLIENT_SECRET;
  if (!id || !secret) return { success: false, error: "FEDEX_CLIENT_ID + FEDEX_CLIENT_SECRET required" };

  try {
    const tokenRes = await fetch("https://apis.fedex.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${id}&client_secret=${secret}`,
    });
    if (!tokenRes.ok) return { success: false, error: "FedEx auth failed" };
    const token = (await tokenRes.json()).access_token;

    const r = await fetch("https://apis.fedex.com/track/v1/trackingnumbers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
        includeDetailedScans: true,
      }),
    });
    if (!r.ok) return { success: false, error: `FedEx: ${r.status}` };
    const data = await r.json();
    const result = data.output?.completeTrackResults?.[0]?.trackResults?.[0];
    if (!result) return { success: false, error: "Not found" };

    return {
      success: true,
      data: {
        carrier: "FedEx",
        tracking_number: trackingNumber,
        status: result.latestStatusDetail?.description,
        delivery_date: result.dateAndTimes?.find((d: any) => d.type === "ACTUAL_DELIVERY")?.dateTime,
        history: (result.scanEvents || []).map((e: any) => ({
          date: e.date,
          status: e.eventDescription,
          location: e.scanLocation?.city,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── DHL Tracking ───────────────────────────────────────────

async function trackDhl(trackingNumber: string): Promise<ToolResult> {
  const key = process.env.DHL_API_KEY;
  if (!key) return { success: false, error: "DHL_API_KEY required (free at https://developer.dhl.com)" };

  try {
    const r = await fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingNumber}`, {
      headers: { "DHL-API-Key": key },
    });
    if (!r.ok) return { success: false, error: `DHL: ${r.status}` };
    const data = await r.json();
    const shipment = data.shipments?.[0];
    if (!shipment) return { success: false, error: "Not found" };

    return {
      success: true,
      data: {
        carrier: "DHL",
        tracking_number: trackingNumber,
        status: shipment.status?.description,
        origin: shipment.origin?.address?.addressLocality,
        destination: shipment.destination?.address?.addressLocality,
        history: (shipment.events || []).map((e: any) => ({
          timestamp: e.timestamp,
          description: e.description,
          location: e.location?.address?.addressLocality,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Universal tracker ──────────────────────────────────────

async function trackPackage(trackingNumber: string, carrier?: string): Promise<ToolResult> {
  const c = (carrier || detectCarrier(trackingNumber)).toLowerCase();
  switch (c) {
    case "usps": return trackUsps(trackingNumber);
    case "ups":  return trackUps(trackingNumber);
    case "fedex": return trackFedex(trackingNumber);
    case "dhl":  return trackDhl(trackingNumber);
    case "unknown":
    default:
      return { success: false, error: `Could not detect carrier for "${trackingNumber}". Specify carrier explicitly.` };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-tracking",
  version: "3.3.0",
  author: "OpenVesper",
  description: "Tracking — Multi-carrier package tracking (USPS, UPS, FedEx, DHL)",
  license: "MIT",
  tools: [
    defineTool({ name: "track_package", description: "Track a package (auto-detects carrier from number pattern)", inputSchema: inputSchema({ tracking_number: { type: "string", description: "Tracking number" }, carrier: { type: "string", description: "Override: usps, ups, fedex, dhl (optional, auto-detected)" } }, ["tracking_number"]), handler: async (i) => trackPackage(i.tracking_number as string, i.carrier as string), category: "tracking" }),
    defineTool({ name: "detect_carrier", description: "Detect carrier from tracking number pattern", inputSchema: inputSchema({ tracking_number: { type: "string" } }, ["tracking_number"]), handler: async (i) => ({ success: true, data: { tracking_number: i.tracking_number, carrier: detectCarrier(i.tracking_number as string) } }), category: "tracking" }),
    defineTool({ name: "track_usps", description: "Track USPS package", inputSchema: inputSchema({ tracking_number: { type: "string" } }, ["tracking_number"]), handler: async (i) => trackUsps(i.tracking_number as string), category: "tracking" }),
    defineTool({ name: "track_ups", description: "Track UPS package", inputSchema: inputSchema({ tracking_number: { type: "string" } }, ["tracking_number"]), handler: async (i) => trackUps(i.tracking_number as string), category: "tracking" }),
    defineTool({ name: "track_fedex", description: "Track FedEx package", inputSchema: inputSchema({ tracking_number: { type: "string" } }, ["tracking_number"]), handler: async (i) => trackFedex(i.tracking_number as string), category: "tracking" }),
    defineTool({ name: "track_dhl", description: "Track DHL package", inputSchema: inputSchema({ tracking_number: { type: "string" } }, ["tracking_number"]), handler: async (i) => trackDhl(i.tracking_number as string), category: "tracking" }),
  ],
});
