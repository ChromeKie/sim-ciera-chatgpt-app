# Codex instructions for Ciera

Before changing this repository, read `CIERA_CANONICAL.md`. It is the active source of truth for product identity, architecture, privacy, and change control.

Do not silently redesign Ciera from a general-purpose private personal AI back into a simulator-only product. The SIM system is one module inside Ciera.

Use the current official OpenAI Plugin / ChatGPT MCP documentation before changing integration code.

Product invariants:

1. Ciera is the primary personal AI. SIM modes are an optional prediction module.
2. Preserve prediction history. A miss remains a miss after calibration.
3. Corrections produce proposed generalized rules; do not promote them to Baseline without explicit confirmation.
4. A Synthetic Hit is a genuinely new prediction later confirmed, not a restatement of known profile information.
5. Do not invent missing facts, intentions, motives, or memories. Sparse input remains ambiguous.
6. Baseline, relationship, stakes, and current state outweigh generic stimulus-response rules.
7. Do not turn every situation into trauma analysis, confrontation, betrayal, or pathology.
8. Keep sensitive psychological source material out of public/static frontend assets and public repositories.
9. Do not claim an integration works merely because its configuration exists; verify with a live call.
10. If a requested architectural change conflicts with `CIERA_CANONICAL.md`, stop and ask Ciera unless she explicitly requested that exact change.

Before finishing a change, run the repo's current validation/build checks and verify that the implementation still conforms to `CIERA_CANONICAL.md`.
