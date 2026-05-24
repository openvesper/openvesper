// ============================================================
// 🌒 @openvesper/plugin-dns
// Cloudflare DNS management + DNS lookup tools
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── DNS Lookup (FREE — Google DoH) ─────────────────────────

async function dnsLookup(domain: string, type: string): Promise<ToolResult> {
  try {
    const t = (type || "A").toUpperCase();
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${t}`);
    if (!r.ok) return { success: false, error: `DNS lookup failed: ${r.status}` };
    const data = await r.json();

    return {
      success: true,
      data: {
        domain,
        type: t,
        records: (data.Answer || []).map((a: any) => ({
          name: a.name,
          type: a.type,
          ttl: a.TTL,
          data: a.data,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function reverseDns(ip: string): Promise<ToolResult> {
  try {
    // Reverse: 1.2.3.4 → 4.3.2.1.in-addr.arpa
    const parts = ip.split(".");
    if (parts.length !== 4) return { success: false, error: "Invalid IPv4 address" };
    const reversed = parts.reverse().join(".") + ".in-addr.arpa";

    const r = await fetch(`https://dns.google/resolve?name=${reversed}&type=PTR`);
    const data = await r.json();
    return {
      success: true,
      data: {
        ip,
        hostnames: (data.Answer || []).map((a: any) => a.data),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function whoisLookup(domain: string): Promise<ToolResult> {
  // Free WHOIS via whoisjson.com (1000 req/month) or RDAP
  try {
    const r = await fetch(`https://rdap.verisign.com/com/v1/domain/${domain.toLowerCase()}`);
    if (!r.ok) {
      // Try .org
      const r2 = await fetch(`https://rdap.publicinterestregistry.net/rdap/domain/${domain.toLowerCase()}`);
      if (!r2.ok) return { success: false, error: "WHOIS lookup not available for this TLD" };
      const d = await r2.json();
      return { success: true, data: parseRdap(d) };
    }
    const data = await r.json();
    return { success: true, data: parseRdap(data) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function parseRdap(data: any): any {
  const events = (data.events || []) as any[];
  return {
    handle: data.handle,
    domain: data.ldhName,
    status: data.status,
    nameservers: (data.nameservers || []).map((ns: any) => ns.ldhName),
    registration: events.find((e) => e.eventAction === "registration")?.eventDate,
    expiration: events.find((e) => e.eventAction === "expiration")?.eventDate,
    last_changed: events.find((e) => e.eventAction === "last changed")?.eventDate,
  };
}

// ── Cloudflare DNS Management ──────────────────────────────

async function cfApi(path: string, options: RequestInit = {}): Promise<ToolResult> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return { success: false, error: "CLOUDFLARE_API_TOKEN required" };

  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await r.json();
    if (!data.success) return { success: false, error: (data.errors || []).map((e: any) => e.message).join(", ") };
    return { success: true, data: data.result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function cfListZones(): Promise<ToolResult> {
  const r = await cfApi("/zones");
  if (!r.success) return r;
  return {
    success: true,
    data: {
      zones: (r.data as any[]).map((z) => ({
        id: z.id,
        name: z.name,
        status: z.status,
        nameservers: z.name_servers,
      })),
    },
  };
}

async function cfListDnsRecords(zoneId: string, type?: string): Promise<ToolResult> {
  const r = await cfApi(`/zones/${zoneId}/dns_records${type ? `?type=${type}` : ""}`);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      records: (r.data as any[]).map((rec) => ({
        id: rec.id,
        type: rec.type,
        name: rec.name,
        content: rec.content,
        ttl: rec.ttl,
        proxied: rec.proxied,
      })),
    },
  };
}

async function cfCreateDnsRecord(zoneId: string, type: string, name: string, content: string, ttl: number, proxied: boolean): Promise<ToolResult> {
  return cfApi(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({ type, name, content, ttl: ttl || 3600, proxied: proxied ?? false }),
  });
}

async function cfUpdateDnsRecord(zoneId: string, recordId: string, content: string): Promise<ToolResult> {
  return cfApi(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

async function cfDeleteDnsRecord(zoneId: string, recordId: string): Promise<ToolResult> {
  return cfApi(`/zones/${zoneId}/dns_records/${recordId}`, { method: "DELETE" });
}

async function cfPurgeCache(zoneId: string): Promise<ToolResult> {
  return cfApi(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ purge_everything: true }),
  });
}

export default definePlugin({
  name: "@openvesper/plugin-dns",
  version: "3.3.0",
  author: "OpenVesper",
  description: "DNS — Google DoH lookups (FREE), WHOIS, Cloudflare DNS management",
  license: "MIT",
  tools: [
    defineTool({ name: "dns_lookup", description: "Lookup DNS records (A, AAAA, MX, TXT, NS, CNAME, etc.)", inputSchema: inputSchema({ domain: { type: "string", description: "Domain name" }, type: { type: "string", description: "Record type (A, MX, TXT, etc.) default A" } }, ["domain"]), handler: async (i) => dnsLookup(i.domain as string, (i.type as string) || "A"), category: "dns" }),
    defineTool({ name: "reverse_dns", description: "Reverse DNS lookup (IP → hostname)", inputSchema: inputSchema({ ip: { type: "string", description: "IPv4 address" } }, ["ip"]), handler: async (i) => reverseDns(i.ip as string), category: "dns" }),
    defineTool({ name: "whois_lookup", description: "WHOIS info for a domain (registration, expiration, nameservers)", inputSchema: inputSchema({ domain: { type: "string", description: "Domain name" } }, ["domain"]), handler: async (i) => whoisLookup(i.domain as string), category: "dns" }),
    defineTool({ name: "cf_list_zones", description: "List Cloudflare zones (domains)", inputSchema: inputSchema({}), handler: async () => cfListZones(), category: "dns" }),
    defineTool({ name: "cf_list_dns_records", description: "List DNS records in a Cloudflare zone", inputSchema: inputSchema({ zone_id: { type: "string", description: "Zone ID" }, type: { type: "string", description: "Filter by type (optional)" } }, ["zone_id"]), handler: async (i) => cfListDnsRecords(i.zone_id as string, i.type as string), category: "dns" }),
    defineTool({ name: "cf_create_dns_record", description: "Create a new DNS record in Cloudflare", inputSchema: inputSchema({ zone_id: { type: "string" }, type: { type: "string", description: "A, AAAA, CNAME, MX, TXT, etc." }, name: { type: "string", description: "Record name (sub.example.com or @)" }, content: { type: "string", description: "Record content (IP, hostname, text)" }, ttl: { type: "number", description: "TTL seconds (default 3600, 1 = auto)" }, proxied: { type: "boolean", description: "Proxy through Cloudflare CDN" } }, ["zone_id", "type", "name", "content"]), handler: async (i) => cfCreateDnsRecord(i.zone_id as string, i.type as string, i.name as string, i.content as string, i.ttl as number, i.proxied as boolean), category: "dns", permission: "write" }),
    defineTool({ name: "cf_update_dns_record", description: "Update a Cloudflare DNS record's content", inputSchema: inputSchema({ zone_id: { type: "string" }, record_id: { type: "string" }, content: { type: "string" } }, ["zone_id", "record_id", "content"]), handler: async (i) => cfUpdateDnsRecord(i.zone_id as string, i.record_id as string, i.content as string), category: "dns", permission: "write" }),
    defineTool({ name: "cf_delete_dns_record", description: "Delete a Cloudflare DNS record", inputSchema: inputSchema({ zone_id: { type: "string" }, record_id: { type: "string" } }, ["zone_id", "record_id"]), handler: async (i) => cfDeleteDnsRecord(i.zone_id as string, i.record_id as string), category: "dns", permission: "write" }),
    defineTool({ name: "cf_purge_cache", description: "Purge entire Cloudflare cache for a zone", inputSchema: inputSchema({ zone_id: { type: "string" } }, ["zone_id"]), handler: async (i) => cfPurgeCache(i.zone_id as string), category: "dns", permission: "write" }),
  ],
});
