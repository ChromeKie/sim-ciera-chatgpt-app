import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const EMPTY = { counts:{predictions:0,baseline:0,calibrations:0,misses:0,syntheticHits:0,audits:0}, recentPredictions:[], baselineRules:[], calibrations:[], misses:[], syntheticHits:[], audits:[] };
const modes = ["SIM","SIM DEEP","SIM DECIDE","SIM WRITE","SIM BLIND","SIM PREDICT","SIM AUDIT"];
const states = ["unspecified","regulated","work","playful","tired","attachment-activated","activated-parent"];

function unwrap(result){ return result?.structuredContent?.dashboard || result?.dashboard || null; }
function useBridge(onResult){
  useEffect(() => {
    const handler = (e) => {
      const msg = e.data;
      if (msg?.method === "ui/notifications/tool-result") onResult(msg.params?.result);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onResult]);
  const callTool = async (name, args={}) => {
    if (window.openai?.callTool) return window.openai.callTool(name, args);
    const id = crypto.randomUUID();
    window.parent.postMessage({ jsonrpc:"2.0", id, method:"tools/call", params:{ name, arguments:args } }, "*");
    throw new Error("Direct tool result unavailable outside ChatGPT host.");
  };
  return { callTool };
}

const css = `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui;background:#0d0c0f;color:#f1ece5}*{box-sizing:border-box}body{margin:0;background:#0d0c0f}.app{min-height:100vh;padding:18px}.top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:14px}.brand{display:flex;gap:12px;align-items:center}.mark{width:42px;height:42px;border-radius:14px;background:#5e3347;display:grid;place-items:center;font-weight:800}.brand h1{margin:0;font-size:22px}.brand p,.muted,.status,.sub{color:#a9a0a6}.brand p{margin:2px 0 0}.real-sim{max-width:520px;font-size:12px;color:#cdbfc5;border:1px solid #2b252b;background:#151217;padding:10px 12px;border-radius:12px}.nav,.ledger-tabs,.class-row,.mode-row{display:flex;gap:8px;flex-wrap:wrap}.nav{margin-bottom:14px}.nav button,.ledger-tabs button,.class-row button,.mode-row button,button{border:1px solid #312a31;background:#171419;color:#eee5ea;border-radius:10px;padding:9px 12px;cursor:pointer}.nav button.active,.ledger-tabs button.active,.class-row button.active,.mode-row button.active,.primary{background:#5e3347;border-color:#744157}.grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,.8fr);gap:14px}.card{border:1px solid #292329;background:linear-gradient(180deg,#151217,#111014);border-radius:16px;padding:16px}.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#b88ba1}.card h2{margin:6px 0 14px;font-size:18px}.label{font-size:12px;color:#c9bec4;display:block;margin-bottom:6px}textarea,select,input{width:100%;border:1px solid #332b33;background:#0d0c0f;color:#f1ece5;border-radius:10px;padding:10px}textarea{min-height:120px;resize:vertical}.formgrid{display:grid;gap:12px}.actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.counts{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.count{border:1px solid #2c262c;background:#0f0e11;border-radius:12px;padding:12px}.count b{display:block;font-size:22px}.list{display:grid;gap:10px}.item{border:1px solid #2d272d;background:#100f12;border-radius:12px;padding:12px}.item-head{display:flex;justify-content:space-between;gap:12px}.rule{font-weight:650}.item-sub{margin-top:6px;color:#b8afb4;font-size:13px}.badge{display:inline-block;font-size:10px;letter-spacing:.08em;border-radius:999px;padding:4px 7px;border:1px solid #3b3238}.miss{color:#f0a0a0}.hit{color:#b2e5b2}.evidence{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.evidence>div{border:1px solid #2d272d;border-radius:10px;padding:9px}.evidence strong{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#b88ba1}.evidence ul{margin:7px 0 0;padding-left:17px;color:#c5bbc0;font-size:12px}.empty{padding:18px;border:1px dashed #342c34;border-radius:12px;color:#8f878c}.check{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#c9bec4}.check input{width:auto;margin-top:3px}@media(max-width:760px){.grid{grid-template-columns:1fr}.top{flex-direction:column}.evidence{grid-template-columns:1fr}}
`;

function Count({label,value}){return <div className="count"><span className="sub">{label}</span><b>{value ?? 0}</b></div>}
function Evidence({p}){return <div className="evidence"><div><strong>Evidence</strong><ul>{(p.establishedFacts||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><strong>Inferences</strong><ul>{(p.modelInferences||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><strong>Unknowns</strong><ul>{(p.unknowns||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div></div>}
function Prediction({p}){return <div className="item"><div className="item-head"><div className="rule">{p.conclusion}</div><span className="badge">{p.confidence}</span></div><div className="item-sub">{p.mode} · {p.state}</div><Evidence p={p}/></div>}

function Simulate({mode,setMode,state,setState,dashboard}){
  const [scenario,setScenario]=useState("");
  const [status,setStatus]=useState("");
  const run=async()=>{
    setStatus("Sending scenario to ChatGPT…");
    try{
      await window.openai?.setWidgetState?.({ privateContent:{ mode,state,scenario } });
      const prompt = `${mode}${state!=="unspecified"?` · state=${state}`:""}\n\nScenario:\n${scenario}\n\nUse Sim-Ciera. Load simulator context first. Lead with what Sim-Ciera actually concludes/does/says, then only the reasoning that materially drove it. Separate established facts, model inferences, and unknowns. Do not invent motives or missing facts. Save the prediction if this is a concrete prediction that can later be audited.`;
      if(window.openai?.sendFollowUpMessage) await window.openai.sendFollowUpMessage({ prompt });
      else window.parent.postMessage({jsonrpc:"2.0",method:"ui/message",params:{role:"user",content:[{type:"text",text:prompt}]}},"*");
      setStatus("Sent to ChatGPT.");
    }catch(e){setStatus(e?.message||"Could not send.")}
  };
  return <div className="grid"><section className="card"><div className="eyebrow">Simulation workspace</div><h2>Run Sim-Ciera</h2><div className="formgrid"><div><label className="label">Mode</label><div className="mode-row">{modes.map(m=><button key={m} className={mode===m?"active":""} onClick={()=>setMode(m)}>{m}</button>)}</div></div><div><label className="label">State</label><select value={state} onChange={e=>setState(e.target.value)}>{states.map(s=><option key={s}>{s}</option>)}</select></div><div><label className="label">Context / scenario</label><textarea value={scenario} onChange={e=>setScenario(e.target.value)} placeholder="What happened? Include only what is actually known."/></div><div className="muted">The host conversation does the reasoning. The MCP app preserves model context, Evidence / Inferences / Unknowns, predictions, misses, and audits.</div><div className="actions"><button className="primary" disabled={!scenario.trim()} onClick={run}>Run in ChatGPT</button><span className="status">{status}</span></div></div></section><aside className="card"><div className="eyebrow">Model Ledger</div><h2>Current record</h2><div className="counts"><Count label="Predictions" value={dashboard.counts?.predictions}/><Count label="Baseline" value={dashboard.counts?.baseline}/><Count label="Calibrations" value={dashboard.counts?.calibrations}/><Count label="Misses" value={dashboard.counts?.misses}/><Count label="Synthetic Hits" value={dashboard.counts?.syntheticHits}/><Count label="Audits" value={dashboard.counts?.audits}/></div></aside></div>
}

function Predictions({dashboard}){return <section className="card"><div className="eyebrow">Prediction history</div><h2>Preserved before the reveal</h2>{dashboard.recentPredictions?.length?<div className="list">{dashboard.recentPredictions.map(p=><Prediction key={p.id} p={p}/>)}</div>:<div className="empty">No saved predictions yet.</div>}</section>}

function Ledger({dashboard,callTool,setDashboard}){
  const [tab,setTab]=useState("baseline"), [status,setStatus]=useState("");
  const promote=async id=>{setStatus("Promoting…");try{const r=await callTool("promote_calibration",{calibrationId:id});setDashboard(unwrap(r)||dashboard);setStatus("Baseline updated.")}catch(e){setStatus(e?.message||"Failed")}};
  return <section className="card"><div className="eyebrow">Model Ledger</div><h2>What the model is allowed to learn</h2><div className="ledger-tabs">{[["baseline","Baseline"],["calibrations","Calibrations"],["misses","Misses"],["synthetic","Synthetic Hits"]].map(([id,l])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{l}</button>)}</div>{tab==="baseline"&&<div className="list">{dashboard.baselineRules?.map(r=><div className="item" key={r.id}><div className="rule">{r.text}</div><div className="item-sub">{r.source}</div></div>)}</div>}{tab==="calibrations"&&<div className="list">{dashboard.calibrations?.map(c=><div className="item" key={c.id}><div className="item-head"><div><div className="rule">{c.proposedRule||"No generalized rule proposed."}</div><div className="item-sub">{c.classification?.toUpperCase()} · {c.status}</div></div>{c.status==="proposed"&&<button onClick={()=>promote(c.id)}>Promote</button>}</div><div className="item-sub">Reality: {c.actual}</div></div>)}</div>}{tab==="misses"&&(dashboard.misses?.length?<div className="list">{dashboard.misses.map(m=><div className="item" key={m.id}><span className="badge miss">MISS</span><div className="rule">{m.conclusion}</div><div className="item-sub">Reality: {m.actual}</div></div>)}</div>:<div className="empty">No preserved misses yet.</div>)}{tab==="synthetic"&&(dashboard.syntheticHits?.length?<div className="list">{dashboard.syntheticHits.map(h=><div className="item" key={h.id}><span className="badge hit">SYNTHETIC HIT</span><div className="rule">{h.novelClaim}</div><div className="item-sub">Confirmed: {h.actual}</div></div>)}</div>:<div className="empty">No synthetic hits yet.</div>)}<div className="status" style={{marginTop:10}}>{status}</div></section>
}

function Audit({dashboard,callTool,setDashboard}){
  const preds=dashboard.recentPredictions||[];
  const [predictionId,setPredictionId]=useState(preds[0]?.id||""),[classification,setClassification]=useState("partial"),[actual,setActual]=useState(""),[why,setWhy]=useState(""),[rule,setRule]=useState(""),[novel,setNovel]=useState(false),[status,setStatus]=useState("");
  useEffect(()=>{if(!predictionId&&preds[0]?.id)setPredictionId(preds[0].id)},[predictionId,preds]);
  const submit=async()=>{setStatus("Recording audit…");try{const r=await callTool("audit_prediction",{predictionId,classification,actual,why,proposedRule:rule||undefined,novelPredictionConfirmed:classification==="hit"&&novel});setDashboard(unwrap(r)||dashboard);setActual("");setWhy("");setRule("");setNovel(false);setStatus(rule?"Audit saved. Rule remains proposed until promoted.":"Audit saved.")}catch(e){setStatus(e?.message||"Failed")}};
  if(!preds.length)return <section className="card"><div className="eyebrow">SIM AUDIT</div><h2>Reality check</h2><div className="empty">Save a prediction first.</div></section>;
  return <section className="card"><div className="eyebrow">SIM AUDIT</div><h2>Compare prediction with reality</h2><div className="formgrid"><div><label className="label">Prediction</label><select value={predictionId} onChange={e=>setPredictionId(e.target.value)}>{preds.map(p=><option key={p.id} value={p.id}>{p.conclusion}</option>)}</select></div><div><label className="label">Classification</label><div className="class-row">{["hit","partial","miss"].map(c=><button key={c} className={classification===c?"active":""} onClick={()=>setClassification(c)}>{c.toUpperCase()}</button>)}</div></div><div><label className="label">What Real Ciera actually did</label><textarea value={actual} onChange={e=>setActual(e.target.value)}/></div><div><label className="label">Why it hit or missed</label><textarea value={why} onChange={e=>setWhy(e.target.value)}/></div><div><label className="label">Proposed generalized rule (optional)</label><textarea value={rule} onChange={e=>setRule(e.target.value)} placeholder="Not Baseline until explicitly promoted."/></div>{classification==="hit"&&<label className="check"><input type="checkbox" checked={novel} onChange={e=>setNovel(e.target.checked)}/>This was genuinely new information predicted before Real Ciera supplied it.</label>}<div className="actions"><button className="primary" disabled={!actual.trim()||!why.trim()} onClick={submit}>Record audit</button><span className="status">{status}</span></div></div></section>
}

function App(){
  const initial=window.openai?.toolOutput?.dashboard?window.openai.toolOutput:(window.openai?.toolOutput?.structuredContent||{});
  const [dashboard,setDashboard]=useState(initial.dashboard||EMPTY),[tab,setTab]=useState(initial.focus||"simulate"),[mode,setMode]=useState(window.openai?.widgetState?.privateContent?.mode||"SIM"),[state,setState]=useState(window.openai?.widgetState?.privateContent?.state||"unspecified");
  const onResult=React.useCallback(r=>{const d=unwrap(r);if(d)setDashboard(d)},[]);
  const {callTool}=useBridge(onResult);
  const tabs=useMemo(()=>[["simulate","Simulate"],["predictions","Predictions"],["ledger","Model Ledger"],["audit","Run Audit"]],[]);
  return <><style>{css}</style><main className="app"><header className="top"><div className="brand"><div className="mark">C</div><div><h1>Sim-Ciera</h1><p>Predictive model · private calibration console</p></div></div><div className="real-sim">REAL CIERA is the person. SIM-CIERA is the model. A prediction never silently becomes a fact.</div></header><nav className="nav">{tabs.map(([id,l])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{l}</button>)}</nav>{tab==="simulate"&&<Simulate mode={mode} setMode={setMode} state={state} setState={setState} dashboard={dashboard}/>} {tab==="predictions"&&<Predictions dashboard={dashboard}/>} {tab==="ledger"&&<Ledger dashboard={dashboard} callTool={callTool} setDashboard={setDashboard}/>} {tab==="audit"&&<Audit dashboard={dashboard} callTool={callTool} setDashboard={setDashboard}/>}</main></>
}

createRoot(document.getElementById("root")).render(<App/>);
