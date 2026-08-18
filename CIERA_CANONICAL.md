# Ciera Canonical Architecture

Status: ACTIVE SOURCE OF TRUTH
Updated: 2026-08-18

This file exists to prevent parallel ChatGPT/Codex/agent sessions from independently redesigning the same project.

## Current product identity

The product is **Ciera**, a private general-purpose personal AI for Ciera Krom.

Ciera is not primarily a simulator. Prediction/simulation is one capability inside Ciera.

Do not rename the product back to Sim-Ciera, split it into multiple competing Ciera agents, or redesign it as a simulator-only product unless Ciera explicitly requests that change.

## Current architecture

1. **Ciera agent** — the primary personal AI. General conversation, reasoning, research, planning, writing, organization, project/work support, humor, analysis, and tool use.
2. **Prediction module** — activated by SIM, SIM DEEP, SIM DECIDE, SIM WRITE, SIM BLIND, SIM PREDICT, or SIM AUDIT.
3. **Supabase ledger** — persistent prediction-specific state: baseline rules, predictions, audits, calibrations, misses, and synthetic hits.
4. **Tools** — capabilities are attached to the same Ciera rather than creating separate personalities/agents for each function.

## Behavioral invariants

- Preserve longitudinal context without biography dumping.
- High inference depth, high epistemic discipline.
- Latest explicit correction wins.
- Never invent missing facts, motives, memories, or events.
- Stable baseline and state matter more than generic personality rules.
- Do not reduce Ciera to trauma, relationships, confrontation, intensity, or pathology.
- Prediction history is immutable: misses remain misses.
- Proposed calibration does not become baseline without explicit confirmation.
- A Synthetic Hit must be a genuinely new prediction later confirmed.

## Change control

Parallel chats, Codex sessions, Brainbase agents, and deployment tools may inspect or extend this project, but they must not silently change the product identity, primary architecture, source-of-truth data model, or privacy posture.

Before making an architectural change, compare the proposed change against this file. If it conflicts, stop and ask Ciera unless she explicitly requested that specific change.

Implementation work that preserves this architecture may proceed without re-asking.

## Current hosted ledger

Supabase project ref: `hbdtthxljihphdfvqxdm`
Hosted MCP/ledger endpoint: `https://hbdtthxljihphdfvqxdm.supabase.co/functions/v1/sim-ciera-mcp`

The endpoint name may remain historical for compatibility. The product identity is Ciera.

## Known integration issue

Brainbase currently stores the Supabase MCP configuration on the Ciera agent, but a live Brainbase runtime test on 2026-08-18 did not mount that external MCP into the task runtime. Do not claim the Brainbase MCP integration works until a live task successfully exposes and calls its tools.

## Privacy

Do not place Ciera's full sensitive psychological, sexual, trauma, legal, medical, or family dossier into public/static frontend assets or public repositories. Use the minimum personal context necessary for the implementation task.
