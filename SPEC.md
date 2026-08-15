# Sim-Ciera deployment specification

## Product contract

Sim-Ciera is a private, single-user ChatGPT MCP app that loads an explicit behavioral simulator context, records blind predictions before reality is revealed, preserves the original prediction, audits outcomes as hit/partial/miss, and promotes calibration rules only after explicit confirmation.

The existing seven-tool surface and React dashboard are fixed for this deployment. ChatGPT supplies the language-model reasoning; the MCP service supplies context, ledger operations, and the widget resource.

## Deployment contract

- Runtime: Node.js on Alpic Cloud.
- Transport: stateless Streamable HTTP at `/mcp`.
- Build: `npm ci`, then `npm run build`.
- Start: `node server.js` using the platform-provided `PORT`.
- Persistence: local JSON for local development; Supabase Data API when `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SIM_CIERA_STORE_ID` are all configured.
- Privacy: the generalized simulator notes may ship with the server, but deeply sensitive source material must not be bundled into public widget assets.
- Access: the deployed Alpic environment must be restricted to ChatGPT IPs before personal predictions are stored.

## Acceptance checks

1. MCP initialization succeeds and lists all seven tools.
2. `get_simulator_context` runs before a blind prediction.
3. `save_prediction` writes a new immutable original prediction.
4. `audit_prediction` records reality without rewriting the prediction.
5. A proposed calibration remains proposed until `promote_calibration` is called.
6. `render_dashboard` returns the MCP App widget resource.
7. A saved record remains available after a fresh server process reads the durable store.
