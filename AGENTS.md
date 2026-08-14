# Codex instructions for Sim-Ciera

Use the current official OpenAI Plugin / ChatGPT MCP documentation before changing integration code.

Product invariants:

1. REAL CIERA and SIM-CIERA remain distinct. Predictions are never silently converted to facts about Real Ciera.
2. Preserve prediction history. A miss remains a miss after calibration.
3. Corrections produce proposed generalized rules; do not promote them to Baseline without explicit confirmation.
4. A Synthetic Hit is a genuinely new prediction later confirmed, not a restatement of known profile information.
5. Do not invent missing facts, intentions, or motives. Sparse input remains ambiguous.
6. Baseline, relationship, stakes, and current state outweigh generic stimulus-response rules.
7. Do not turn every situation into trauma analysis, confrontation, betrayal, or pathology.
8. Keep sensitive psychological source material out of public/static frontend assets.

Before finishing a change:

- run `npm run build`
- run `npm run validate`
- verify `server.js` still exposes `/mcp`
- verify mutating tools have accurate annotations
- verify the widget still supports the audit and explicit promotion flow
