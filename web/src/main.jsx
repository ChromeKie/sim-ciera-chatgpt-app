import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const MODES = ["SIM", "SIM DEEP", "SIM DECIDE", "SIM WRITE", "SIM BLIND", "SIM PREDICT", "SIM AUDIT"];
const STATES = [
  ["unspecified", "Unspecified"],
  ["regulated", "Regulated"],
  ["work", "Work"],
  ["playful", "Playful"],
  ["tired", "Tired"],
  ["attachment-activated", "Attachment activated"],
  ["activated-parent", "Activated parent"],
];

const EMPTY_DASHBOARD = {
  counts: { predictions: 0, baseline: 0, calibrations: 0, misses: 0, syntheticHits: 0, audits: 0 },
  recentPredictions: [],
  baselineRules: [],
  calibrations: [],
  misses: [],
  syntheticHits: [],
  audits: [],
};

const css = String.raw`
:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --bg: #0c0b0d;
  --panel: #141216;
  --panel2: #1a171c;
  --text: #f3eee8;
  --muted: #a69aa7;
  --line: rgba(255,255,255,.09);
  --wine: #7b314f;
  --wine2: #a34b6d;
  --ivory: #e7ded3;
  --good: #84b69b;
  --warn: #d7b277;
  --bad: #d78686;
}
* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; background: transparent; }
body { color: var(--text); }
button, textarea, select, input { font: inherit; }
button { color: inherit; }
.app { background: radial-gradient(circle at 90% 0%, rgba(123,49,79,.15), transparent 30%), var(--bg); border: 1px solid var(--line); border-radius: 22px; overflow: hidden; min-height: 520px; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid var(--line); background: rgba(255,255,255,.015); }
.brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mark { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; background: linear-gradient(145deg, var(--wine2), #4f1f36); box-shadow: inset 0 1px rgba(255,255,255,.2); font-weight: 800; }
.brand h1 { margin: 0; font-size: 16px; letter-spacing: -.01em; }
.brand p { margin: 3px 0 0; color: var(--muted); font-size: 11px; }
.real-sim { color: var(--muted); font-size: 11px; text-align: right; max-width: 240px; }
.nav { display: flex; gap: 6px; padding: 10px 12px; overflow-x: auto; border-bottom: 1px solid var(--line); }
.nav button, .pill { border: 1px solid var(--line); background: transparent; border-radius: 999px; padding: 7px 11px; cursor: pointer; white-space: nowrap; font-size: 12px; }
.nav button.active, .pill.active { background: rgba(123,49,79,.26); border-color: rgba(163,75,109,.55); }
.body { padding: 18px; }
.grid { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(240px,.8fr); gap: 14px; }
.card { background: linear-gradient(180deg, rgba(255,255,255,.022), rgba(255,255,255,.009)), var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 16px; }
.card h2, .card h3 { margin: 0; }
.card h2 { font-size: 15px; }
.card h3 { font-size: 12px; color: var(--ivory); }
.eyebrow { color: var(--wine2); text-transform: uppercase; font-size: 10px; letter-spacing: .13em; font-weight: 800; margin-bottom: 7px; }
.muted { color: var(--muted); }
.small { font-size: 11px; }
.modebar { display: flex; gap: 6px; flex-wrap: wrap; margin: 14px 0; }
.state-row { display: grid; grid-template-columns: 1fr 200px; gap: 10px; margin-bottom: 10px; }
textarea, select, input[type=text] { width: 100%; border: 1px solid var(--line); background: #0f0d10; color: var(--text); border-radius: 12px; outline: none; }
textarea:focus, select:focus, input[type=text]:focus { border-color: rgba(163,75,109,.7); box-shadow: 0 0 0 3px rgba(123,49,79,.12); }
textarea { min-height: 126px; resize: vertical; padding: 12px 13px; line-height: 1.45; }
select, input[type=text] { padding: 10px 12px; }
.actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.primary, .secondary, .dangerless { border-radius: 11px; padding: 9px 12px; border: 1px solid transparent; cursor: pointer; font-weight: 700; font-size: 12px; }
.primary { background: var(--wine); }
.primary:hover { background: var(--wine2); }
.secondary { border-color: var(--line); background: #19161a; }
.dangerless { border-color: rgba(215,134,134,.32); background: rgba(215,134,134,.08); }
button:disabled { opacity: .45; cursor: not-allowed; }
.counts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
.count { padding: 10px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,.015); }
.count b { display: block; font-size: 18px; }
.count span { color: var(--muted); font-size: 10px; }
.list { display: grid; gap: 9px; margin-top: 12px; }
.item { border: 1px solid var(--line); border-radius: 13px; padding: 12px; background: rgba(255,255,255,.012); }
.item-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.item-title { font-size: 13px; font-weight: 760; line-height: 1.35; }
.item-sub { color: var(--muted); font-size: 10px; margin-top: 4px; }
.badge { border: 1px solid var(--line); border-radius: 999px; padding: 4px 7px; font-size: 9px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; }
.badge.high, .badge.hit { color: var(--good); }
.badge.medium, .badge.partial { color: var(--warn); }
.badge.low, .badge.miss { color: var(--bad); }
.details { margin-top: 10px; display: grid; gap: 8px; }
.triple { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.signal { border-radius: 10px; padding: 9px; border: 1px solid var(--line); background: #100e11; }
.signal strong { display: block; font-size: 10px; margin-bottom: 6px; }
.signal ul { margin: 0; padding-left: 15px; color: var(--muted); font-size: 10px; line-height: 1.45; }
.empty { color: var(--muted); text-align: center; padding: 24px 10px; border: 1px dashed var(--line); border-radius: 13px; margin-top: 12px; font-size: 12px; }
.ledger-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin: 12px 0; }
.ledger-tabs button { border: 1px solid var(--line); background: transparent; color: var(--muted); border-radius: 9px; padding: 7px 9px; font-size: 11px; cursor: pointer; }
.ledger-tabs button.active { color: var(--text); background: rgba(123,49,79,.18); }
.formgrid { display: grid; gap: 10px; margin-top: 12px; }
.label { font-size: 10px; color: var(--muted); margin-bottom: 5px; display: block; text-transform: uppercase; letter-spacing: .08em; }
.class-row { display: flex; gap: 7px; }
.class-row button { flex: 1; border: 1px solid var(--line); background: transparent; border-radius: 10px; padding: 9px; cursor: pointer; font-size: 11px; }
.class-row button.active { background: rgba(123,49,79,.2); border-color: rgba(163,75,109,.5); }
.check { display: flex; gap: 8px; align-items: flex-start; color: var(--muted); font-size: 11px; }
.notice { border: 1px solid rgba(163,75,109,.35); background: rgba(123,49,79,.11); border-radius: 12px; padding: 10px 12px; font-size: 11px; margin-top: 12px; }
.rule { font-size: 12px; line-height: 1.45; }
.rule-source { color: var(--muted); font-size: 9px; margin-top: 6px; }
.status { font-size: 10px; color: var(--muted); }
@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr; }
  .state-row { grid-template-columns: 1fr; }
  .triple { grid-template-columns: 1fr; }
  .real-sim { display: none; }
  .body { padding: 12px; }
  .top { padding: 14px; }
}
`;

function useBridge(onToolResult) {
  const pendingRef = useRef(new Map());
  const rpcIdRef = useRef(0);
  const readyRef = useRef(null);

  const rpcRequest = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++rpcIdRef.current;
      pendingRef.current.set(id, { resolve, reject });
      window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    });

  useEffect(() => {
    const handler = (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;

      if (typeof message.id === "number") {
        const pending = pendingRef.current.get(message.id);
        if (!pending) return;
        pendingRef.current.delete(message.id);
        if (message.error) pending.reject(message.error);
        else pending.resolve(message.result);
        return;
      }

      if (message.method === "ui/notifications/tool-result") {
        onToolResult?.(message.params);
      }
    };
    window.addEventListener("message", handler, { passive: true });
    return () => window.removeEventListener("message", handler);
  }, [onToolResult]);

  const ensureReady = async () => {
    if (window.openai?.callTool) return;
    if (!readyRef.current) {
      readyRef.current = (async () => {
        await rpcRequest("ui/initialize", {
          appInfo: { name: "sim-ciera-widget", version: "0.2.0" },
          appCapabilities: {},
          protocolVersion: "2026-01-26",
        });
        window.parent.postMessage(
          { jsonrpc: "2.0", method: "ui/notifications/initialized", params: {} },
          "*"
        );
      })();
    }
    await readyRef.current;
  };

  const callTool = async (name, args) => {
    if (window.openai?.callTool) return window.openai.callTool(name, args);
    await ensureReady();
    return rpcRequest("tools/call", { name, arguments: args });
  };

  return { callTool };
}

function unwrapDashboard(result) {
  const data = result?.structuredContent ?? result;
  return data?.dashboard ?? null;
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function CountCard({ label, value }) {
  return <div className="count"><b>{value ?? 0}</b><span>{label}</span></div>;
}

function PredictionItem({ prediction }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="item">
      <div className="item-head">
        <div>
          <div className="item-title">{prediction.conclusion}</div>
          <div className="item-sub">{prediction.mode} · {prediction.state} · {formatDate(prediction.createdAt)}</div>
        </div>
        <button className={`badge ${String(prediction.confidence).toLowerCase()}`} onClick={() => setOpen(!open)}>{prediction.confidence}</button>
      </div>
      {open && (
        <div className="details">
          {prediction.reasoning?.length > 0 && <div className="signal"><strong>Material reasoning</strong><ul>{prediction.reasoning.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          <div className="triple">
            <Signal title="Evidence" items={prediction.establishedFacts} />
            <Signal title="Inferences" items={prediction.modelInferences} />
            <Signal title="Unknowns" items={prediction.unknowns} />
          </div>
        </div>
      )}
    </div>
  );
}

function Signal({ title, items = [] }) {
  return (
    <div className="signal">
      <strong>{title}</strong>
      {items.length ? <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted small">None recorded</div>}
    </div>
  );
}

function Simulate({ mode, setMode, state, setState, dashboard }) {
  const [scenario, setScenario] = useState("");
  const [status, setStatus] = useState("");

  const persistUiState = (nextMode, nextState) => {
    const modelContent = `Sim-Ciera UI selection: mode=${nextMode}; state=${nextState}. Use these settings for the next simulation unless the user overrides them.`;
    window.openai?.setWidgetState?.({
      modelContent,
      privateContent: { mode: nextMode, state: nextState },
    });
  };

  const changeMode = (next) => {
    setMode(next);
    persistUiState(next, state);
  };
  const changeState = (next) => {
    setState(next);
    persistUiState(mode, next);
  };

  const run = async () => {
    const text = scenario.trim();
    if (!text) return;
    if (!window.openai?.sendFollowUpMessage) {
      setStatus("This host does not expose ChatGPT follow-up messaging. Type the scenario in chat instead.");
      return;
    }
    setStatus("Sending to chat…");
    await window.openai.sendFollowUpMessage({
      prompt: `${mode}\nState: ${state}\nScenario: ${text}\n\nUse the Sim-Ciera app context. Lead with what Sim-Ciera actually concludes/does/says, then only the reasoning that materially drove it. Distinguish evidence, inference, and unknowns. Save the prediction before any later reveal so it can be audited.`,
      scrollToBottom: true,
    });
    setScenario("");
    setStatus("Sent.");
  };

  return (
    <div className="grid">
      <section className="card">
        <div className="eyebrow">Simulation</div>
        <h2>What happens?</h2>
        <div className="modebar">
          {MODES.map((m) => <button key={m} className={`pill ${m === mode ? "active" : ""}`} onClick={() => changeMode(m)}>{m}</button>)}
        </div>
        <div className="state-row">
          <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="Drop the situation here. No forced meaning; missing facts stay missing." />
          <div>
            <label className="label">State</label>
            <select value={state} onChange={(e) => changeState(e.target.value)}>
              {STATES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            <div className="notice">Real Ciera ≠ Sim-Ciera. This app stores predictions so misses stay misses.</div>
          </div>
        </div>
        <div className="actions">
          <button className="primary" onClick={run} disabled={!scenario.trim()}>Run in ChatGPT</button>
          <span className="status">{status}</span>
        </div>
      </section>
      <aside className="card">
        <div className="eyebrow">Model ledger</div>
        <h2>Current record</h2>
        <div className="counts">
          <CountCard label="Predictions" value={dashboard.counts?.predictions} />
          <CountCard label="Baseline rules" value={dashboard.counts?.baseline} />
          <CountCard label="Calibrations" value={dashboard.counts?.calibrations} />
          <CountCard label="Misses" value={dashboard.counts?.misses} />
          <CountCard label="Synthetic hits" value={dashboard.counts?.syntheticHits} />
          <CountCard label="Audits" value={dashboard.counts?.audits} />
        </div>
      </aside>
    </div>
  );
}

function Predictions({ dashboard }) {
  return (
    <section className="card">
      <div className="eyebrow">Prediction history</div>
      <h2>Preserved before the reveal</h2>
      {dashboard.recentPredictions?.length ? (
        <div className="list">{dashboard.recentPredictions.map((p) => <PredictionItem key={p.id} prediction={p} />)}</div>
      ) : <div className="empty">No saved predictions yet. Run one from the Simulate tab.</div>}
    </section>
  );
}

function Ledger({ dashboard, callTool, updateDashboard }) {
  const [tab, setTab] = useState("baseline");
  const [status, setStatus] = useState("");

  const promote = async (id) => {
    setStatus("Promoting…");
    try {
      const result = await callTool("promote_calibration", { calibrationId: id });
      updateDashboard(unwrapDashboard(result));
      setStatus("Baseline updated.");
    } catch (e) {
      setStatus(`Could not promote: ${e?.message ?? "unknown error"}`);
    }
  };

  const tabs = [
    ["baseline", "Baseline"],
    ["calibrations", "Calibrations"],
    ["misses", "Misses"],
    ["synthetic", "Synthetic Hits"],
  ];

  return (
    <section className="card">
      <div className="eyebrow">Model Ledger</div>
      <h2>What the model is allowed to learn</h2>
      <div className="ledger-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</div>
      {tab === "baseline" && <div className="list">{dashboard.baselineRules?.map((r) => <div className="item" key={r.id}><div className="rule">{r.text}</div><div className="rule-source">{r.source}</div></div>)}</div>}
      {tab === "calibrations" && <div className="list">{dashboard.calibrations?.map((c) => <div className="item" key={c.id}><div className="item-head"><div><div className="rule">{c.proposedRule || "No generalized rule proposed."}</div><div className="rule-source">{c.classification.toUpperCase()} · {c.status} · {formatDate(c.createdAt)}</div></div>{c.status === "proposed" && <button className="secondary" onClick={() => promote(c.id)}>Promote</button>}</div><div className="item-sub">Reality: {c.actual}</div></div>)}</div>}
      {tab === "misses" && (dashboard.misses?.length ? <div className="list">{dashboard.misses.map((m) => <div className="item" key={m.id}><div className="badge miss">MISS</div><div className="rule" style={{marginTop: 8}}>Predicted: {m.conclusion}</div><div className="item-sub">Reality: {m.actual}</div><div className="item-sub">Why: {m.why}</div></div>)}</div> : <div className="empty">No preserved misses yet.</div>)}
      {tab === "synthetic" && (dashboard.syntheticHits?.length ? <div className="list">{dashboard.syntheticHits.map((h) => <div className="item" key={h.id}><div className="badge hit">SYNTHETIC HIT</div><div className="rule" style={{marginTop: 8}}>{h.novelClaim}</div><div className="item-sub">Confirmed: {h.actual}</div></div>)}</div> : <div className="empty">No genuinely novel confirmed predictions yet.</div>)}
      <div className="status" style={{marginTop: 10}}>{status}</div>
    </section>
  );
}

function Audit({ dashboard, callTool, updateDashboard }) {
  const predictions = dashboard.recentPredictions ?? [];
  const [predictionId, setPredictionId] = useState(predictions[0]?.id ?? "");
  const [classification, setClassification] = useState("partial");
  const [actual, setActual] = useState("");
  const [why, setWhy] = useState("");
  const [rule, setRule] = useState("");
  const [novel, setNovel] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!predictionId && predictions[0]?.id) setPredictionId(predictions[0].id);
  }, [predictionId, predictions]);

  const submit = async () => {
    if (!predictionId || !actual.trim() || !why.trim()) return;
    setStatus("Recording audit…");
    try {
      const result = await callTool("audit_prediction", {
        predictionId,
        classification,
        actual: actual.trim(),
        why: why.trim(),
        proposedRule: rule.trim() || undefined,
        novelPredictionConfirmed: classification === "hit" && novel,
      });
      updateDashboard(unwrapDashboard(result));
      setActual("");
      setWhy("");
      setRule("");
      setNovel(false);
      setStatus(rule.trim() ? "Audit saved. Rule is proposed, not Baseline yet." : "Audit saved.");
    } catch (e) {
      setStatus(`Audit failed: ${e?.message ?? "unknown error"}`);
    }
  };

  if (!predictions.length) return <section className="card"><div className="eyebrow">SIM AUDIT</div><h2>Reality check</h2><div className="empty">Save a prediction first. Audits compare against the preserved original.</div></section>;

  return (
    <section className="card">
      <div className="eyebrow">SIM AUDIT</div>
      <h2>Compare prediction with reality</h2>
      <div className="formgrid">
        <div><label className="label">Prediction</label><select value={predictionId} onChange={(e) => setPredictionId(e.target.value)}>{predictions.map((p) => <option value={p.id} key={p.id}>{p.conclusion.slice(0, 110)}</option>)}</select></div>
        <div><label className="label">Classification</label><div className="class-row">{["hit","partial","miss"].map((c) => <button key={c} className={classification === c ? "active" : ""} onClick={() => setClassification(c)}>{c.toUpperCase()}</button>)}</div></div>
        <div><label className="label">What Real Ciera actually did</label><textarea value={actual} onChange={(e) => setActual(e.target.value)} /></div>
        <div><label className="label">Why the prediction hit or missed</label><textarea value={why} onChange={(e) => setWhy(e.target.value)} /></div>
        <div><label className="label">Proposed generalized rule (optional)</label><textarea value={rule} onChange={(e) => setRule(e.target.value)} placeholder="One generalized model update. It will stay proposed until explicitly promoted." /></div>
        {classification === "hit" && <label className="check"><input type="checkbox" checked={novel} onChange={(e) => setNovel(e.target.checked)} />This was genuinely new information predicted before Real Ciera supplied it — mark as a Synthetic Hit.</label>}
        <div className="actions"><button className="primary" onClick={submit} disabled={!predictionId || !actual.trim() || !why.trim()}>Record audit</button><span className="status">{status}</span></div>
      </div>
    </section>
  );
}

function App() {
  const initial = window.openai?.toolOutput ?? null;
  const initialData = initial?.dashboard ? initial : initial?.structuredContent;
  const initialPrivate = window.openai?.widgetState?.privateContent ?? {};
  const [dashboard, setDashboard] = useState(initialData?.dashboard ?? EMPTY_DASHBOARD);
  const [tab, setTab] = useState(initialData?.focus ?? "simulate");
  const [mode, setMode] = useState(initialPrivate.mode ?? "SIM");
  const [state, setState] = useState(initialPrivate.state ?? "unspecified");

  const onToolResult = React.useCallback((result) => {
    const next = unwrapDashboard(result);
    if (next) setDashboard(next);
  }, []);

  const { callTool } = useBridge(onToolResult);

  const updateDashboard = (next) => {
    if (next) setDashboard(next);
  };

  const tabs = useMemo(() => [
    ["simulate", "Simulate"],
    ["predictions", "Predictions"],
    ["ledger", "Model Ledger"],
    ["audit", "Run Audit"],
  ], []);

  return (
    <>
      <style>{css}</style>
      <main className="app">
        <header className="top">
          <div className="brand"><div className="mark">C</div><div><h1>Sim-Ciera</h1><p>Predictive model · private calibration console</p></div></div>
          <div className="real-sim">REAL CIERA is the person. SIM-CIERA is the model. A prediction never silently becomes a fact.</div>
        </header>
        <nav className="nav">{tabs.map(([id, label]) => <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{label}</button>)}</nav>
        <div className="body">
          {tab === "simulate" && <Simulate mode={mode} setMode={setMode} state={state} setState={setState} dashboard={dashboard} />}
          {tab === "predictions" && <Predictions dashboard={dashboard} />}
          {tab === "ledger" && <Ledger dashboard={dashboard} callTool={callTool} updateDashboard={updateDashboard} />}
          {tab === "audit" && <Audit dashboard={dashboard} callTool={callTool} updateDashboard={updateDashboard} />}
        </div>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
