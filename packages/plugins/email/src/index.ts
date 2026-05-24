// ============================================================
// 🌒 @openvesper/plugin-email
// Email: Gmail API, SMTP send, IMAP read
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// Lazy load (optional deps)
let nodemailer: any = null;
let ImapFlow: any = null;

async function getNodemailer() {
  if (nodemailer) return nodemailer;
  try {
    nodemailer = await import("nodemailer" as any);
    return nodemailer;
  } catch {
    throw new Error("nodemailer not installed. Run: npm install nodemailer");
  }
}

async function getImap() {
  if (ImapFlow) return ImapFlow;
  try {
    const m = await import("imapflow" as any);
    ImapFlow = m.ImapFlow;
    return ImapFlow;
  } catch {
    throw new Error("imapflow not installed. Run: npm install imapflow");
  }
}

// ── SMTP Send (works with Gmail App Password, SendGrid, custom SMTP) ──

async function sendSmtpEmail(to: string, subject: string, body: string, html?: string): Promise<ToolResult> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    return { success: false, error: "SMTP_HOST, SMTP_USER, SMTP_PASS required in .env" };
  }

  try {
    const nm = await getNodemailer();
    const transporter = nm.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: html || body.replace(/\n/g, "<br>"),
    });

    return {
      success: true,
      data: { messageId: info.messageId, to, subject, from, response: info.response },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Gmail API (OAuth-based, more powerful) ──────────────────────────

async function sendGmailAPI(to: string, subject: string, body: string): Promise<ToolResult> {
  const token = process.env.GMAIL_ACCESS_TOKEN;
  const userEmail = process.env.GMAIL_USER || "me";
  if (!token) {
    return { success: false, error: "GMAIL_ACCESS_TOKEN required (OAuth2 access token)" };
  }

  // Build RFC 2822 message
  const message =
    `From: ${userEmail}\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
    body;

  const encoded = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data?.error?.message || `Gmail error: ${r.status}` };
    return { success: true, data: { messageId: data.id, threadId: data.threadId, to, subject } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Gmail API: list/search ───────────────────────────────────────────

async function listGmailMessages(query: string, maxResults: number): Promise<ToolResult> {
  const token = process.env.GMAIL_ACCESS_TOKEN;
  if (!token) return { success: false, error: "GMAIL_ACCESS_TOKEN required" };

  try {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    if (query) url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(maxResults || 10));

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data?.error?.message };

    // Fetch each message's snippet
    const messages = await Promise.all(
      (data.messages || []).slice(0, maxResults).map(async (m: { id: string }) => {
        const detailR = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const d = await detailR.json();
        const headers = d.payload?.headers || [];
        const getHeader = (n: string) => headers.find((h: { name: string; value: string }) => h.name === n)?.value;
        return {
          id: m.id,
          from: getHeader("From"),
          subject: getHeader("Subject"),
          date: getHeader("Date"),
          snippet: d.snippet,
        };
      })
    );

    return {
      success: true,
      data: { query, total: data.resultSizeEstimate, messages },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── IMAP read (any provider) ────────────────────────────────────────

async function imapReadInbox(limit: number): Promise<ToolResult> {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;
  if (!host || !user || !pass) {
    return { success: false, error: "IMAP_HOST, IMAP_USER, IMAP_PASS required" };
  }

  try {
    const ImapFlowClass = await getImap();
    const client = new ImapFlowClass({
      host,
      port: parseInt(process.env.IMAP_PORT || "993"),
      secure: true,
      auth: { user, pass },
      logger: false,
    });

    await client.connect();
    await client.mailboxOpen("INBOX");

    const messages: any[] = [];
    let count = 0;
    for await (const msg of client.fetch({ all: true }, { envelope: true, source: false, bodyStructure: true })) {
      if (count++ >= limit) break;
      messages.push({
        uid: msg.uid,
        from: msg.envelope?.from?.[0]?.address,
        subject: msg.envelope?.subject,
        date: msg.envelope?.date,
      });
    }
    await client.logout();

    return { success: true, data: { count: messages.length, messages: messages.reverse() } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-email",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Email: SMTP send, Gmail API, IMAP read",
  license: "MIT",
  tools: [
    defineTool({
      name: "send_email_smtp",
      description: "Send email via SMTP (Gmail App Password, SendGrid, etc.)",
      inputSchema: inputSchema({
        to: { type: "string", description: "Recipient email" },
        subject: { type: "string", description: "Subject" },
        body: { type: "string", description: "Body (text)" },
        html: { type: "string", description: "Optional HTML body" },
      }, ["to", "subject", "body"]),
      handler: async (i) => sendSmtpEmail(i.to as string, i.subject as string, i.body as string, i.html as string),
      category: "email",
      permission: "external",
    }),
    defineTool({
      name: "send_email_gmail",
      description: "Send email via Gmail API (requires GMAIL_ACCESS_TOKEN)",
      inputSchema: inputSchema({
        to: { type: "string", description: "Recipient" },
        subject: { type: "string", description: "Subject" },
        body: { type: "string", description: "Body" },
      }, ["to", "subject", "body"]),
      handler: async (i) => sendGmailAPI(i.to as string, i.subject as string, i.body as string),
      category: "email",
      permission: "external",
    }),
    defineTool({
      name: "list_gmail_messages",
      description: "List/search Gmail messages (Gmail query syntax: 'from:x@y subject:bar')",
      inputSchema: inputSchema({
        query: { type: "string", description: "Gmail query (optional)" },
        max_results: { type: "number", description: "Max results (default 10)" },
      }),
      handler: async (i) => listGmailMessages((i.query as string) || "", (i.max_results as number) || 10),
      category: "email",
      permission: "read",
    }),
    defineTool({
      name: "imap_read_inbox",
      description: "Read inbox via IMAP (any provider with IMAP_HOST, IMAP_USER, IMAP_PASS)",
      inputSchema: inputSchema({ limit: { type: "number", description: "Max emails" } }),
      handler: async (i) => imapReadInbox((i.limit as number) || 10),
      category: "email",
      permission: "read",
    }),
  ]

});
