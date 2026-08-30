# Dependencies — audit log

Every external service the profile touches, audited before use.

| Service | Purpose | Reliability | Needs token? | Needs workflow? | Breaks silently? | Self-host? | Verdict |
|---|---|---|---|---|---|---|---|
| Platane/snk v3 | contribution snake SVG | good, pinned SHA verify at install | GITHUB_TOKEN (built-in) | snake.yml | image goes stale (we refresh nightly) | no (Acts in CI) | IN |
| github-readme-stats (Vercel) | live stats + top-langs cards | generally good | optional | no | card image fails to load | yes (self-deployable) | IN (conditional) |
| streak-stats.demolab.com | streak card | generally good | no | no | image fails to load | no | IN (conditional) |
| GitHub REST/GraphQL API | rebroadcast data | platform-native | GITHUB_TOKEN | rebroadcast.yml | block holds last good data | n/a | IN |
| shields.io badges | none currently | – | – | – | – | – | OUT (not used) |
| readme-typing-svg | none currently | – | – | – | – | – | OUT (third-party hosted typers; self-hosted assets instead) |

Rules applied:

1. **Failure mode:** if an external card image ever 404s, the page shows a broken tile.
   That is acceptable for the two stats cards because the core (hero, terminal, projects,
   ARG, snake, rebroadcast block) is all first-party and repo-hosted.
2. **Minimum third party:** exactly 2 hosting-dependent cards. Everything else ships in-repo.
3. **Palette:** only custom params; no `theme=` names that clash with the token set.
4. **Pinning:** all `uses:` actions pinned to major versions; an upgrade pass is part of
   maintenance.md (consider SHA-pinning for hardened trust).