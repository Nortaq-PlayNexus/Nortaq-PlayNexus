# PROJECT TRUTH TABLE (authoritative)

Everything featured on the profile is a real, publicly visible repository.
This table is the single source of truth for workshop + archive statuses.
Recheck statuses monthly (see maintenance.md).

## Workshop (featured)

| # | Repo | Lang | Stars | Updated | Status (rule) |
|---|---|---|---|---|---|
| 001 | synthesis-dj | JavaScript | 0 | 2026-08-27 | ● ONLINE — has CI + tests + MIT, actively maintained |
| 002 | FreeStack | Python | 1 | 2026-08-29 | ◐ IN DEVELOPMENT — most recently touched |
| 003 | nexus-agent-x | Python | 0 | 2026-08-27 | ● ACTIVE — the operator's own daily-driver OS |
| 004 | aurora-audio-engine | Rust | 1 | 2026-08-27 | ⚠ EXPERIMENTAL — low-level DSP, young |
| 005 | orion-sentinel-ai | JavaScript | 1 | 2026-08-27 | ◐ IN DEVELOPMENT |
| 006 | PlayNexus-Foundry | TypeScript | 0 | 2026-08-27 | ◐ IN DEVELOPMENT |

Status key: ● ONLINE (ships) · ● ACTIVE (recent work, healthy) · ◐ IN DEVELOPMENT · ⚠ EXPERIMENTAL · ○ ARCHIVED · ◆ RELEASED.
Rule: never inflate. An abandoned repo is `○ ARCHIVED` or gets dropped from the profile.

## Archive (audio side)

| SKU | Repo | Fact |
|---|---|---|
| PHNT-002 | sonic-facility | ships a release exe; procedural art seeded by BPM/key; SoundCloud publish path |
| PHNT-003 | playnexus-musicvidforge | finished tool: beat-synced video, 4K H.264/H.265/NVENC |
| PHNT-004 | Brainarr | local-only AI (Ollama/LM Studio) import list for Lidarr |
| PHNT-005 | RustVoiceBooster | virtual-cable DJ audio boost suite |

## Base facts (from the GitHub API)

- public_repos = 41 · followers = 2
- languages by primary counts: Python 19, JS 3, TS 3, Rust 3, C# 2, HTML 1, PHP 1 (9 forks/detection-null)
- contributions (rolling year, GraphQL) = 893 · account created 2026-07-31 UTC