# Storytelling / Narrative Ideas — Spy & Intel Mission Control Dashboard

> Five specific, implementable narrative features for the Nortaq mission-control dashboard
> (`Nortaq-PlayNexus/mission-control`). Each turns existing telemetry (repos, activity,
> issues, stars, domains) into a story. React 19 + TypeScript + Vite, no new runtime deps
> unless noted. All data already ships in `data/dashboard.json`.

---

## 1. CASE FILE NARRATIVE — "Operation Replay"

**What.** A cinematic, scrub-able case-file narrative for any single repository. Opened from the existing `Dossier`, it renders the repo's life as an espionage case: *RECRUITMENT* (creation), *FIELD OPS* (commit bursts), *CONTACT LOST* (dormancy), *REACTIVATION* (revival), *CLOSURE* (archive). A horizontal timeline slider drives a typewriter-revealed prose panel; each beat pulls real facts (created_at, pushed_at, activity_score, open_issues_count, stargazers_count, domain). A "HANDLER'S NOTE" footer synthesizes a one-paragraph assessment ("Asset has been dark 142 days; recommend re-tasking or retirement.").

**Why groundbreaking.** Dashboards show numbers; this converts a row of metrics into a *documentary*. It makes dormant repos emotionally legible (operators stop ignoring stale assets) and gives every repo a shareable "case story" URL. Novel pairing: deterministic data → generated prose, with the user scrubbing cause-and-effect instead of reading a chart.

**Effort.** M (3–5 days). Generator is pure functions over `RepoData`; UI reuses `TypewriterText`, `Dossier` shell.

**Files.**
- New: `src/narrative/caseNarrative.ts` — `buildBeats(repo): Beat[]`, `handlerNote(repo): string`
- New: `src/components/CaseNarrative.tsx` — timeline slider + typewriter panel + beat chips
- Modify: `src/components/Dossier.tsx` — add "OPEN CASE NARRATIVE" button
- Modify: `src/types.ts` — add `Beat { id, label, date, tone, text }`
- Modify: `src/App.tsx` — modal state `caseNarrativeRepo` (mirrors `dossierRepo`)
- New: `src/styles/case-narrative.css` (or append `global.css`)

---

## 2. GUIDED TOUR — "Handler Briefing" Onboarding

**What.** A first-run, step-driven guided tour framed as a handler briefing a new field agent. Each step spotlights a UI region (sidebar page, metric, constellation, live feed) with a spy-flavored caption ("This is your ASSET ROSTER — every repo is an agent. Green means in the field."). Progress persists in `localStorage` (`nortaq.tour.v1`); a "CLEARANCE LEVEL" badge (L1→L5) advances as pages are visited. Re-launchable via `?` help overlay and `H` hotkey. Skippable; never blocks data.

**Why groundbreaking.** Replaces the dead "help page" with an *immersive tutorial that teaches AND onboards*. Clearance-gating doubles as a discovery mechanic (hidden panels unlock at L3+), turning exploration into a game without inventing fake content. All copy is generated from real component labels, so it never drifts from the UI.

**Effort.** M (4–6 days). Spotlight math via `getBoundingClientRect` + overlay div; no dependency.

**Files.**
- New: `src/components/TourOverlay.tsx` — spotlight, caption card, next/skip, focus trap
- New: `src/tour/steps.ts` — `TourStep[]` keyed to `data-tour="..."` attributes
- New: `src/tour/progress.ts` — localStorage read/write, clearance calc
- Modify: `src/components/Sidebar.tsx`, `MissionControl.tsx`, etc. — add `data-tour` hooks
- Modify: `src/components/HelpOverlay.tsx` — "REPLAY BRIEFING" button
- Modify: `src/App.tsx` — `tourOpen` state, auto-open if `!progress.completed`

---

## 3. INTERACTIVE STORY — "The Double Agent" (Branching Case)

**What.** A standalone page: a fictional, branching espionage case whose nodes are *real* assets. Each scene presents a decision ("Interrogate the dormant `aurora-audio-engine` asset, or follow the fresh signal from `synthesis-dj`?"). Branches resolve using live telemetry — choosing a dormant asset with high open-issues triggers a "trap" ending; choosing an active, starred asset advances. Six endings, including a "PHANTOM" ending gated behind Konami mode. A "REPLAY WITH DIFFERENT INTEL" button re-rolls using a different seed slice of repos, so no two runs are identical.

**Why groundbreaking.** It's a roguelike narrative whose win/lose conditions are *your actual portfolio health* — playing it literally audits your repo hygiene. Groundbreaking fusion of fiction and live data; endings are earned by real engineering habits, not button mashing. Shareable ending cards (PNG via canvas) drive engagement.

**Effort.** L (6–9 days). Story graph ~40 nodes; engine is a tiny state machine.

**Files.**
- New: `src/pages/InteractiveStory.tsx` (or `src/components/InteractiveStory.tsx`)
- New: `src/story/engine.ts` — `advance(state, choice): State`, ending resolver
- New: `src/story/graph.ts` — node/choice/ending definitions
- New: `src/story/seed.ts` — maps repo slices to story variables (activity, stars, issues)
- Modify: `src/types.ts` — `StoryNode`, `StoryState`, `Ending`
- Modify: `src/App.tsx` — add `'story'` to `Page` union + route + sidebar entry
- Modify: `src/components/Sidebar.tsx` — nav item "STORY // CASE FILE"
- New: `src/components/EndingCard.tsx` — canvas-rendered shareable card

---

## 4. INCIDENT RECONSTRUCTION — "Black Box"

**What.** Auto-generated post-mortem narratives for repos that are dormant (>90d) or carry heavy open-issue load. A "BLACK BOX" panel (new card on Mission Control + dedicated view) reconstructs the last 90 days: last push, issue velocity, star delta (where historical data exists), and a generated "PROBABLE CAUSE" + "RECOMMENDED ACTION" (re-task / archive / triage). Operators can mark a case "ACKNOWLEDGED / RETIRED / REVIVED"; state persists locally and is reflected as a status chip. Think aircraft black-box readout, but for software assets.

**Why groundbreaking.** Most dashboards flag stale repos with a red dot and stop. This produces a *readable incident report* with a recommended disposition, and tracks the operator's decision — closing the loop from detection to action. Turns "tech debt" into a narrative with accountability.

**Effort.** M (4–6 days). Heuristic classifier over existing fields; no backend.

**Files.**
- New: `src/narrative/incidentReport.ts` — `classify(repo)`, `probableCause(repo)`, `recommendation(repo)`
- New: `src/components/BlackBox.tsx` — list + detail panel + acknowledge/retire/revive actions
- New: `src/components/BlackBoxCard.tsx` — Mission Control summary card
- Modify: `src/components/MissionControl.tsx` — render `BlackBoxCard` in grid
- Modify: `src/App.tsx` — route `'blackbox'` page + sidebar entry
- Modify: `src/components/Sidebar.tsx` — nav item
- Modify: `src/types.ts` — `IncidentDisposition = 'open' | 'acknowledged' | 'retired' | 'revived'`

---

## 5. LIVE NARRATIVE FEED — "Signal Intercept"

**What.** An ambient, typewriter-streamed "intercepted transmission" overlay that narrates the dashboard's own data as a spy radio broadcast. On load and on page change it streams lines like: `> INTERCEPT: asset "synthesis-dj" pushed 2d ago — handler, movement detected.` `> WATCHLIST: 4 assets dark >90d — recommend sweep.` It reuses `LiveFeed`'s repo ordering but converts each item to a narrated beat, with configurable verbosity (QUIET / NORMAL / VERBOSE) and a mute toggle. A "TRANSCRIPT" button dumps the last N lines to clipboard as a markdown briefing.

**Why groundbreaking.** Converts passive telemetry into *ambient storytelling* — the dashboard feels alive and watched. The transcript export makes it a genuine reporting tool (paste into a standup). It's the narrative equivalent of a screensaver: zero interaction required, maximum atmosphere, and it reuses data already on screen so it never lies.

**Effort.** S–M (2–4 days). Pure presentation layer over existing `repos`/`telemetry`.

**Files.**
- New: `src/components/SignalIntercept.tsx` — stream renderer, verbosity + mute controls
- New: `src/narrative/broadcastNarrator.ts` — `narrateRepo(repo)`, `narrateTelemetry(t)`, `narratePage(page)`
- Modify: `src/components/LiveFeed.tsx` — optional "NARRATE" toggle to pipe through narrator
- Modify: `src/App.tsx` — mount `SignalIntercept` in StatusBar region or as floating widget
- Modify: `src/components/StatusBar.tsx` — intercept toggle + transcript button
- Modify: `src/styles/global.css` — intercept panel styling (monospace, scanline)

---

## Shared infrastructure (applies to 1, 4, 5)

- `src/narrative/` directory for pure, testable prose generators (no React, no DOM) — keeps narrative logic unit-testable and reusable across components.
- A single `useNarration(repo)` hook returning `{ beats, note, tone }` to avoid duplicating generator calls.
- All generated text is deterministic from input data; no LLM calls required (keeps it offline and auditable, consistent with the project's "no invented data" principle). An optional LLM-polish pass can be added later behind a flag.

## Suggested implementation order

1. **Signal Intercept (5)** — smallest, highest atmosphere-per-effort; validates the `narrative/` module pattern.
2. **Case File Narrative (1)** — reuses narrator patterns; biggest "wow" on existing Dossier.
3. **Handler Briefing tour (2)** — onboarding; depends on stable `data-tour` hooks added in step 1/2.
4. **Black Box (4)** — disposition state + classifier; moderate.
5. **Double Agent (3)** — largest; build last once narrative primitives are proven.

## Out of scope / explicitly not proposed

- No fabricated metrics or "predicted" values presented as fact (would violate the dashboard's auditability ethos).
- No server-side persistence; dispositions and tour progress stay in `localStorage` to match the static-host (GitHub Pages) deployment.
- No new heavy deps (no animation libs); reuse `TypewriterText`/`ScrambleText`/`GlitchText`.
