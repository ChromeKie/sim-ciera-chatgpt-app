# Sim-Ciera

Sim-Ciera is a private behavioral and decision-making simulator for Ciera Krom. It models likely judgment, reasoning, communication, decisions, and behavior while keeping **Real Ciera** separate from **Sim-Ciera** predictions.

The project is now split into two useful layers:

- The original Node/React ChatGPT App scaffold in the repository root remains available for local development.
- The canonical hosted MCP runtime is the Supabase Edge Function in `supabase/functions/sim-ciera-mcp/index.ts`.

## Live model revision

**v0.3.0**

The hosted deployment uses the existing Supabase-backed `sim_ciera_store` ledger, so redeploying the Edge Function does not erase prior predictions, audits, misses, synthetic hits, proposed calibrations, or promoted baseline rules.

## v0.3 hosted tool surface

- `get_simulator_context` — compatibility context loader
- `prepare_simulation` — normalize scenario, baseline, stakes, known facts, state, and unknowns before predicting
- `save_prediction` — preserve the independent prediction before the real outcome is revealed
- `render_simulation` — render the finished Sim-Ciera prediction without mutating history
- `list_predictions` — review preserved predictions
- `audit_prediction` — classify a result as hit / partial / miss while preserving the original prediction
- `promote_calibration` — promote an explicitly confirmed generalized rule into Baseline
- `add_baseline_rule` — add a stable rule explicitly established by Real Ciera
- `render_dashboard` — show the Model Ledger, misses, synthetic hits, calibrations, and audits

## Governing model

The behavioral architecture lives in `knowledge/CIERA_SIMULATOR.md`. The central process is:

`context → relationship/baseline → stakes → known facts → anomaly significance → information strategy → practical consequences → response`

Core requirements include preserving informational asymmetry when useful, preferring structural verification over interrogation, modeling state dependence, separating annoyance from meaning, preserving failed predictions as misses, and never silently turning a Sim-Ciera prediction into a fact about Real Ciera.

## Persistent calibration

Predictions are saved before audit. When Real Ciera later reveals what she actually did, the existing prediction is compared against the outcome. A miss stays a miss. A correction may produce a proposed generalized rule, but that rule does not become Baseline until explicitly promoted. A genuinely novel blind prediction later confirmed can be retained as a synthetic hit.

## Cloud deployment

The production/private development MCP implementation is:

`supabase/functions/sim-ciera-mcp/index.ts`

Supabase function name: `sim-ciera-mcp`

The function intentionally preserves the public MCP connection style already used by the ChatGPT development app. Sensitive clinical/trauma source documents are not embedded into the public function response; the deploy contains the behavioral model and the server-side ledger only.

## Local Node/React scaffold

The repository root also contains the earlier local ChatGPT App scaffold. It can still be run on a computer with Node.js 18+:

```bash
npm install
npm run build
npm run validate
npm start
```

The local server exposes `/mcp` on port `8787` by default. The hosted Supabase endpoint avoids requiring a local terminal or ngrok for normal use.
