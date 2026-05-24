// ============================================================
// 🌒 OpenVesper Gateway
// ============================================================
//
// Hub-and-spoke. Loopback bound (127.0.0.1) by default.
//
// PRIVACY: No OpenVesper servers receive any data. Everything in this
// process lives on the user's machine. Session state is in ~/.openvesper/.

import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, type WebSocket } from "ws";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { agentLoop } from "./agent-loop.js";
import { sessionStore } from "./sessions.js";
import { sessionLanes } from "./session-lane.js";
import { commandQueue, type QueueMode } from "./queue.js";
import { runRegistry } from "./run-registry.js";
import { HeartbeatDaemon } from "./heartbeat.js";
import { hooks } from "./hooks.js";
import { SSEWriter, WSWriter, streamText } from "./streaming.js";
import { compactSession, sessionTokens, shouldAutoCompact } from "./compaction.js";
import { agentRouter } from "./router.js";
import { delegate, handoff } from "./delegate.js";
import {
  BUILTIN_PROVIDERS,
  runOAuthFlow,
  loadTokens,
  deleteTokens,
  listProviders,
  type OAuthProvider,
} from "./oauth.js";
import { taskManager } from "./tasks.js";
import { standingOrders } from "./standing-orders.js";
import { commitments } from "./commitments.js";
import { approvals } from "./approvals.js";
import { audit } from "./audit.js";
import { loopDetector } from "./observability.js";
import { generateDiagnostics, exportDiagnostics } from "./diagnostics.js";
import { memoryEngine } from "./memory-engine.js";
import { contextEngine } from "./context-engine.js";
import { runSubAgents } from "./delegate.js";
import { channelRouter, accessGroups } from "./channel-routing.js";
import { allTunnelOptions } from "./remote-gateway.js";
import { workspaceManager } from "./workspaces.js";
import { pairingStore, decideGate, PairingPolicy } from "./pairing.js";
import { installDevWatcher, installSkillsWatcher } from "./plugin-watcher.js";

// Read our own version from package.json so we don't drift from real version
const __dirname_ = path.dirname(fileURLToPath(import.meta.url));
let GATEWAY_VERSION = "unknown";
try {
  // dist/index.js → ../../package.json (gateway package root)
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname_, "..", "package.json"), "utf-8")
  );
  GATEWAY_VERSION = String(pkg.version || "unknown");
} catch {
  // ignore — version stays "unknown"
}

// ── Configuration ────────────────────────────────────────────────────

const HOST = process.env.OPENVESPER_GATEWAY_HOST || "127.0.0.1";
const PORT = parseInt(process.env.OPENVESPER_GATEWAY_PORT || "18789", 10);
const AGENTS_DIR =
  process.env.OPENVESPER_AGENTS_DIR ||
  path.join(process.cwd(), ".agents");
const HEARTBEAT_CHECK_MS = parseInt(process.env.OPENVESPER_HEARTBEAT_INTERVAL || "60000", 10);

// ── App setup ────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: "http://localhost:3000" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: GATEWAY_VERSION,
    uptime: process.uptime(),
    nodeVersion: process.version,
    memory: process.memoryUsage(),
    hooks: hooks.list(),
    lanes: sessionLanes.status(),
    runs: runRegistry.status(),
    tasks: taskManager.status(),
    commitments: commitments.status(),
    pendingApprovals: approvals.listPending().length,
    sessionsActive: sessionStore.list().length,
    agentsKnown: agentRouter.listRoutes().length,
    heartbeat: heartbeat.status(),
  });
});

// ── REST: synchronous agent run ──────────────────────────────────────

app.post("/agent", async (req, res) => {
  const { sessionKey, message, channel, agent } = req.body || {};
  if (!sessionKey || !message) {
    return res.status(400).json({ error: "sessionKey and message required" });
  }
  try {
    const result = await agentLoop.run({
      sessionKey: String(sessionKey),
      message: String(message),
      channel: String(channel || "rest"),
      agent: agent ? String(agent) : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

// ── REST: async agent run (OpenClaw-style) ───────────────────────────
// Returns { runId, acceptedAt } immediately. Use /agent/wait to block.

app.post("/agent/async", async (req, res) => {
  const { sessionKey, message, channel, agent } = req.body || {};
  if (!sessionKey || !message) {
    return res.status(400).json({ error: "sessionKey and message required" });
  }
  try {
    const result = await agentLoop.runAsync({
      sessionKey: String(sessionKey),
      message: String(message),
      channel: String(channel || "rest"),
      agent: agent ? String(agent) : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

app.get("/agent/run/:runId", (req, res) => {
  const r = runRegistry.get(req.params.runId);
  if (!r) return res.status(404).json({ error: "no such runId" });
  // Strip non-serializable abortController
  const { abortController, ...safe } = r;
  void abortController;
  res.json(safe);
});

app.post("/agent/run/:runId/wait", async (req, res) => {
  const timeoutMs = parseInt(req.query.timeoutMs as string) || 5 * 60 * 1000;
  try {
    const final = await runRegistry.wait(req.params.runId, timeoutMs);
    const { abortController, ...safe } = final;
    void abortController;
    res.json(safe);
  } catch (err) {
    res.status(408).json({ error: err instanceof Error ? err.message : "timeout" });
  }
});

app.post("/agent/run/:runId/abort", (req, res) => {
  const ok = runRegistry.abort(req.params.runId);
  res.json({ aborted: ok });
});

// ── SSE: streaming agent run ─────────────────────────────────────────

app.post("/agent/stream", async (req, res) => {
  const { sessionKey, message, channel, agent } = req.body || {};
  if (!sessionKey || !message) {
    return res.status(400).json({ error: "sessionKey and message required" });
  }
  const writer = new SSEWriter(res);
  writer.send({ type: "start", sessionId: "pending", agent: String(agent || "auto") });
  try {
    const result = await agentLoop.run({
      sessionKey: String(sessionKey),
      message: String(message),
      channel: String(channel || "sse"),
      agent: agent ? String(agent) : undefined,
    });
    await streamText(writer, result.reply);
    writer.send({ type: "done", reply: result.reply, durationMs: result.durationMs });
  } catch (err) {
    writer.send({ type: "error", error: err instanceof Error ? err.message : "unknown" });
  } finally {
    writer.close();
  }
});

// ── Session endpoints ────────────────────────────────────────────────

app.get("/sessions", (_req, res) => {
  res.json(
    sessionStore.list().map((s) => ({
      id: s.id,
      sessionKey: s.sessionKey,
      agent: s.agent,
      messageCount: s.messages.length,
      updatedAt: s.updatedAt,
    }))
  );
});

app.get("/sessions/:key", async (req, res) => {
  const session = await sessionStore.getOrCreate(req.params.key);
  res.json(session);
});

app.post("/sessions/:key/reset", async (req, res) => {
  await sessionStore.reset(req.params.key);
  res.json({ ok: true });
});

app.post("/sessions/:key/agent", async (req, res) => {
  const { agent } = req.body || {};
  if (!agent) return res.status(400).json({ error: "agent required" });
  await sessionStore.setAgent(req.params.key, String(agent));
  res.json({ ok: true });
});

// ── Compaction endpoints ─────────────────────────────────────────────

app.get("/sessions/:key/tokens", async (req, res) => {
  const session = await sessionStore.getOrCreate(req.params.key);
  const tokens = sessionTokens(session);
  res.json({
    sessionKey: req.params.key,
    messageCount: session.messages.length,
    estimatedTokens: tokens,
    shouldAutoCompact: shouldAutoCompact(session),
  });
});

app.post("/sessions/:key/compact", async (req, res) => {
  const { keepRecent, instructions } = req.body || {};
  try {
    const result = await compactSession(req.params.key, {
      keepRecent: keepRecent ?? 10,
      instructions,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

// ── Router endpoints ─────────────────────────────────────────────────

app.post("/agent/route", (req, res) => {
  const { message, currentAgent } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });
  const route = agentRouter.route(String(message), currentAgent || "auto");
  res.json(route);
});

app.get("/agent/routes", (_req, res) => {
  res.json(agentRouter.listRoutes());
});

// ── Delegate endpoints ───────────────────────────────────────────────

app.post("/agent/delegate", async (req, res) => {
  const { parentSessionKey, delegateAgent, query, channel, inheritContext } = req.body || {};
  if (!parentSessionKey || !delegateAgent || !query) {
    return res.status(400).json({
      error: "parentSessionKey, delegateAgent, query required",
    });
  }
  try {
    const result = await delegate({
      parentSessionKey: String(parentSessionKey),
      delegateAgent: String(delegateAgent),
      query: String(query),
      channel: String(channel || "delegate"),
      inheritContext: !!inheritContext,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

app.post("/agent/handoff", async (req, res) => {
  const { sessionKey, newAgent } = req.body || {};
  if (!sessionKey || !newAgent) {
    return res.status(400).json({ error: "sessionKey and newAgent required" });
  }
  try {
    await handoff(String(sessionKey), String(newAgent));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

// ── OAuth endpoints ──────────────────────────────────────────────────

app.post("/oauth/start", async (req, res) => {
  const { provider, clientId, clientSecret, scopes } = req.body || {};
  if (!provider || !clientId) {
    return res.status(400).json({ error: "provider and clientId required" });
  }

  const template = BUILTIN_PROVIDERS[provider as string];
  if (!template) {
    return res.status(400).json({
      error: `unknown provider: ${provider}. Built-in: ${Object.keys(BUILTIN_PROVIDERS).join(", ")}`,
    });
  }

  const fullProvider: OAuthProvider = {
    ...template,
    clientId: String(clientId),
    clientSecret: clientSecret ? String(clientSecret) : undefined,
    scopes: Array.isArray(scopes) && scopes.length > 0 ? scopes : template.scopes,
  };

  // Fire and forget — flow blocks on browser; respond with status URL
  runOAuthFlow(fullProvider)
    .then(() => console.log(`[oauth] ${provider} flow completed`))
    .catch((err) => console.error(`[oauth] ${provider} flow failed:`, err));

  res.json({
    status: "started",
    message: `Open the URL printed in the gateway logs to complete OAuth for ${provider}`,
  });
});

app.get("/oauth/tokens", async (_req, res) => {
  const providers = await listProviders();
  res.json({ providers });
});

app.get("/oauth/tokens/:provider", async (req, res) => {
  const tokens = await loadTokens(req.params.provider);
  if (!tokens) return res.status(404).json({ error: "no tokens for provider" });
  // Don't return raw tokens — just metadata
  res.json({
    provider: tokens.provider,
    hasRefreshToken: !!tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    scope: tokens.scope,
    savedAt: tokens.savedAt,
  });
});

app.delete("/oauth/tokens/:provider", async (req, res) => {
  const deleted = await deleteTokens(req.params.provider);
  res.json({ deleted });
});

// ── Background tasks ─────────────────────────────────────────────────

app.get("/tasks", async (req, res) => {
  const status = req.query.status as string | undefined;
  const sessionKey = req.query.sessionKey as string | undefined;
  const list = taskManager.list({ status: status as any, sessionKey });
  res.json(list);
});

app.post("/tasks", async (req, res) => {
  const { kind, sessionKey, agent, channel, payload, runAt, recurEveryMs } = req.body || {};
  if (!kind || !sessionKey || !payload) {
    return res.status(400).json({ error: "kind, sessionKey, payload required" });
  }
  const task = await taskManager.create({
    kind,
    sessionKey,
    agent,
    channel: channel || "rest",
    payload,
    runAt: runAt || Date.now(),
    recurEveryMs,
  });
  res.json(task);
});

app.delete("/tasks/:id", async (req, res) => {
  const ok = await taskManager.cancel(req.params.id);
  res.json({ cancelled: ok });
});

app.get("/tasks/status", (_req, res) => {
  res.json(taskManager.status());
});

// ── Standing orders ──────────────────────────────────────────────────

app.get("/standing-orders", async (req, res) => {
  const agent = req.query.agent as string | undefined;
  const kind = req.query.kind as any;
  const list = await standingOrders.list({ agent, kind });
  res.json(list);
});

app.post("/standing-orders", async (req, res) => {
  const { kind, agent, rule, triggerWhen, triggerAction } = req.body || {};
  if (!kind || !agent || !rule) {
    return res.status(400).json({ error: "kind, agent, rule required" });
  }
  const order = await standingOrders.create({ kind, agent, rule, triggerWhen, triggerAction });
  res.json(order);
});

app.delete("/standing-orders/:id", async (req, res) => {
  const ok = await standingOrders.remove(req.params.id);
  res.json({ removed: ok });
});

app.post("/standing-orders/:id/toggle", async (req, res) => {
  const order = await standingOrders.toggle(req.params.id);
  if (!order) return res.status(404).json({ error: "not found" });
  res.json(order);
});

// ── Commitments ──────────────────────────────────────────────────────

app.get("/commitments", async (req, res) => {
  const sessionKey = req.query.sessionKey as string | undefined;
  const agent = req.query.agent as string | undefined;
  const status = req.query.status as any;
  const list = await commitments.list({ sessionKey, agent, status });
  res.json(list);
});

app.post("/commitments", async (req, res) => {
  const { kind, sessionKey, agent, promise, dueAt, originalContext } = req.body || {};
  if (!kind || !sessionKey || !agent || !promise) {
    return res.status(400).json({ error: "kind, sessionKey, agent, promise required" });
  }
  const c = await commitments.create({ kind, sessionKey, agent, promise, dueAt, originalContext });
  res.json(c);
});

app.post("/commitments/:id/fulfill", async (req, res) => {
  const ok = await commitments.fulfill(req.params.id);
  res.json({ fulfilled: ok });
});

app.post("/commitments/:id/cancel", async (req, res) => {
  const ok = await commitments.cancel(req.params.id);
  res.json({ cancelled: ok });
});

// ── Approvals ────────────────────────────────────────────────────────

app.get("/approvals/pending", (_req, res) => {
  res.json(approvals.listPending());
});

app.post("/approvals/:id/decide", async (req, res) => {
  const { decision, decidedBy } = req.body || {};
  if (!decision || !["allow", "deny", "allow-and-remember"].includes(decision)) {
    return res.status(400).json({ error: "decision must be allow|deny|allow-and-remember" });
  }
  const ok = await approvals.decide(req.params.id, decision, decidedBy);
  res.json({ ok });
});

app.get("/approvals/rules", async (_req, res) => {
  res.json(await approvals.listRules());
});

app.post("/approvals/rules", async (req, res) => {
  const { toolPattern, agent, policy, reason } = req.body || {};
  if (!toolPattern || !agent || !policy) {
    return res.status(400).json({ error: "toolPattern, agent, policy required" });
  }
  await approvals.addRule({ toolPattern, agent, policy, reason });
  res.json({ ok: true });
});

app.delete("/approvals/rules/:index", async (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const ok = await approvals.removeRule(idx);
  res.json({ removed: ok });
});

// ── Audit logs ───────────────────────────────────────────────────────

app.get("/audit", async (req, res) => {
  const fromDate = req.query.from as string | undefined;
  const toDate = req.query.to as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const entries = await audit.read({ fromDate, toDate, limit });
  res.json(entries);
});

app.get("/audit/stats", async (req, res) => {
  const date = req.query.date as string | undefined;
  const stats = await audit.stats(date);
  res.json(stats);
});

app.get("/audit/dates", async (_req, res) => {
  res.json(await audit.availableDates());
});

// ── Diagnostics ──────────────────────────────────────────────────────

app.get("/diag", async (_req, res) => {
  const report = await generateDiagnostics({
    version: GATEWAY_VERSION,
    uptime: process.uptime(),
    agentsDir: AGENTS_DIR,
  });
  res.json(report);
});

app.post("/diag/export", async (_req, res) => {
  try {
    const outPath = await exportDiagnostics({
      version: GATEWAY_VERSION,
      uptime: process.uptime(),
      agentsDir: AGENTS_DIR,
    });
    res.json({ ok: true, path: outPath });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

// ── Memory engine ────────────────────────────────────────────────────

app.get("/memory/:agent", async (req, res) => {
  const tag = req.query.tag as string | undefined;
  const sessionKey = req.query.sessionKey as string | undefined;
  const entries = await memoryEngine.list(req.params.agent, { tag, sessionKey });
  res.json(entries);
});

app.post("/memory/:agent", async (req, res) => {
  const { content, tags, sessionKey, ttlMs } = req.body || {};
  if (!content) return res.status(400).json({ error: "content required" });
  const entry = await memoryEngine.write(req.params.agent, String(content), {
    tags, sessionKey, ttlMs,
  });
  res.json(entry);
});

app.post("/memory/:agent/search", async (req, res) => {
  const { query, limit } = req.body || {};
  if (!query) return res.status(400).json({ error: "query required" });
  const results = await memoryEngine.search(req.params.agent, String(query), limit || 10);
  res.json(results);
});

app.delete("/memory/:agent/:id", async (req, res) => {
  const ok = await memoryEngine.delete(req.params.agent, req.params.id);
  res.json({ deleted: ok });
});

app.delete("/memory/:agent", async (req, res) => {
  const count = await memoryEngine.clear(req.params.agent);
  res.json({ cleared: count });
});

// ── Session fork & branch ────────────────────────────────────────────

app.post("/sessions/:key/fork", async (req, res) => {
  const { newSessionKey } = req.body || {};
  if (!newSessionKey) return res.status(400).json({ error: "newSessionKey required" });
  try {
    const fork = await sessionStore.fork(req.params.key, String(newSessionKey));
    res.json(fork);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

app.post("/sessions/:key/branch", async (req, res) => {
  const { newSessionKey, messageIndex } = req.body || {};
  if (!newSessionKey || messageIndex === undefined) {
    return res.status(400).json({ error: "newSessionKey and messageIndex required" });
  }
  try {
    const branch = await sessionStore.branchAt(
      req.params.key,
      String(newSessionKey),
      parseInt(String(messageIndex), 10)
    );
    res.json(branch);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

// ── Sub-agents (parallel) ────────────────────────────────────────────

app.post("/agent/subagents", async (req, res) => {
  const { parentSessionKey, tasks, channel } = req.body || {};
  if (!parentSessionKey || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "parentSessionKey and tasks[] required" });
  }
  if (tasks.length > 10) {
    return res.status(400).json({ error: "max 10 sub-agents at once" });
  }
  try {
    const results = await runSubAgents(parentSessionKey, tasks, channel || "subagent");
    res.json({ count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

// ── Context engine inspection ────────────────────────────────────────

app.post("/agent/:agent/context", async (req, res) => {
  const { sessionKey, recentMessages, includeLayers, excludeLayers } = req.body || {};
  if (!sessionKey) return res.status(400).json({ error: "sessionKey required" });
  try {
    const built = await contextEngine.build({
      agent: req.params.agent,
      sessionKey,
      recentMessages,
      includeLayers,
      excludeLayers,
      agentsDir: AGENTS_DIR,
    });
    res.json({
      promptLength: built.prompt.length,
      layers: built.layers.map((l) => ({
        name: l.name,
        priority: l.priority,
        enabled: l.enabled,
        length: l.content.length,
      })),
      prompt: built.prompt,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

// ── Channel routes ───────────────────────────────────────────────────

app.get("/channel-routes", async (_req, res) => {
  res.json(await channelRouter.list());
});

app.post("/channel-routes", async (req, res) => {
  const { pattern, agent, priority, label } = req.body || {};
  if (!pattern || !agent) return res.status(400).json({ error: "pattern and agent required" });
  await channelRouter.add({ pattern, agent, priority, label });
  res.json({ ok: true });
});

app.delete("/channel-routes/:index", async (req, res) => {
  const ok = await channelRouter.remove(parseInt(req.params.index, 10));
  res.json({ removed: ok });
});

app.post("/channel-routes/resolve", async (req, res) => {
  const { channel, identity } = req.body || {};
  if (!channel || !identity) return res.status(400).json({ error: "channel and identity required" });
  const agent = await channelRouter.resolve(channel, identity);
  res.json({ agent });
});

// ── Access groups ────────────────────────────────────────────────────

app.get("/access", async (_req, res) => {
  res.json(await accessGroups.list());
});

app.post("/access", async (req, res) => {
  const { agent, allow, deny, label } = req.body || {};
  if (!agent) return res.status(400).json({ error: "agent required" });
  await accessGroups.add({ agent, allow, deny, label });
  res.json({ ok: true });
});

app.delete("/access/:index", async (req, res) => {
  const ok = await accessGroups.remove(parseInt(req.params.index, 10));
  res.json({ removed: ok });
});

app.post("/access/check", async (req, res) => {
  const { agent, channel, identity } = req.body || {};
  if (!agent || !channel || !identity) {
    return res.status(400).json({ error: "agent, channel, identity required" });
  }
  res.json(await accessGroups.check(agent, channel, identity));
});

// ── Remote gateway helpers ───────────────────────────────────────────

app.post("/remote/instructions", (req, res) => {
  const { host, user, port, localPort, remotePort } = req.body || {};
  if (!host) return res.status(400).json({ error: "host required" });
  const options = allTunnelOptions({ host, user, port, localPort, remotePort });
  res.json({ host, options });
});

// ── Workspaces (multiple gateways) ───────────────────────────────────

app.get("/workspaces", async (_req, res) => {
  res.json(await workspaceManager.list());
});

app.post("/workspaces", async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const ws = await workspaceManager.create(String(name));
    res.json(ws);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "unknown" });
  }
});

app.delete("/workspaces/:name", async (req, res) => {
  const ok = await workspaceManager.remove(req.params.name);
  res.json({ removed: ok });
});

app.get("/workspaces/:name/env", async (req, res) => {
  const env = await workspaceManager.envFor(req.params.name);
  if (!env) return res.status(404).json({ error: "workspace not found" });
  res.json(env);
});

// ── DM Pairing endpoints ─────────────────────────────────────────────

app.get("/pairing/pending", async (req, res) => {
  const channel = req.query.channel as string | undefined;
  res.json(await pairingStore.listPending(channel));
});

app.get("/pairing/approved", async (req, res) => {
  const channel = req.query.channel as string | undefined;
  res.json(await pairingStore.listApproved(channel));
});

app.get("/pairing/all", async (_req, res) => {
  res.json(await pairingStore.listAll());
});

app.post("/pairing/approve-code", async (req, res) => {
  const { channel, code } = req.body || {};
  if (!channel || !code) {
    return res.status(400).json({ error: "channel and code required" });
  }
  const entry = await pairingStore.approveByCode(channel, String(code));
  if (!entry) return res.status(404).json({ error: "code not found or expired" });
  res.json(entry);
});

app.post("/pairing/approve", async (req, res) => {
  const { channel, identity } = req.body || {};
  if (!channel || !identity) {
    return res.status(400).json({ error: "channel and identity required" });
  }
  const entry = await pairingStore.approve(channel, identity);
  res.json(entry);
});

app.post("/pairing/deny", async (req, res) => {
  const { channel, identity } = req.body || {};
  if (!channel || !identity) {
    return res.status(400).json({ error: "channel and identity required" });
  }
  const entry = await pairingStore.deny(channel, identity);
  res.json(entry);
});

app.post("/pairing/revoke", async (req, res) => {
  const { channel, identity } = req.body || {};
  if (!channel || !identity) {
    return res.status(400).json({ error: "channel and identity required" });
  }
  const removed = await pairingStore.revoke(channel, identity);
  res.json({ removed });
});

/**
 * Gate check — channels call this before delivering an inbound message
 * to the agent. Returns the decision (process / reply-with-code / drop /
 * reject). Channel adapters implement the actual reply / drop behavior.
 */
app.post("/pairing/gate", async (req, res) => {
  const { channel, identity, policy, displayName } = req.body || {};
  if (!channel || !identity) {
    return res.status(400).json({ error: "channel and identity required" });
  }
  const decision = await decideGate(
    pairingStore,
    channel,
    identity,
    (policy as PairingPolicy) || "pairing",
    displayName
  );
  res.json(decision);
});

// ── Queue control endpoints ──────────────────────────────────────────

app.get("/sessions/:key/queue", (req, res) => {
  res.json({
    mode: commandQueue.getMode(req.params.key),
    pending: commandQueue.peek(req.params.key),
  });
});

app.post("/sessions/:key/queue/mode", (req, res) => {
  const { mode, debounceMs, cap, drop } = req.body || {};
  const validModes = ["steer", "followup", "collect"];
  if (mode && !validModes.includes(mode)) {
    return res.status(400).json({ error: `invalid mode, must be ${validModes.join("|")}` });
  }
  const opts = commandQueue.setSessionMode(req.params.key, {
    mode: mode as QueueMode,
    debounceMs,
    cap,
    drop,
  });
  res.json(opts);
});

// ── Lane status ──────────────────────────────────────────────────────

app.get("/lanes", (_req, res) => {
  res.json(sessionLanes.status());
});

// ── HTTP + WebSocket server ──────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

interface WSClient {
  ws: WebSocket;
  sessionKey?: string;
  channel?: string;
}

const wsClients = new Set<WSClient>();

wss.on("connection", (ws) => {
  const client: WSClient = { ws };
  wsClients.add(client);

  ws.on("message", async (raw) => {
    let msg: { type: string; sessionKey?: string; message?: string; channel?: string; agent?: string };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "invalid json" }));
      return;
    }

    if (msg.type === "register") {
      client.sessionKey = msg.sessionKey;
      client.channel = msg.channel || "ws";
      ws.send(JSON.stringify({ type: "registered", sessionKey: client.sessionKey }));
      return;
    }

    if (msg.type === "message" && msg.sessionKey && msg.message) {
      const writer = new WSWriter(ws);
      writer.send({ type: "start", sessionId: "pending", agent: msg.agent || "auto" });
      try {
        const result = await agentLoop.run({
          sessionKey: msg.sessionKey,
          message: msg.message,
          channel: msg.channel || client.channel || "ws",
          agent: msg.agent,
        });
        await streamText(writer, result.reply);
        writer.send({ type: "done", reply: result.reply, durationMs: result.durationMs });
      } catch (err) {
        writer.send({ type: "error", error: err instanceof Error ? err.message : "unknown" });
      }
      return;
    }

    ws.send(JSON.stringify({ type: "error", error: `unknown type: ${msg.type}` }));
  });

  ws.on("close", () => {
    wsClients.delete(client);
  });
});

export function broadcastToSession(sessionKey: string, payload: unknown): void {
  for (const client of wsClients) {
    if (client.sessionKey !== sessionKey) continue;
    if (client.ws.readyState !== client.ws.OPEN) continue;
    client.ws.send(JSON.stringify(payload));
  }
}

// ── Heartbeat daemon ─────────────────────────────────────────────────

const heartbeat = new HeartbeatDaemon(AGENTS_DIR, async (channel, sessionKey, message) => {
  broadcastToSession(sessionKey, {
    type: "heartbeat",
    channel,
    message,
    timestamp: Date.now(),
  });
});

app.get("/heartbeat/status", (_req, res) => {
  res.json(heartbeat.status());
});

app.post("/heartbeat/reload", async (_req, res) => {
  await heartbeat.loadEnabledAgents();
  res.json(heartbeat.status());
});

// ── Start ────────────────────────────────────────────────────────────

async function start() {
  await sessionStore.ensureDir();
  await heartbeat.loadEnabledAgents();
  heartbeat.start(HEARTBEAT_CHECK_MS);

  // Initialize Sprint 1 systems
  await taskManager.init();
  taskManager.setExecutor(async (task) => {
    // For deferred-run tasks, use the agent loop
    if (task.kind === "deferred-run" || task.kind === "deferred-now") {
      const result = await agentLoop.run({
        sessionKey: task.sessionKey,
        message: task.payload,
        channel: task.channel,
        agent: task.agent,
      });
      return result.reply;
    }
    return task.payload;
  });
  taskManager.start();

  // Reminders broadcast to WS clients
  taskManager.on("reminder", ({ task, message }) => {
    broadcastToSession(task.sessionKey, {
      type: "reminder",
      taskId: task.id,
      message,
      timestamp: Date.now(),
    });
  });
  taskManager.on("complete", (task) => {
    if (task.kind === "deferred-now" || task.kind === "deferred-run") {
      broadcastToSession(task.sessionKey, {
        type: "task-complete",
        taskId: task.id,
        result: task.result,
        timestamp: Date.now(),
      });
    }
  });

  await standingOrders.load();
  await commitments.load();
  await approvals.load();
  await channelRouter.load();
  await accessGroups.load();
  await workspaceManager.load();
  await pairingStore.load();

  // Load agent router with bundled + user agents
  agentRouter.addAgentsDir(AGENTS_DIR);
  const os = await import("os");
  agentRouter.addAgentsDir(path.join(os.homedir(), ".openvesper", "agents"));
  await agentRouter.load();

  server.listen(PORT, HOST, () => {
    console.log("");
    console.log("🌒 OpenVesper Gateway v1.7.0");
    console.log(`   Listening on http://${HOST}:${PORT}`);
    console.log(`   WebSocket on  ws://${HOST}:${PORT}/ws`);
    console.log(`   Agents dir:   ${AGENTS_DIR}`);
    console.log(`   Heartbeats:   ${heartbeat.status().agentCount} enabled`);
    console.log(`   Router knows: ${agentRouter.listRoutes().length} agent(s)`);
    console.log(`   Max concurrent runs: ${process.env.OPENVESPER_MAX_CONCURRENT || "4"}`);
    console.log("");
    console.log("   Core endpoints:");
    console.log("     POST /agent                — sync run");
    console.log("     POST /agent/async          — async run, returns runId");
    console.log("     POST /agent/stream         — SSE streaming");
    console.log("     POST /agent/run/:runId/wait — block until complete");
    console.log("     POST /agent/run/:runId/abort — cancel run");
    console.log("");
    console.log("   Routing & delegation:");
    console.log("     POST /agent/route          — pick best specialist for a message");
    console.log("     POST /agent/delegate       — sub-query another agent");
    console.log("     POST /agent/handoff        — transfer session to another agent");
    console.log("");
    console.log("   Sessions & queue:");
    console.log("     GET  /sessions             — list");
    console.log("     POST /sessions/:key/reset");
    console.log("     POST /sessions/:key/compact — summarize old messages");
    console.log("     GET  /sessions/:key/tokens — token budget status");
    console.log("     POST /sessions/:key/queue/mode — steer/followup/collect");
    console.log("");
    console.log("   OAuth (local PKCE flow):");
    console.log("     POST /oauth/start          — begin OAuth dance");
    console.log("     GET  /oauth/tokens         — list authorized providers");
    console.log("     DELETE /oauth/tokens/:p    — revoke provider");
    console.log("");
    console.log("   Tasks & commitments (Sprint 1):");
    console.log("     POST /tasks                — schedule background task");
    console.log("     GET  /tasks                — list tasks");
    console.log("     DELETE /tasks/:id          — cancel task");
    console.log("     GET  /commitments          — agent commitments");
    console.log("     POST /commitments/:id/fulfill");
    console.log("     GET  /standing-orders      — persistent user rules");
    console.log("     POST /standing-orders      — create rule");
    console.log("     GET  /approvals/pending    — awaiting decision");
    console.log("     POST /approvals/:id/decide — allow|deny|allow-and-remember");
    console.log("");
    console.log("   Observability (Sprint 2):");
    console.log("     GET  /audit                — append-only event log");
    console.log("     GET  /audit/stats          — daily counts");
    console.log("     GET  /diag                 — full diagnostics report");
    console.log("     POST /diag/export          — save to file");
    console.log("");
    console.log("   Memory & sessions (Sprint 4):");
    console.log("     GET  /memory/:agent        — list active memory");
    console.log("     POST /memory/:agent        — add memory entry");
    console.log("     POST /memory/:agent/search — keyword search");
    console.log("     POST /sessions/:key/fork   — fork session");
    console.log("     POST /sessions/:key/branch — branch at message N");
    console.log("");
    console.log("   Advanced (Sprint 5-7):");
    console.log("     POST /agent/subagents      — parallel sub-agents");
    console.log("     POST /agent/:agent/context — inspect built system prompt");
    console.log("     GET  /channel-routes       — message routing rules");
    console.log("     GET  /access               — agent access groups");
    console.log("     POST /remote/instructions  — remote gateway tunnel commands");
    console.log("     GET  /workspaces           — multiple gateway profiles");
    console.log("");
    console.log("   Channel commands inside any message:");
    console.log("     /new /reset /status /agent /queue /compact /stop /help");
    console.log("");
    console.log("   🔒 Zero data retention. Bound to loopback only.");
    console.log("");
  });

  // Optional: hot-reload watcher (opt-in via OPENVESPER_DEV=1)
  devWatcher = installDevWatcher();

  // Skills watcher — pure markdown, no rebuild needed.
  // Enabled via OPENVESPER_DEV=1 or skills.load.watch in config.
  skillsWatcher = installSkillsWatcher(() => {
    // No-op for now; next session will pick up new skills automatically
    // via the loader. Future: bump a snapshot version to force live refresh
    // mid-session for the streaming UI.
  });
}

let devWatcher: ReturnType<typeof installDevWatcher> = null;
let skillsWatcher: ReturnType<typeof installSkillsWatcher> = null;

process.on("SIGTERM", () => {
  console.log("\n[gateway] shutting down...");
  heartbeat.stop();
  taskManager.stop();
  devWatcher?.stop();
  skillsWatcher?.stop();
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("\n[gateway] shutting down...");
  heartbeat.stop();
  taskManager.stop();
  devWatcher?.stop();
  skillsWatcher?.stop();
  server.close(() => process.exit(0));
});

start().catch((err) => {
  console.error("Failed to start gateway:", err);
  process.exit(1);
});
