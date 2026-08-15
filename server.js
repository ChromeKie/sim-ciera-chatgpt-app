import { createServer } from "node:http";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const APP_VERSION = "0.2.0";
const TEMPLATE_URI = "ui://sim-ciera/dashboard/v1.html";
const MCP_PATH = "/mcp";
const DATA_FILE = resolve(process.env.SIM_CIERA_DATA_FILE ?? "./data/store.json");
const UI_DOMAIN = (process.env.SIM_CIERA_UI_DOMAIN ?? "").trim();
const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = (process.env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();
const SIM_CIERA_STORE_ID = (process.env.SIM_CIERA_STORE_ID ?? "").trim();
const REMOTE_STORE_VALUES = [SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SIM_CIERA_STORE_ID];
const USE_REMOTE_STORE = REMOTE_STORE_VALUES.every(Boolean);

if (REMOTE_STORE_VALUES.some(Boolean) && !USE_REMOTE_STORE) {
  throw new Error(
    "Durable storage is only partially configured. Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SIM_CIERA_STORE_ID together."
  );
}

const MODES = [
  "SIM",
  "SIM DEEP",
  "SIM DECIDE",
  "SIM WRITE",
  "SIM BLIND",
  "SIM PREDICT",
  "SIM AUDIT",
];

const STATES = [
  "unspecified",
  "regulated",
  "work",
  "playful",
  "tired",
  "attachment-activated",
  "activated-parent",
];

const CORE_PRINCIPLES = [
  "Use Context → relationship/baseline → stakes → known facts → significance of anomaly → information strategy → practical consequences → response.",
  "Baseline is central. Stable flaws get planned around; deviations from reliable people carry more information.",
  "Preserve information. Detection does not require confrontation; adjacent questions, waiting, chronology, records, routines, timing, and structural verification may be more useful.",
  "Do not invent missing facts or motives. Sparse input remains ambiguous until evidence changes that.",
  "When someone confidently asserts something, often make them show their reasoning before revealing Sim-Ciera's evidence.",
  "State known facts directly when established, but revise immediately when decisive contrary evidence appears.",
  "Honesty is procedural as well as factual; voluntary self-damaging admissions carry more weight than admissions extracted after evidence is revealed.",
  "Care can precede final accountability. Ownership and repair matter more than prolonged guilt.",
  "Earned reliability can justify discretionary protection for a minor one-off failure; repeated unreliability sharply reduces that credit.",
  "At work, restore function before blame: real ETA, priorities, ownership, dependencies, and what can wait.",
  "Model state dependence explicitly. Regulated behavior and activated behavior can differ; do not substitute aspirational behavior for likely triggered behavior.",
  "Do not confuse annoyance with meaning, and do not reduce Ciera to trauma, confrontation, detective work, or intensity.",
];

const modeSchema = z.enum(MODES);
const stateSchema = z.enum(STATES);
const confidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
const classificationSchema = z.enum(["hit", "partial", "miss"]);

const predictionSchema = z.object({
  id: z.string(),
  scenario: z.string(),
  mode: modeSchema,
  state: stateSchema,
  conclusion: z.string(),
  reasoning: z.array(z.string()),
  confidence: confidenceSchema,
  establishedFacts: z.array(z.string()),
  modelInferences: z.array(z.string()),
  unknowns: z.array(z.string()),
  branches: z.array(z.string()),
  novelClaim: z.string().nullable(),
  createdAt: z.string(),
});

const baselineRuleSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
  createdAt: z.string(),
  demo: z.boolean(),
});

const calibrationSchema = z.object({
  id: z.string(),
  predictionId: z.string().nullable(),
  classification: classificationSchema,
  actual: z.string(),
  why: z.string(),
  proposedRule: z.string().nullable(),
  status: z.enum(["proposed", "promoted", "rejected"]),
  promotedBaselineId: z.string().nullable(),
  createdAt: z.string(),
  demo: z.boolean(),
});

const auditSchema = z.object({
  id: z.string(),
  predictionId: z.string(),
  classification: classificationSchema,
  actual: z.string(),
  why: z.string(),
  proposedRule: z.string().nullable(),
  calibrationId: z.string().nullable(),
  novelPredictionConfirmed: z.boolean(),
  createdAt: z.string(),
});

function emptyStore() {
  return {
    version: 1,
    baselineRules: [],
    calibrations: [],
    predictions: [],
    audits: [],
    misses: [],
    syntheticHits: [],
  };
}

function normalizeStore(parsed = {}) {
  return {
    version: parsed.version ?? 1,
    baselineRules: Array.isArray(parsed.baselineRules) ? parsed.baselineRules : [],
    calibrations: Array.isArray(parsed.calibrations) ? parsed.calibrations : [],
    predictions: Array.isArray(parsed.predictions) ? parsed.predictions : [],
    audits: Array.isArray(parsed.audits) ? parsed.audits : [],
    misses: Array.isArray(parsed.misses) ? parsed.misses : [],
    syntheticHits: Array.isArray(parsed.syntheticHits) ? parsed.syntheticHits : [],
  };
}

function ensureLocalStore() {
  if (existsSync(DATA_FILE)) return;
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeLocalStore(emptyStore());
}

function readLocalStore() {
  ensureLocalStore();
  return normalizeStore(JSON.parse(readFileSync(DATA_FILE, "utf8")));
}

function writeLocalStore(store) {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  const temp = `${DATA_FILE}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  renameSync(temp, DATA_FILE);
}

function remoteStoreHeaders(extra = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    "x-sim-ciera-store-id": SIM_CIERA_STORE_ID,
    ...extra,
  };
}

async function writeRemoteStore(store) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/sim_ciera_state`, {
    method: "POST",
    headers: remoteStoreHeaders({
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify({
      id: SIM_CIERA_STORE_ID,
      payload: normalizeStore(store),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error(`Durable store write failed with HTTP ${response.status}.`);
  }
}

async function readRemoteStore() {
  const query = new URLSearchParams({
    select: "payload",
    id: `eq.${SIM_CIERA_STORE_ID}`,
    limit: "1",
  });
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/sim_ciera_state?${query.toString()}`,
    { headers: remoteStoreHeaders({ accept: "application/json" }) }
  );
  if (!response.ok) {
    throw new Error(`Durable store read failed with HTTP ${response.status}.`);
  }
  const rows = await response.json();
  if (Array.isArray(rows) && rows[0]?.payload) return normalizeStore(rows[0].payload);

  const seed = readLocalStore();
  await writeRemoteStore(seed);
  return seed;
}

async function readStore() {
  return USE_REMOTE_STORE ? readRemoteStore() : readLocalStore();
}

async function writeStore(store) {
  if (USE_REMOTE_STORE) await writeRemoteStore(store);
  else writeLocalStore(store);
}

function newestFirst(items, limit = 25) {
  return [...items]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

function dashboardSnapshot(store) {
  return {
    counts: {
      predictions: store.predictions.length,
      baseline: store.baselineRules.length,
      calibrations: store.calibrations.length,
      misses: store.misses.length,
      syntheticHits: store.syntheticHits.length,
      audits: store.audits.length,
    },
    recentPredictions: newestFirst(store.predictions, 30),
    baselineRules: newestFirst(store.baselineRules, 40),
    calibrations: newestFirst(store.calibrations, 40),
    misses: newestFirst(store.misses, 30),
    syntheticHits: newestFirst(store.syntheticHits, 30),
    audits: newestFirst(store.audits, 30),
  };
}

function contentText(text) {
  return [{ type: "text", text }];
}

function renderWidgetHtml() {
  const shell = readFileSync(resolve("./public/widget-shell.html"), "utf8");
  const bundlePath = resolve("./public/widget.js");
  if (!existsSync(bundlePath)) {
    throw new Error("public/widget.js is missing. Run `npm run build` before starting the server.");
  }
  const js = readFileSync(bundlePath, "utf8");
  return shell.replace("__SIM_CIERA_WIDGET_JS__", js);
}

function widgetResourceMeta() {
  const ui = {
    prefersBorder: false,
    csp: { connectDomains: [], resourceDomains: [] },
  };
  if (UI_DOMAIN) ui.domain = UI_DOMAIN;
  return {
    ui,
    "openai/widgetDescription":
      "Sim-Ciera private model ledger and audit console. It distinguishes predictions from facts about Real Ciera.",
  };
}

function createSimCieraServer() {
  const server = new McpServer(
    { name: "sim-ciera", version: APP_VERSION },
    {
      instructions:
        "For Sim-Ciera judgments, call get_simulator_context first. Keep Real Ciera separate from Sim-Ciera predictions. Never invent missing facts or motives. Preserve failed predictions as misses. Use baseline and state before anomaly. After a real prediction, save it so it can be audited. Proposed calibration rules are not Baseline until explicitly promoted.",
    }
  );

  registerAppResource(
    server,
    "sim-ciera-dashboard",
    TEMPLATE_URI,
    {},
    async () => ({
      contents: [
        {
          uri: TEMPLATE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: renderWidgetHtml(),
          _meta: widgetResourceMeta(),
        },
      ],
    })
  );

  registerAppTool(
    server,
    "get_simulator_context",
    {
      title: "Load Sim-Ciera context",
      description:
        "Use this before making a Sim-Ciera judgment, prediction, decision, or written response. It returns the governing reasoning rules, current baseline rules, and the selected mode/state without changing data.",
      inputSchema: {
        mode: modeSchema.optional(),
        state: stateSchema.optional(),
      },
      outputSchema: {
        mode: modeSchema,
        state: stateSchema,
        principles: z.array(z.string()),
        baselineRules: z.array(baselineRuleSchema),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Loading Sim-Ciera…",
        "openai/toolInvocation/invoked": "Sim-Ciera context loaded",
      },
    },
    async ({ mode, state }) => {
      const store = await readStore();
      const selectedMode = mode ?? "SIM";
      const selectedState = state ?? "unspecified";
      return {
        structuredContent: {
          mode: selectedMode,
          state: selectedState,
          principles: CORE_PRINCIPLES,
          baselineRules: newestFirst(store.baselineRules, 40),
        },
        content: contentText(
          `Loaded Sim-Ciera ${selectedMode} context with state ${selectedState} and ${store.baselineRules.length} baseline rules.`
        ),
      };
    }
  );

  registerAppTool(
    server,
    "save_prediction",
    {
      title: "Save Sim-Ciera prediction",
      description:
        "Use this after Sim-Ciera has made a concrete prediction or judgment that may later be audited. Save what Sim-Ciera actually concluded before Real Ciera reveals the outcome; do not rewrite it later.",
      inputSchema: {
        scenario: z.string().min(1).max(12000),
        mode: modeSchema,
        state: stateSchema,
        conclusion: z.string().min(1).max(12000),
        reasoning: z.array(z.string().max(4000)).max(20).default([]),
        confidence: confidenceSchema,
        establishedFacts: z.array(z.string().max(4000)).max(30).default([]),
        modelInferences: z.array(z.string().max(4000)).max(30).default([]),
        unknowns: z.array(z.string().max(4000)).max(30).default([]),
        branches: z.array(z.string().max(4000)).max(10).default([]),
        novelClaim: z.string().max(4000).optional(),
      },
      outputSchema: {
        prediction: predictionSchema,
        dashboard: z.any(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Saving prediction…",
        "openai/toolInvocation/invoked": "Prediction saved",
      },
    },
    async (args) => {
      const store = await readStore();
      const prediction = {
        id: `pred-${randomUUID()}`,
        scenario: args.scenario.trim(),
        mode: args.mode,
        state: args.state,
        conclusion: args.conclusion.trim(),
        reasoning: args.reasoning ?? [],
        confidence: args.confidence,
        establishedFacts: args.establishedFacts ?? [],
        modelInferences: args.modelInferences ?? [],
        unknowns: args.unknowns ?? [],
        branches: args.branches ?? [],
        novelClaim: args.novelClaim?.trim() || null,
        createdAt: new Date().toISOString(),
      };
      store.predictions.push(prediction);
      await writeStore(store);
      return {
        structuredContent: { prediction, dashboard: dashboardSnapshot(store) },
        content: contentText(`Saved prediction ${prediction.id}.`),
      };
    }
  );

  registerAppTool(
    server,
    "list_predictions",
    {
      title: "List Sim-Ciera predictions",
      description:
        "Use this when the user wants to review prior Sim-Ciera predictions or choose one for an audit. This does not change data.",
      inputSchema: { limit: z.number().int().min(1).max(100).optional() },
      outputSchema: { predictions: z.array(predictionSchema) },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Loading predictions…",
        "openai/toolInvocation/invoked": "Predictions loaded",
      },
    },
    async ({ limit }) => {
      const predictions = newestFirst((await readStore()).predictions, limit ?? 30);
      return {
        structuredContent: { predictions },
        content: contentText(`Found ${predictions.length} saved predictions.`),
      };
    }
  );

  registerAppTool(
    server,
    "audit_prediction",
    {
      title: "Audit Sim-Ciera prediction",
      description:
        "Use this when Real Ciera reveals what actually happened after a saved prediction. Classify the original prediction as hit, partial, or miss; preserve the original prediction; optionally propose one generalized calibration rule.",
      inputSchema: {
        predictionId: z.string().min(1),
        classification: classificationSchema,
        actual: z.string().min(1).max(12000),
        why: z.string().min(1).max(12000),
        proposedRule: z.string().max(6000).optional(),
        novelPredictionConfirmed: z.boolean().default(false),
      },
      outputSchema: {
        audit: auditSchema,
        calibration: calibrationSchema.nullable(),
        dashboard: z.any(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Auditing prediction…",
        "openai/toolInvocation/invoked": "Audit recorded",
      },
    },
    async ({ predictionId, classification, actual, why, proposedRule, novelPredictionConfirmed }) => {
      const store = await readStore();
      const prediction = store.predictions.find((item) => item.id === predictionId);
      if (!prediction) {
        throw new Error(`Prediction ${predictionId} was not found.`);
      }

      const createdAt = new Date().toISOString();
      let calibration = null;
      if (proposedRule?.trim()) {
        calibration = {
          id: `cal-${randomUUID()}`,
          predictionId,
          classification,
          actual: actual.trim(),
          why: why.trim(),
          proposedRule: proposedRule.trim(),
          status: "proposed",
          promotedBaselineId: null,
          createdAt,
          demo: false,
        };
        store.calibrations.push(calibration);
      }

      const audit = {
        id: `audit-${randomUUID()}`,
        predictionId,
        classification,
        actual: actual.trim(),
        why: why.trim(),
        proposedRule: proposedRule?.trim() || null,
        calibrationId: calibration?.id ?? null,
        novelPredictionConfirmed: Boolean(novelPredictionConfirmed),
        createdAt,
      };
      store.audits.push(audit);

      if (classification === "miss") {
        store.misses.push({
          id: `miss-${randomUUID()}`,
          predictionId,
          conclusion: prediction.conclusion,
          actual: actual.trim(),
          why: why.trim(),
          createdAt,
        });
      }

      if (classification === "hit" && novelPredictionConfirmed) {
        store.syntheticHits.push({
          id: `hit-${randomUUID()}`,
          predictionId,
          conclusion: prediction.conclusion,
          novelClaim: prediction.novelClaim ?? prediction.conclusion,
          actual: actual.trim(),
          why: why.trim(),
          createdAt,
        });
      }

      await writeStore(store);
      return {
        structuredContent: { audit, calibration, dashboard: dashboardSnapshot(store) },
        content: contentText(
          calibration
            ? `Recorded ${classification} audit. Calibration ${calibration.id} is proposed and is not Baseline until explicitly promoted.`
            : `Recorded ${classification} audit without proposing a baseline change.`
        ),
      };
    }
  );

  registerAppTool(
    server,
    "promote_calibration",
    {
      title: "Promote calibration to Baseline",
      description:
        "Use this only after Real Ciera explicitly confirms that a proposed generalized calibration rule should become part of Sim-Ciera's Baseline.",
      inputSchema: {
        calibrationId: z.string().min(1),
        confirmedRuleText: z.string().min(1).max(6000).optional(),
      },
      outputSchema: {
        baselineRule: baselineRuleSchema,
        calibration: calibrationSchema,
        dashboard: z.any(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Promoting calibration…",
        "openai/toolInvocation/invoked": "Baseline updated",
      },
    },
    async ({ calibrationId, confirmedRuleText }) => {
      const store = await readStore();
      const calibration = store.calibrations.find((item) => item.id === calibrationId);
      if (!calibration) throw new Error(`Calibration ${calibrationId} was not found.`);

      if (calibration.status === "promoted" && calibration.promotedBaselineId) {
        const existing = store.baselineRules.find(
          (item) => item.id === calibration.promotedBaselineId
        );
        if (existing) {
          return {
            structuredContent: {
              baselineRule: existing,
              calibration,
              dashboard: dashboardSnapshot(store),
            },
            content: contentText("That calibration is already in Baseline."),
          };
        }
      }

      const text = confirmedRuleText?.trim() || calibration.proposedRule?.trim();
      if (!text) throw new Error("The calibration has no rule to promote.");

      const baselineRule = {
        id: `baseline-${randomUUID()}`,
        text,
        source: `Promoted from calibration ${calibration.id}`,
        createdAt: new Date().toISOString(),
        demo: false,
      };
      store.baselineRules.push(baselineRule);
      calibration.status = "promoted";
      calibration.promotedBaselineId = baselineRule.id;
      await writeStore(store);

      return {
        structuredContent: {
          baselineRule,
          calibration,
          dashboard: dashboardSnapshot(store),
        },
        content: contentText("Calibration promoted into Baseline."),
      };
    }
  );

  registerAppTool(
    server,
    "add_baseline_rule",
    {
      title: "Add confirmed baseline rule",
      description:
        "Use this only when Real Ciera directly states a stable generalized rule about her decision-making and explicitly wants it added to Sim-Ciera's Baseline. Do not infer a rule from one event with this tool.",
      inputSchema: {
        text: z.string().min(1).max(6000),
        source: z.string().min(1).max(2000),
      },
      outputSchema: { baselineRule: baselineRuleSchema, dashboard: z.any() },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Adding baseline rule…",
        "openai/toolInvocation/invoked": "Baseline rule added",
      },
    },
    async ({ text, source }) => {
      const store = await readStore();
      const baselineRule = {
        id: `baseline-${randomUUID()}`,
        text: text.trim(),
        source: source.trim(),
        createdAt: new Date().toISOString(),
        demo: false,
      };
      store.baselineRules.push(baselineRule);
      await writeStore(store);
      return {
        structuredContent: { baselineRule, dashboard: dashboardSnapshot(store) },
        content: contentText("Confirmed rule added to Baseline."),
      };
    }
  );

  registerAppTool(
    server,
    "render_dashboard",
    {
      title: "Open Sim-Ciera dashboard",
      description:
        "Use this when the user wants to open, inspect, or interact with the Sim-Ciera dashboard, Model Ledger, prediction history, or audit interface. It renders the current authoritative snapshot without changing data.",
      inputSchema: {
        focus: z.enum(["simulate", "predictions", "ledger", "audit"]).optional(),
      },
      outputSchema: {
        focus: z.enum(["simulate", "predictions", "ledger", "audit"]),
        dashboard: z.any(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        ui: { resourceUri: TEMPLATE_URI },
        "openai/outputTemplate": TEMPLATE_URI,
        "openai/toolInvocation/invoking": "Opening Sim-Ciera…",
        "openai/toolInvocation/invoked": "Sim-Ciera ready",
      },
    },
    async ({ focus }) => {
      const store = await readStore();
      return {
        structuredContent: {
          focus: focus ?? "simulate",
          dashboard: dashboardSnapshot(store),
        },
        content: contentText("Opened the Sim-Ciera dashboard."),
      };
    }
  );

  return server;
}

const port = Number(process.env.PORT ?? 8787);

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res
      .writeHead(200, { "content-type": "application/json; charset=utf-8" })
      .end(
        JSON.stringify({
          name: "sim-ciera",
          version: APP_VERSION,
          status: "ok",
          mcp: MCP_PATH,
        })
      );
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createSimCieraServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Sim-Ciera MCP server listening on http://localhost:${port}${MCP_PATH}`);
  console.log(
    USE_REMOTE_STORE
      ? "Persistence: durable Supabase ledger"
      : `Persistence: local data file ${DATA_FILE}`
  );
});
