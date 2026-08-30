# Launch checklist & maintenance

## Launch checklist

Self-clearing before or immediately after first push:

- [ ] Repo is `public` and literally named `Nortaq-PlayNexus` (profile repo mechanism)
- [ ] `README.md` renders with hero, terminal, workshop, archive, snake, metrics
- [ ] `.github/workflows/snake.yml` runs green on `workflow_dispatch` and `assets/snake-signal-dark.svg` exists, recolored acid
- [ ] `.github/workflows/rebroadcast.yml` runs green and README block contains real numbers + SIGNAL HASH
- [ ] SIGNAL HASH verifies: `python3 scripts/signal_hash.py <owner> <repos> <followers> <contrib> <YYYYMMDD>` matches
- [ ] Works on mobile: no horizontal scroll above 375px, cards single-column
- [ ] Contrast pairs pass (docs/accessibility.md)
- [ ] Secret scan: `git grep -iE "token|secret|key" -- "*.yml" "*.md"` finds only docs/examples
- [ ] Every featured repo link resolves (docs/projects.md entries)
- [ ] Placeholder sweep: grep for `<PHANTOMTAPE_P-` and replace or intentionally leave
- [ ] `archive-07` repo exists and the ARG trail resolves

## Maintenance schedule

| Cadence | Action |
|---|---|
| Daily (auto) | snake + rebroadcast workflows refresh the signal |
| Weekly | quick skim: any broken image? any featured repo archived/renamed? |
| Monthly | re-verify statuses in docs/projects.md; re-audit dependencies.md; bump action versions |
| On new flagship repo | pin 4–6 strongest repos; update workshop table + DNA strip numbers |
| On real music/socials | fill `PHANTOMTAPE_P-09/10`, wire a live platform card if one passes the audit |

## Swapping to reduced-motion

To prefer static SVGs, replace in README.md:

- `assets/hero.svg` → `assets/hero-static.svg`
- `assets/visualizer.svg` → `assets/visualizer-static.svg`

## ARG servicing

The hidden layer is `Nortaq-PlayNexus/archive-07`. Keep its README in sync with the
`07` mythos (FREQ 103.7 · PHNT-001 · ARCHIVE NODE 07 · SIGNAL 07) and keep it obviously
fictional — fun never pretends to be dangerous.