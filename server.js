import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = resolve(process.env.SIM_CIERA_DATA_FILE || "./data/store.json");
const MCP_PATH = "/mcp";
const TEMPLATE_URI = "ui://sim-ciera/dashboard/v1.html";
const MODES = ["SIM","SIM DEEP","SIM DECIDE","SIM WRITE","SIM BLIND","SIM PREDICT","SIM AUDIT"];
const STATES = ["unspecified","regulated","work","playful","tired","attachment-activated","activated-parent"];
const modeSchema = z.enum(MODES);
const stateSchema = z.enum(STATES);
const classSchema = z.enum(["hit","partial","miss"]);

const PRINCIPLES = [
  "Context → relationship/baseline → stakes → known facts → significance of anomaly → information strategy → practical consequences → response.",
  "Baseline is central; stable flaws get planned around while deviations from reliable people matter more.",
  "Preserve information. Detection does not require confrontation; prefer structural verification when useful.",
  "Do not invent missing facts, intentions, or motives.",
  "Make confident claimants show their reasoning before revealing evidence when informational asymmetry matters.",
  "Keep Real Ciera separate from Sim-Ciera predictions.",
  "Preserve misses as misses and require confirmation before promoting calibration into Baseline.",
  "Model state dependence explicitly and do not substitute aspirational behavior for likely activated behavior.",
  "Do not confuse annoyance with meaning or reduce Ciera to trauma, detective work, confrontation, or intensity."
];

function blankStore() {
  return { version: 1, baselineRules: [], calibrations: [], predictions: [], audits: [], misses: [], syntheticHits: [] };
}
function readStore() {
  if (!existsSync(DATA_FILE)) return blankStore();
  return { ...blankStore(), ...JSON.parse(readFileSync(DATA_FILE, "utf8")) };
}
function writeStore(store) {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2) + "\n");
}
function text(value) { return [{ type: "text", text: value }]; }
function dashboard(store = readStore()) {
  return {
    counts: {
      predictions: store.predictions.length,
      baseline: store.baselineRules.length,
      calibrations: store.calibrations.length,
      misses: store.misses.length,
      syntheticHits: store.syntheticHits.length,
      audits: store.audits.length
    },
    recentPredictions: [...store.predictions].reverse().slice(0, 30),
    baselineRules: [...store.baselineRules].reverse().slice(0, 40),
    calibrations: [...store.calibrations].reverse().slice(0, 40),
    misses: [...store.misses].reverse().slice(0, 30),
    syntheticHits: [...store.syntheticHits].reverse().slice(0, 30),
    audits: [...store.audits].reverse().slice(0, 30)
  };
}
function widgetHtml() {
  const shell = readFileSync(resolve("./public/widget-shell.html"), "utf8");
  const js = readFileSync(resolve("./public/widget.js"), "utf8");
  return shell.replace("__SIM_CIERA_WIDGET_JS__", js);
}
function makeServer() {
  const server = new McpServer({ name: "sim-ciera", version: "0.1.0" }, {
    instructions: "For Sim-Ciera work, load simulator context first. Keep Real Ciera separate from predictions. Never invent missing facts or motives. Preserve prediction history. Proposed calibration is not Baseline until explicitly promoted."
  });

  registerAppResource(server, "sim-ciera-dashboard", TEMPLATE_URI, {}, async () => ({
    contents: [{
      uri: TEMPLATE_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: widgetHtml(),
      _meta: {
        ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } },
        "openai/widgetDescription": "Sim-Ciera private prediction ledger and audit console."
      }
    }]
  }));

  registerAppTool(server, "get_simulator_context", {
    title: "Load Sim-Ciera context",
    description: "Use this before making a Sim-Ciera prediction, judgment, decision, or written response.",
    inputSchema: { mode: modeSchema.optional(), state: stateSchema.optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true }
  }, async ({ mode, state }) => {
    const store = readStore();
    return { structuredContent: { mode: mode || "SIM", state: state || "unspecified", principles: PRINCIPLES, baselineRules: store.baselineRules }, content: text("Sim-Ciera context loaded.") };
  });

  registerAppTool(server, "save_prediction", {
    title: "Save Sim-Ciera prediction",
    description: "Use this after a concrete prediction so the original can later be audited without rewriting history.",
    inputSchema: {
      scenario: z.string().min(1), mode: modeSchema, state: stateSchema,
      conclusion: z.string().min(1), reasoning: z.array(z.string()).default([]),
      confidence: z.enum(["HIGH","MEDIUM","LOW"]), establishedFacts: z.array(z.string()).default([]),
      modelInferences: z.array(z.string()).default([]), unknowns: z.array(z.string()).default([]),
      branches: z.array(z.string()).default([]), novelClaim: z.string().optional()
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false }
  }, async (input) => {
    const store = readStore();
    const prediction = { id: `pred-${randomUUID()}`, ...input, novelClaim: input.novelClaim || null, createdAt: new Date().toISOString() };
    store.predictions.push(prediction); writeStore(store);
    return { structuredContent: { prediction, dashboard: dashboard(store) }, content: text("Prediction preserved for later audit.") };
  });

  registerAppTool(server, "list_predictions", {
    title: "List predictions", description: "Use this to review preserved Sim-Ciera predictions.",
    inputSchema: {}, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true }
  }, async () => ({ structuredContent: { predictions: dashboard().recentPredictions }, content: text("Prediction history loaded.") }));

  registerAppTool(server, "audit_prediction", {
    title: "Audit prediction",
    description: "Use this after Real Ciera reveals what actually happened. Preserve misses and optionally propose a generalized calibration rule.",
    inputSchema: { predictionId: z.string(), classification: classSchema, actual: z.string(), why: z.string(), proposedRule: z.string().optional(), novelPredictionConfirmed: z.boolean().default(false) },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false }
  }, async (input) => {
    const store = readStore();
    const prediction = store.predictions.find(p => p.id === input.predictionId);
    if (!prediction) throw new Error("Prediction not found");
    const createdAt = new Date().toISOString();
    let calibration = null;
    if (input.proposedRule?.trim()) {
      calibration = { id: `cal-${randomUUID()}`, predictionId: input.predictionId, classification: input.classification, actual: input.actual, why: input.why, proposedRule: input.proposedRule.trim(), status: "proposed", promotedBaselineId: null, createdAt, demo: false };
      store.calibrations.push(calibration);
    }
    const audit = { id: `audit-${randomUUID()}`, ...input, proposedRule: input.proposedRule || null, calibrationId: calibration?.id || null, createdAt };
    store.audits.push(audit);
    if (input.classification === "miss") store.misses.push({ id: `miss-${randomUUID()}`, predictionId: input.predictionId, conclusion: prediction.conclusion, actual: input.actual, why: input.why, createdAt });
    if (input.classification === "hit" && input.novelPredictionConfirmed) store.syntheticHits.push({ id: `hit-${randomUUID()}`, predictionId: input.predictionId, conclusion: prediction.conclusion, novelClaim: prediction.novelClaim || prediction.conclusion, actual: input.actual, why: input.why, createdAt });
    writeStore(store);
    return { structuredContent: { audit, calibration, dashboard: dashboard(store) }, content: text(calibration ? "Audit saved. Calibration remains proposed until explicitly promoted." : "Audit saved.") };
  });

  registerAppTool(server, "promote_calibration", {
    title: "Promote calibration to Baseline",
    description: "Use only after Real Ciera explicitly confirms a proposed generalized rule should become Baseline.",
    inputSchema: { calibrationId: z.string(), confirmedRuleText: z.string().optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: true }
  }, async ({ calibrationId, confirmedRuleText }) => {
    const store = readStore();
    const calibration = store.calibrations.find(c => c.id === calibrationId);
    if (!calibration) throw new Error("Calibration not found");
    if (calibration.status === "promoted") {
      const existing = store.baselineRules.find(r => r.id === calibration.promotedBaselineId);
      return { structuredContent: { baselineRule: existing, calibration, dashboard: dashboard(store) }, content: text("Calibration already promoted.") };
    }
    const rule = { id: `baseline-${randomUUID()}`, text: confirmedRuleText || calibration.proposedRule, source: `Promoted from ${calibration.id}`, createdAt: new Date().toISOString(), demo: false };
    store.baselineRules.push(rule); calibration.status = "promoted"; calibration.promotedBaselineId = rule.id; writeStore(store);
    return { structuredContent: { baselineRule: rule, calibration, dashboard: dashboard(store) }, content: text("Calibration promoted into Baseline.") };
  });

  registerAppTool(server, "add_baseline_rule", {
    title: "Add confirmed baseline rule",
    description: "Use only for a stable rule explicitly established by Real Ciera.",
    inputSchema: { text: z.string(), source: z.string() },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false }
  }, async ({ text: ruleText, source }) => {
    const store = readStore();
    const baselineRule = { id: `baseline-${randomUUID()}`, text: ruleText, source, createdAt: new Date().toISOString(), demo: false };
    store.baselineRules.push(baselineRule); writeStore(store);
    return { structuredContent: { baselineRule, dashboard: dashboard(store) }, content: text("Confirmed baseline rule added.") };
  });

  registerAppTool(server, "render_dashboard", {
    title: "Open Sim-Ciera dashboard",
    description: "Use when the user wants the Sim-Ciera dashboard, Model Ledger, prediction history, Evidence / Unknowns, or audit interface.",
    inputSchema: { focus: z.enum(["simulate","predictions","ledger","audit"]).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    _meta: { ui: { resourceUri: TEMPLATE_URI }, "openai/outputTemplate": TEMPLATE_URI }
  }, async ({ focus }) => ({ structuredContent: { focus: focus || "simulate", dashboard: dashboard() }, content: text("Sim-Ciera dashboard opened.") }));

  return server;
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ name: "sim-ciera", status: "ok", mcp: MCP_PATH })); return;
  }
  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", "Access-Control-Allow-Headers": "content-type,mcp-session-id", "Access-Control-Expose-Headers": "Mcp-Session-Id" }); res.end(); return;
  }
  if (url.pathname === MCP_PATH && ["POST","GET","DELETE"].includes(req.method || "")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    const server = makeServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try { await server.connect(transport); await transport.handleRequest(req, res); }
    catch (error) { console.error(error); if (!res.headersSent) res.writeHead(500).end("Internal server error"); }
    return;
  }
  res.writeHead(404).end("Not Found");
});

httpServer.listen(PORT, () => console.log(`Sim-Ciera MCP server listening on http://localhost:${PORT}${MCP_PATH}`));
