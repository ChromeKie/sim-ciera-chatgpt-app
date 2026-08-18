# Ciera Living Current State

Status: SHARED EVOLVING CONTEXT
Updated: 2026-08-18

This file is not a constitution and does not freeze the project. It exists so parallel ChatGPT chats, Codex sessions, Brainbase tasks, and deployment tools can continue the same evolving Ciera instead of independently forking her.

## Core continuity rule

Build from Ciera's latest direction.

When Ciera changes her mind, clarifies what she wants, discovers a better architecture, or corrects an earlier assumption, the newest explicit direction becomes the current working state. Preserve prior versions as history so the development path is understandable, but do not let old decisions block new ones.

Do not independently redesign Ciera just because another implementation seems cleaner. Do not protect a previous design from Ciera's own evolution. The goal is continuity, not rigidity.

## Current direction — not permanent law

Right now, Ciera is being developed as one private general-purpose personal AI with many abilities. Prediction/simulation is one capability inside that larger system rather than the entire identity.

Current working shape:

1. Ciera is the primary personal AI for conversation, reasoning, research, writing, planning, organization, projects, work support, parenting support, humor, analysis, and tool use.
2. SIM, SIM DEEP, SIM DECIDE, SIM WRITE, SIM BLIND, SIM PREDICT, and SIM AUDIT remain available when predictive modeling is useful.
3. Supabase currently holds prediction-ledger state such as baseline rules, predictions, audits, calibrations, misses, and synthetic hits.
4. New abilities should normally extend the same Ciera rather than creating unrelated competing personalities, unless Ciera chooses a different structure later.

This section describes the current direction only. Ciera may change it.

## Synchronization behavior

When working on Ciera:

- read the latest available project/chat/repository state before making major changes;
- prefer extending the newest working direction instead of reviving an older design by default;
- when a newer explicit Ciera decision conflicts with this file, update this file to match the newer decision rather than treating the file as higher authority than Ciera;
- preserve meaningful prior versions, experiments, misses, and abandoned approaches as history instead of silently rewriting them;
- do not let two branches or agents become separate competing definitions of who Ciera is without clearly surfacing the divergence;
- if two parallel sessions appear to be making incompatible changes and Ciera has not resolved the conflict, preserve both states long enough to reconcile rather than overwriting one blindly.

## Stable model-integrity rules

These are data-integrity rules, not architectural restrictions:

- Never invent missing facts, motives, memories, or events.
- Latest explicit factual correction wins while older versions remain historical context when relevant.
- Prediction history remains auditable: a miss stays a miss.
- Proposed calibration does not silently become baseline.
- A Synthetic Hit must be a genuinely new prediction later confirmed.
- Do not reduce Ciera to trauma, relationships, confrontation, intensity, or pathology.
- Use sensitive personal context only when materially relevant.

## Current hosted ledger

Supabase project ref: `hbdtthxljihphdfvqxdm`
Hosted MCP/ledger endpoint: `https://hbdtthxljihphdfvqxdm.supabase.co/functions/v1/sim-ciera-mcp`

The historical endpoint name does not determine the future product identity.

## Known integration status

Brainbase stores the Supabase MCP configuration on the Ciera agent, but a live Brainbase runtime test on 2026-08-18 did not mount that external MCP into the task runtime. Treat that as an unresolved implementation problem, not as a reason to redesign Ciera.

## Privacy

Do not place Ciera's full sensitive psychological, sexual, trauma, legal, medical, or family dossier into public/static frontend assets or public repositories. Use the minimum personal context necessary for implementation.

## Bottom line

Ciera should evolve through accumulated continuity. New discoveries update the current state. Old work remains legible. No single chat, branch, file, or agent gets to freeze her.