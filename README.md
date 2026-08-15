# Sim-Ciera v0.2 — private ChatGPT app

## Easiest way to start locally

Open `START-HERE.html`, then double-click the launcher for your computer:

- Windows: `START-SIM-CIERA-WINDOWS.bat`
- Mac: `START-SIM-CIERA-MAC.command`

The launcher checks Node, installs dependencies the first time, builds and validates the app, starts the MCP server and ngrok, copies the final `/mcp` address, and opens the ChatGPT Plugins page. Keep the launcher window open while using Sim-Ciera.

Sim-Ciera is a private/internal ChatGPT app scaffold for modeling Ciera's likely judgment, reasoning, communication, decisions, and behavior without pretending the simulation is Real Ciera.

The app is intentionally built as a **React widget + MCP server** rather than a standalone landing page. ChatGPT remains the reasoning/model layer; the MCP server supplies Sim-Ciera's governing context, preserves predictions, records audits, and serves the interactive ledger UI.

## What is implemented

- Modes: `SIM`, `SIM DEEP`, `SIM DECIDE`, `SIM WRITE`, `SIM BLIND`, `SIM PREDICT`, `SIM AUDIT`
- State selector: regulated, work, playful, tired, attachment-activated, activated-parent, or unspecified
- Core decision architecture: Context → relationship/baseline → stakes → known facts → significance of anomaly → information strategy → practical consequences → response
- Prediction history with confidence and Evidence / Inferences / Unknowns
- Model Ledger with Baseline, Calibrations, Misses, and Synthetic Hits
- Audit flow for classifying a prior prediction as hit / partial / miss
- Failed predictions are preserved rather than rewritten
- Proposed calibration rules do not enter Baseline until explicitly promoted
- Synthetic Hits are reserved for genuinely novel predictions later confirmed
- Local persistence in `data/store.json`, with an optional durable Supabase ledger for hosting
- MCP endpoint at `/mcp`
- React widget served as an MCP UI resource

## Privacy choice

The full psychological/trauma profile is **not bundled into this deployable repo by default**. `knowledge/PROFILE_NOTES.md` contains generalized modeling notes only. This avoids unnecessarily shipping deeply sensitive relationship, trauma, sexual, and clinical-history details inside an app artifact.

If this becomes a hosted private app later, sensitive source material should live in an access-controlled data store, not in public/static frontend assets.

## Repository structure

```text
sim-ciera-chatgpt-app/
├── server.js                     # MCP server, tools, resource, persistence
├── package.json
├── alpic.json                    # Alpic Cloud build/start configuration
├── supabase-schema.sql           # durable ledger schema and RLS policies
├── .env.example
├── data/
│   └── store.json                # private single-user MVP persistence
├── knowledge/
│   ├── CIERA_SIMULATOR.md        # core modeling rules
│   └── PROFILE_NOTES.md          # generalized current-baseline notes
├── web/src/
│   └── main.jsx                  # React widget UI
├── public/
│   └── widget-shell.html         # shell used by build script
└── scripts/
    ├── build-widget.mjs          # bundles React and inlines it into the widget resource
    └── validate.mjs              # static repo contract checks
```

## Install and run

Requires a current Node.js runtime.

```bash
npm install
npm run build
npm run validate
npm start
```

The server listens on `PORT` (default `8787`) and exposes:

```text
http://localhost:8787/mcp
```

No `OPENAI_API_KEY` is required for this architecture. ChatGPT supplies the model reasoning; this server is the MCP/plugin backend and UI host.

## Test locally

After installing dependencies and starting the server, test the MCP endpoint with the MCP Inspector or expose the server through an HTTPS development tunnel, then connect that MCP endpoint in ChatGPT's developer/plugin connection flow.

For a remote connection, set any required deployment environment variables and make sure the final public MCP endpoint is reachable over HTTPS.

## Host on Alpic Cloud

The repo includes `alpic.json`, so after signing in to the Alpic CLI the deployment command is:

```bash
alpic deploy
```

For a durable hosted ledger, first apply `supabase-schema.sql`, then configure these three environment variables in the Alpic environment:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SIM_CIERA_STORE_ID
```

All three must be set together. `SIM_CIERA_STORE_ID` is a private UUID used by the table's row-level security policies and must stay server-side. Before storing personal predictions, restrict the Alpic environment's trusted IPs to ChatGPT.

## Tool surface

`get_simulator_context` — read-only. Returns the current modeling principles, mode/state, and Baseline before a simulation.

`save_prediction` — write. Persists the original prediction and its evidence/inference/unknown separation.

`list_predictions` — read-only. Returns prior predictions for review or audit.

`audit_prediction` — write. Records what Real Ciera actually did, hit/partial/miss classification, why, and a proposed generalized calibration. Misses and Synthetic Hits are preserved separately.

`promote_calibration` — write/idempotent. Explicitly promotes a proposed calibration into Baseline.

`add_baseline_rule` — write. Adds only a stable rule that Real Ciera has explicitly established.

`render_dashboard` — read-only render tool. Attaches the Sim-Ciera React widget.

## Model contract

The server instructs ChatGPT to:

- keep Real Ciera and Sim-Ciera conceptually separate
- load simulator context before making a Sim-Ciera judgment
- preserve ambiguity instead of inventing missing facts or motives
- treat baseline and state as central
- preserve failed predictions as misses
- use corrections as calibration data
- require explicit confirmation before a proposed update becomes Baseline
- avoid reducing Ciera to trauma, confrontation, detective work, or intensity

## Current limitations

This is a **private, single-user app**. The Supabase mode provides durable persistence, but the app does not implement separate end-user accounts or multi-tenant authorization. Keep the Alpic endpoint restricted to ChatGPT and do not publish it to a public registry.

The project has been built, statically validated, initialized through Streamable HTTP, and exercised through a disposable save → audit → explicit-promotion → dashboard flow.

## Current OpenAI documentation used

The scaffold follows the current OpenAI Plugin/ChatGPT MCP patterns for a Streamable HTTP `/mcp` server, MCP UI resources, tool metadata/annotations, and ChatGPT widget integration.

- https://developers.openai.com/plugins/build/app-quickstart
- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/build/chatgpt-ui
- https://developers.openai.com/plugins/reference
