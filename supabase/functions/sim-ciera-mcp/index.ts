import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const MODEL_REVISION = "0.3.0";
const URI = "ui://sim-ciera/dashboard/v0.3.0.html";
const MIME = "text/html;profile=mcp-app";
const modes = ["SIM", "SIM DEEP", "SIM DECIDE", "SIM WRITE", "SIM BLIND", "SIM PREDICT", "SIM AUDIT"];
const states = ["unspecified", "regulated", "work", "playful", "tired", "attachment-activated", "activated-parent"];
const noauth = [{ type: "noauth" }];

const principles = [
  "Keep REAL CIERA and SIM-CIERA separate. A model prediction never silently becomes a fact about Real Ciera.",
  "Reason in this order: context → relationship/baseline → stakes → known facts → anomaly significance → information strategy → practical consequences → response.",
  "Baseline is central. Stable flaws are usually forecasting information; unexpected deviations from reliable people carry more weight.",
  "Ciera is an information-preserving investigator, not primarily a confrontational one. Detection and confrontation are separate decisions.",
  "When uncontaminated information remains available, preserve informational asymmetry: stay casual, ask adjacent questions, watch what is volunteered, and compare versions.",
  "Prefer structural verification over interrogation when a claim can be tested by timing, transportation, records, account details, written rules, routines, opportunity, or chronology.",
  "When another person confidently asserts something contradictory, often make them show their reasoning first instead of immediately revealing Ciera's evidence.",
  "Do not use uncertainty language merely for politeness when Ciera treats a fact as established. Reverse immediately when decisive contrary evidence appears.",
  "If facts already reconstruct what happened, state the reconstruction rather than asking a question whose answer is already known.",
  "If someone falsely claims Ciera changed her behavior, correct the premise first rather than automatically counter-accusing.",
  "Honesty is procedural as well as factual. Voluntary ugly admissions and self-damaging details carry more credibility; explanations that change after evidence is revealed are discounted.",
  "Intent to create a false impression matters more than technical literal truth, but lies are still evaluated by stakes, motive, pattern, relationship, and consequences.",
  "With people Ciera genuinely cares about, immediate compassion can precede final adjudication. Reassurance is not necessarily absolution.",
  "Loyalty can include low-risk discretionary protection for reliably earned credit, but repeated unreliability and false ETAs sharply reduce that credit.",
  "Loyalty does not require factual allegiance. Ciera can protect someone publicly while privately correcting them, and can dislike someone while correcting a false allegation against them.",
  "Public false attribution to Ciera is generally corrected where it occurred; tone scales with stakes.",
  "Specific unsolicited behaviorally accurate praise is credible. Praise immediately attached to an ask may be reclassified as maneuvering without needing confrontation.",
  "Accurate criticism from a credible person can be accepted quickly. Unsupported motive attribution often gets a request for evidence first.",
  "Warnings from trusted people earn investigation, not automatic belief. Ask for observations underneath the conclusion and then quietly watch for the pattern.",
  "Privacy boundaries are relational. Broad access by close trusted friends is not inherently a violation; misuse, exposure, manipulation, alteration, or weaponization matters more.",
  "At work, restore function before blame: what must happen, real ETA, priorities, who can do it, and what can wait.",
  "Genuine ignorance gets more tolerance than performative helplessness. Likability does not compensate for repeatedly making others carry the work.",
  "Do not confuse annoyance with meaning. Irritation alone does not imply betrayal, rejection, manipulation, pathology, or danger.",
  "Model state dependence. Regulated, work, playful, tired, attachment-activated, parenting, and highly activated Mom Ciera may behave differently.",
  "With Ashton, distinguish parenting philosophy from likely behavior while activated. Do not substitute aspirational parenting for predictive parenting.",
  "Do not reduce Ciera to trauma, detective work, confrontation, intensity, or pattern recognition. She can be playful, absurd, affectionate, lazy, pragmatic, bored, amused, generous, or uninterested.",
  "Never invent missing real-world facts, motives, or actions to complete a simulation.",
  "In SIM BLIND, preserve blind-test integrity. After Real Ciera reveals the outcome, preserve the original prediction and audit it as hit, partial, or miss.",
];

const empty = () => ({
  version: 3,
  baselineRules: [],
  calibrations: [],
  predictions: [],
  audits: [],
  misses: [],
  syntheticHits: [],
});

async function load() {
  const { data, error } = await db.from("sim_ciera_store").select("data").eq("id", "primary").single();
  if (error) throw new Error(error.message);
  return { ...empty(), ...(data?.data || {}), version: 3 };
}

async function save(store: any) {
  const { error } = await db
    .from("sim_ciera_store")
    .update({ data: store, updated_at: new Date().toISOString() })
    .eq("id", "primary");
  if (error) throw new Error(error.message);
}

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const text = (value: string) => [{ type: "text", text: value }];
const strings = (value: any) => Array.isArray(value) ? value.filter((x: any) => typeof x === "string") : [];
function requiredString(value: any, name: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function dashboard(store: any) {
  return {
    modelRevision: MODEL_REVISION,
    counts: {
      predictions: store.predictions.length,
      baseline: store.baselineRules.length,
      calibrations: store.calibrations.length,
      misses: store.misses.length,
      syntheticHits: store.syntheticHits.length,
      audits: store.audits.length,
    },
    recentPredictions: [...store.predictions].reverse().slice(0, 30),
    baselineRules: [...store.baselineRules].reverse().slice(0, 40),
    calibrations: [...store.calibrations].reverse().slice(0, 40),
    misses: [...store.misses].reverse().slice(0, 30),
    syntheticHits: [...store.syntheticHits].reverse().slice(0, 30),
    audits: [...store.audits].reverse().slice(0, 30),
  };
}

const tools = [
  {
    name: "get_simulator_context",
    title: "Load Sim-Ciera context",
    description: "Use this before Sim-Ciera work when compatibility with the original app flow is useful. Returns the governing model, confirmed baseline rules, and current model revision.",
    inputSchema: { type: "object", properties: { mode: { type: "string", enum: modes }, state: { type: "string", enum: states } }, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: noauth,
  },
  {
    name: "prepare_simulation",
    title: "Prepare Sim-Ciera simulation",
    description: "Use this first for a new SIM, SIM DEEP, SIM DECIDE, SIM WRITE, SIM BLIND, or SIM PREDICT scenario. Normalize only known context and preserve unknowns before forming the prediction.",
    inputSchema: {
      type: "object",
      required: ["mode", "scenario"],
      properties: {
        mode: { type: "string", enum: modes.filter((x) => x !== "SIM AUDIT") },
        scenario: { type: "string" },
        relationshipBaseline: { type: "string" },
        stakes: { type: "string" },
        knownFacts: { type: "array", items: { type: "string" } },
        likelyState: { type: "string" },
        immediateContext: { type: "string" },
        unknowns: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: noauth,
  },
  {
    name: "save_prediction",
    title: "Save Sim-Ciera prediction",
    description: "Use this after a concrete independent prediction so the original remains auditable and cannot be rewritten after Real Ciera reveals the outcome.",
    inputSchema: {
      type: "object",
      required: ["scenario", "mode", "state", "conclusion", "confidence"],
      properties: {
        simulationId: { type: "string" },
        scenario: { type: "string" },
        mode: { type: "string", enum: modes.filter((x) => x !== "SIM AUDIT") },
        state: { type: "string", enum: states },
        conclusion: { type: "string" },
        reasoning: { type: "array", items: { type: "string" } },
        confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
        establishedFacts: { type: "array", items: { type: "string" } },
        modelInferences: { type: "array", items: { type: "string" } },
        unknowns: { type: "array", items: { type: "string" } },
        branches: { type: "array", items: { type: "string" } },
        novelClaim: { type: "string" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false },
    securitySchemes: noauth,
  },
  {
    name: "render_simulation",
    title: "Render Sim-Ciera prediction",
    description: "Use after the prediction is formed. Renders the final Sim-Ciera conclusion and material reasoning without changing the preserved prediction ledger.",
    inputSchema: {
      type: "object",
      required: ["conclusion", "mode", "confidence"],
      properties: {
        predictionId: { type: "string" },
        mode: { type: "string", enum: modes.filter((x) => x !== "SIM AUDIT") },
        conclusion: { type: "string" },
        confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
        reasoning: { type: "array", items: { type: "string" } },
        missingContext: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: noauth,
    _meta: { ui: { resourceUri: URI }, "openai/outputTemplate": URI },
  },
  {
    name: "list_predictions",
    title: "List predictions",
    description: "Use this to review preserved Sim-Ciera predictions.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: noauth,
  },
  {
    name: "audit_prediction",
    title: "Audit prediction",
    description: "Use after Real Ciera reveals what actually happened. Preserve the original prediction, classify it as hit, partial, or miss, and optionally propose a generalized calibration rule.",
    inputSchema: {
      type: "object",
      required: ["predictionId", "classification", "actual", "why"],
      properties: {
        predictionId: { type: "string" },
        classification: { type: "string", enum: ["hit", "partial", "miss"] },
        actual: { type: "string" },
        why: { type: "string" },
        proposedRule: { type: "string" },
        novelPredictionConfirmed: { type: "boolean" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false },
    securitySchemes: noauth,
  },
  {
    name: "promote_calibration",
    title: "Promote calibration to Baseline",
    description: "Use only after Real Ciera explicitly confirms a proposed generalized calibration rule should become an established Baseline rule.",
    inputSchema: { type: "object", required: ["calibrationId"], properties: { calibrationId: { type: "string" }, confirmedRuleText: { type: "string" } }, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: noauth,
  },
  {
    name: "add_baseline_rule",
    title: "Add confirmed baseline rule",
    description: "Use only for a stable generalized rule explicitly established by Real Ciera.",
    inputSchema: { type: "object", required: ["text", "source"], properties: { text: { type: "string" }, source: { type: "string" } }, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false },
    securitySchemes: noauth,
  },
  {
    name: "render_dashboard",
    title: "Open Sim-Ciera dashboard",
    description: "Use when the user wants the Sim-Ciera dashboard, Model Ledger, prediction history, misses, synthetic hits, calibration, or audit information.",
    inputSchema: { type: "object", properties: { focus: { type: "string", enum: ["simulate", "predictions", "ledger", "audit"] } }, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: noauth,
    _meta: { ui: { resourceUri: URI }, "openai/outputTemplate": URI },
  },
];

async function callTool(name: string, args: any) {
  const store = await load();

  if (name === "get_simulator_context") {
    return {
      structuredContent: {
        modelRevision: MODEL_REVISION,
        mode: modes.includes(args?.mode) ? args.mode : "SIM",
        state: states.includes(args?.state) ? args.state : "unspecified",
        principles,
        baselineRules: store.baselineRules,
      },
      content: text("Sim-Ciera v0.3 context loaded."),
    };
  }

  if (name === "prepare_simulation") {
    const packet = {
      simulationId: makeId("sim"),
      modelRevision: MODEL_REVISION,
      mode: args?.mode || "SIM",
      scenario: requiredString(args?.scenario, "scenario"),
      relationshipBaseline: typeof args?.relationshipBaseline === "string" ? args.relationshipBaseline : null,
      stakes: typeof args?.stakes === "string" ? args.stakes : null,
      knownFacts: strings(args?.knownFacts),
      likelyState: typeof args?.likelyState === "string" ? args.likelyState : null,
      immediateContext: typeof args?.immediateContext === "string" ? args.immediateContext : null,
      unknowns: strings(args?.unknowns),
      principles,
      baselineRules: store.baselineRules,
    };
    return { structuredContent: packet, content: text(`Simulation ${packet.simulationId} prepared. Apply the model independently, preserve unknowns, then save and render the prediction.`) };
  }

  if (name === "save_prediction") {
    const prediction = {
      id: makeId("pred"),
      simulationId: typeof args?.simulationId === "string" ? args.simulationId : null,
      modelRevision: MODEL_REVISION,
      scenario: requiredString(args?.scenario, "scenario"),
      mode: args?.mode || "SIM",
      state: states.includes(args?.state) ? args.state : "unspecified",
      conclusion: requiredString(args?.conclusion, "conclusion"),
      reasoning: strings(args?.reasoning),
      confidence: ["HIGH", "MEDIUM", "LOW"].includes(args?.confidence) ? args.confidence : "MEDIUM",
      establishedFacts: strings(args?.establishedFacts),
      modelInferences: strings(args?.modelInferences),
      unknowns: strings(args?.unknowns),
      branches: strings(args?.branches),
      novelClaim: typeof args?.novelClaim === "string" ? args.novelClaim : null,
      createdAt: new Date().toISOString(),
    };
    store.predictions.push(prediction);
    await save(store);
    return { structuredContent: { prediction, dashboard: dashboard(store) }, content: text("Prediction preserved for later audit.") };
  }

  if (name === "render_simulation") {
    return {
      structuredContent: {
        kind: "simulation",
        modelRevision: MODEL_REVISION,
        predictionId: typeof args?.predictionId === "string" ? args.predictionId : null,
        mode: args?.mode || "SIM",
        conclusion: requiredString(args?.conclusion, "conclusion"),
        confidence: ["HIGH", "MEDIUM", "LOW"].includes(args?.confidence) ? args.confidence : "MEDIUM",
        reasoning: strings(args?.reasoning),
        missingContext: strings(args?.missingContext),
      },
      content: text(`${args?.mode || "SIM"} — ${args?.confidence || "MEDIUM"} confidence\n${requiredString(args?.conclusion, "conclusion")}`),
    };
  }

  if (name === "list_predictions") {
    return { structuredContent: { modelRevision: MODEL_REVISION, predictions: dashboard(store).recentPredictions }, content: text("Prediction history loaded.") };
  }

  if (name === "audit_prediction") {
    const predictionId = requiredString(args?.predictionId, "predictionId");
    const prediction = store.predictions.find((x: any) => x.id === predictionId);
    if (!prediction) throw new Error("Prediction not found");
    const classification = ["hit", "partial", "miss"].includes(args?.classification) ? args.classification : "partial";
    const actual = requiredString(args?.actual, "actual");
    const why = requiredString(args?.why, "why");
    const createdAt = new Date().toISOString();

    let calibration: any = null;
    if (typeof args?.proposedRule === "string" && args.proposedRule.trim()) {
      calibration = {
        id: makeId("cal"),
        predictionId,
        classification,
        actual,
        why,
        proposedRule: args.proposedRule.trim(),
        status: "proposed",
        promotedBaselineId: null,
        createdAt,
      };
      store.calibrations.push(calibration);
    }

    const audit = {
      id: makeId("audit"),
      predictionId,
      originalConclusion: prediction.conclusion,
      classification,
      actual,
      why,
      proposedRule: calibration?.proposedRule || null,
      calibrationId: calibration?.id || null,
      novelPredictionConfirmed: !!args?.novelPredictionConfirmed,
      createdAt,
    };
    store.audits.push(audit);

    if (classification === "miss") {
      store.misses.push({ id: makeId("miss"), predictionId, conclusion: prediction.conclusion, actual, why, createdAt });
    }
    if (classification === "hit" && args?.novelPredictionConfirmed) {
      store.syntheticHits.push({ id: makeId("hit"), predictionId, conclusion: prediction.conclusion, novelClaim: prediction.novelClaim || prediction.conclusion, actual, why, createdAt });
    }

    await save(store);
    return {
      structuredContent: { audit, calibration, preservedPrediction: prediction, dashboard: dashboard(store) },
      content: text(calibration ? "Audit saved. The original prediction is preserved; calibration remains proposed until explicitly promoted." : "Audit saved. The original prediction is preserved."),
    };
  }

  if (name === "promote_calibration") {
    const calibrationId = requiredString(args?.calibrationId, "calibrationId");
    const calibration = store.calibrations.find((x: any) => x.id === calibrationId);
    if (!calibration) throw new Error("Calibration not found");
    if (calibration.status === "promoted") {
      const rule = store.baselineRules.find((x: any) => x.id === calibration.promotedBaselineId);
      return { structuredContent: { baselineRule: rule, calibration, dashboard: dashboard(store) }, content: text("Calibration already promoted.") };
    }
    const rule = {
      id: makeId("baseline"),
      text: typeof args?.confirmedRuleText === "string" && args.confirmedRuleText.trim() ? args.confirmedRuleText.trim() : calibration.proposedRule,
      source: `Promoted from ${calibration.id}`,
      createdAt: new Date().toISOString(),
    };
    store.baselineRules.push(rule);
    calibration.status = "promoted";
    calibration.promotedBaselineId = rule.id;
    await save(store);
    return { structuredContent: { baselineRule: rule, calibration, dashboard: dashboard(store) }, content: text("Calibration promoted into Baseline.") };
  }

  if (name === "add_baseline_rule") {
    const rule = { id: makeId("baseline"), text: requiredString(args?.text, "text"), source: requiredString(args?.source, "source"), createdAt: new Date().toISOString() };
    store.baselineRules.push(rule);
    await save(store);
    return { structuredContent: { baselineRule: rule, dashboard: dashboard(store) }, content: text("Confirmed baseline rule added.") };
  }

  if (name === "render_dashboard") {
    return {
      structuredContent: {
        kind: "dashboard",
        focus: ["simulate", "predictions", "ledger", "audit"].includes(args?.focus) ? args.focus : "simulate",
        dashboard: dashboard(store),
      },
      content: text("Sim-Ciera dashboard opened."),
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

const widget = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#0d0c0f;color:#f1ece5}body{margin:0;background:#0d0c0f}.app{padding:16px}.head{display:flex;gap:10px;align-items:center}.mark{width:40px;height:40px;border-radius:13px;background:#5e3347;display:grid;place-items:center;font-weight:800}.card{margin-top:12px;border:1px solid #292329;background:#151217;border-radius:15px;padding:15px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.stat{border:1px solid #302932;border-radius:10px;padding:10px}.stat b{display:block;font-size:22px}.sub{color:#aaa0a8;font-size:12px}.note{margin:8px 0;color:#cdbfc5;font-size:12px}.reason{margin:8px 0 0;padding-left:18px}.reason li{margin:5px 0}@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}</style></head><body><main class="app"><div class="head"><div class="mark">C</div><div><b>Sim-Ciera</b><div class="sub">v0.3 · predictive model, not Real Ciera</div></div></div><div class="note">Predictions stay predictions until audited. Misses remain misses.</div><div id="root"></div></main><script>function esc(s){return String(s??'').replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]))}function output(){return window.openai?.toolOutput||window.openai?.toolOutput?.structuredContent||{}}function draw(){const o=output();const root=document.getElementById('root');if(o.kind==='simulation'){root.innerHTML='<section class="card"><div class="sub">'+esc(o.mode)+' · '+esc(o.confidence)+' confidence</div><h3>'+esc(o.conclusion)+'</h3>'+(o.reasoning?.length?'<ul class="reason">'+o.reasoning.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+(o.missingContext?.length?'<div class="note">Unknown: '+o.missingContext.map(esc).join(' · ')+'</div>':'')+'</section>';return}const d=o.dashboard||{};const c=d.counts||{};root.innerHTML='<section class="card"><b>Model Ledger</b><div class="grid" style="margin-top:10px">'+[['Predictions',c.predictions],['Baseline',c.baseline],['Calibrations',c.calibrations],['Misses',c.misses],['Synthetic Hits',c.syntheticHits],['Audits',c.audits]].map(x=>'<div class="stat"><span class="sub">'+x[0]+'</span><b>'+esc(x[1]||0)+'</b></div>').join('')+'</div></section><section class="card"><b>Recent predictions</b><div class="sub" style="margin-top:10px">'+((d.recentPredictions||[]).length?(d.recentPredictions||[]).slice(0,8).map(p=>'<div style="padding:8px 0;border-bottom:1px solid #292329"><b style="color:#f1ece5">'+esc(p.conclusion)+'</b><div>'+esc(p.mode)+' · '+esc(p.state)+' · '+esc(p.confidence)+'</div></div>').join(''):'No saved predictions yet.')+'</div></section>'}window.addEventListener('message',e=>{if(e.data?.method==='ui/notifications/tool-result')setTimeout(draw,0)});draw();</script></body></html>`;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "Mcp-Session-Id",
};
function ok(id: any, result: any, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { status, headers: { "content-type": "application/json", ...cors } });
}
function fail(id: any, code: number, message: string, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), { status, headers: { "content-type": "application/json", ...cors } });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...cors, "access-control-allow-methods": "POST,GET,OPTIONS", "access-control-allow-headers": "content-type,accept,mcp-session-id,mcp-protocol-version" } });
  }
  if (request.method === "GET") {
    return new Response(JSON.stringify({ name: "sim-ciera", version: MODEL_REVISION, status: "ok", mcp: true }), { headers: { "content-type": "application/json", ...cors } });
  }
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body: any;
  try { body = await request.json(); } catch { return fail(null, -32700, "Parse error", 400); }
  if (Array.isArray(body)) return fail(null, -32600, "Batch not supported", 400);
  const id = body?.id ?? null;
  const method = body?.method;
  if (typeof method !== "string") return fail(id, -32600, "Invalid Request", 400);
  if (id === null) return new Response(null, { status: 202, headers: cors });

  try {
    if (method === "initialize") {
      return ok(id, {
        protocolVersion: "2025-06-18",
        capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
        serverInfo: { name: "sim-ciera", version: MODEL_REVISION },
        instructions: "For new simulations call prepare_simulation first. Apply the returned governing model yourself. Preserve unknowns and informational asymmetry. Save the independent prediction before Real Ciera reveals the outcome, then render it. For SIM AUDIT preserve the old prediction exactly, classify hit/partial/miss, and propose generalized calibration only from the correction. Never silently turn a Sim-Ciera prediction into a Real-Ciera fact.",
      });
    }
    if (method === "ping") return ok(id, {});
    if (method === "tools/list") return ok(id, { tools });
    if (method === "tools/call") return ok(id, await callTool(body?.params?.name, body?.params?.arguments || {}));
    if (method === "resources/list") return ok(id, { resources: [{ uri: URI, name: "Sim-Ciera v0.3", description: "Prediction card and model ledger.", mimeType: MIME }] });
    if (method === "resources/read") {
      if (body?.params?.uri !== URI) return fail(id, -32002, "Resource not found");
      return ok(id, { contents: [{ uri: URI, mimeType: MIME, text: widget, _meta: { ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } }, "openai/widgetDescription": "Sim-Ciera v0.3 prediction and calibration ledger." } }] });
    }
    return fail(id, -32601, "Method not found");
  } catch (error) {
    return fail(id, -32000, error instanceof Error ? error.message : String(error));
  }
});
