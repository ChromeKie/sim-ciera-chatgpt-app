# Sim-Ciera — private ChatGPT app

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
- Local persistent storage in `data/store.json`
- MCP endpoint at `/mcp`
- React widget served as an MCP UI resource

## Privacy choice

The full psychological/trauma profile is **not bundled into this deployable repo by default**. `knowledge/PROFILE_NOTES.md` contains generalized modeling notes only. This avoids unnecessarily shipping deeply sensitive relationship, trauma, sexual, and clinical-history details inside an app artifact.

If this becomes a hosted private app later, sensitive source material should live in an access-controlled data store, not in public/static frontend assets.

## Repository structure

```text
sim-ciera-chatgpt-app/
├── server.js
├── package.json
├── .env.example
├── data/store.json
├── knowledge/CIERA_SIMULATOR.md
├── knowledge/PROFILE_NOTES.md
├── web/src/main.jsx
├── public/widget-shell.html
└── scripts/
    ├── build-widget.mjs
    └── validate.mjs
```

## Install and run

```bash
npm install
npm run build
npm run validate
npm start
```

The server listens on `PORT` (default `8787`) and exposes `http://localhost:8787/mcp`.

No `OPENAI_API_KEY` is required for this architecture. ChatGPT supplies the model reasoning; this server is the MCP/plugin backend and UI host.

## Current limitations

This is a **private, single-user MVP scaffold**. Local JSON persistence is deliberate for the first pass, but it is not a multi-user production database. Before shared/public deployment, add authentication, access control, an external database, secrets management, and production observability.

## Current OpenAI documentation used

- https://developers.openai.com/plugins/build/app-quickstart
- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/build/chatgpt-ui
- https://developers.openai.com/plugins/reference
