# Component Architecture Upgrade Plan — NORTAQ Mission Control

**Domain:** Component Architecture (structure, props, reusability, composition, state management, hooks, context providers)
**Owner:** Component Architecture Lead
**App:** `Nortaq-PlayNexus/mission-control` (React 19 + Vite + TypeScript, no router/state library)
**Baseline commit:** `53c24be` (Phase H)
**Companion domains:** Visual/Rendering, Style/Layout, Color/Theme, Data/Interactivity

---

## 1. Current Architecture Snapshot

- Single god component `App.tsx` (~300 lines) owns: boot gate, data fetch, routing, keyboard handling, tilt tracking, scroll tracking, ops log sync, dossier state, phantom/konami state, toast subscription.
- 33 components in `src/components/`; 22 define a local `interface Props`. No shared primitive library — `Card`, `Metric`, `TechBar`, `HealthRow`, `SectionHeading`, `FilterChip`, `Badge`, `EmptyState` are inlined in every view with slightly different markup.
- State is passed via props drilling: `repos`/`telemetry` flow from `App` → every view. Derived data (active repos, domain counts, weekly buckets) is recomputed with `useMemo` independently in 4–5 views.
- Persistence is split across two ad-hoc mechanisms: `phantom` in `sessionStorage` (App), `covert` in `localStorage` (covertMode.ts) with a custom event bus. Toast is a module-level singleton with a listener set. Ops log requires manual `setOpsLogEntries(getOpsLog())` after every `logAction`.
- Routing is hand-rolled (hash + `pushState`) inside `App`. `Page` type includes `'archive'` which no view renders.
- Heavy view logic (filter/sort state) lives inside view components; no data hook layer.
- Only one hook file (`hooks.ts`) with `useFocusTrap`. No `useMediaQuery`, `useReducedMotion`, `useLocalStorage`, `useKeyboard`, `useDebounce`.
- `Constellation3D.tsx` is 37 KB in one file; `lazy()` is called separately in `MissionControl` and `NetworkView`.

**Goal of this plan:** make the UI composable, testable, and consistent, with a clear data flow (Context → hooks → views → primitives), while staying dependency-free (no new runtime libs) and not breaking the existing spy theme.

---

## 2. Target Folder Layout (end state)

```
src/
  app/                # App shell, providers, routing
    App.tsx
    providers/
      DataProvider.tsx
      SettingsProvider.tsx
      ToastProvider.tsx
      RouteProvider.tsx
      ShortcutProvider.tsx
  components/
    primitives/       # Card, Metric, TechBar, HealthRow, SectionHeading, ...
    features/         # Dossier, SearchOverlay, OpsLog, ...
    views/            # one folder per page
    visual/           # EntropyField, Constellation3D, ...
  hooks/             # useData, useSettings, useToast, useRoute, useKeyboard, ...
  lib/               # selectors, formatters, storage
  types/
```

Migration is incremental: items below can ship independently; the layout is the destination, not a prerequisite.

---

## 3. Upgrade Items

### Item 1 — DataContext + DataProvider
- **What:** Move the `fetch(DATA_URL)`/`FALLBACK_URL` logic, `repos`/`telemetry`/`status` state, and retry into a `DataProvider` component exposing `useData()` → `{ repos, telemetry, status, reload, lastLoadedAt }`. Views consume the hook instead of receiving props.
- **Why:** Eliminates prop drilling through 8 views; gives a single place to add caching, retry, stale-while-revalidate, and loading/error states; makes views independently testable with a mock provider.
- **Effort:** M
- **Files:** `src/App.tsx` (slim down), new `src/app/providers/DataProvider.tsx`, new `src/hooks/useData.ts`, update all `src/components/*View.tsx` and `MissionControl.tsx`.
- **Dependencies:** Data/Interactivity (owns fetch/retry/cache contract and `status` state machine); Style/Layout (loading/error skeleton visuals). Visual/Rendering (none).

### Item 2 — Settings / Preferences Context
- **What:** Unify `phantom` (sessionStorage) and `covert` (localStorage + custom event) into one `SettingsProvider` with typed prefs `{ phantom, covert, reducedMotion, soundEnabled }`, persisted per-key to the appropriate storage, and a `useSettings()` hook. Migrate `covertMode.ts` helpers to thin wrappers around the provider.
- **Why:** Two competing persistence buses; components read prefs inconsistently; adding a new toggle currently requires editing App + a storage module. One provider makes preferences reactive everywhere and testable.
- **Effort:** M
- **Files:** new `src/app/providers/SettingsProvider.tsx`, new `src/hooks/useSettings.ts`, `src/covertMode.ts` (deprecate internals), `src/App.tsx`.
- **Dependencies:** Color/Theme (theme variant tokens if a theme switcher is added); Data/Interactivity (none).

### Item 3 — UI Primitives Library
- **What:** Extract reusable primitives under `src/components/primitives/`: `Card` (+ `CardHeader`/`CardTitle`/`CardBody`), `Metric`, `TechBar` (+ `TechBarRow`), `HealthRow`, `SectionHeading`, `FilterChip`, `Badge`/`StatusChip`, `Chip`, `EmptyState`, `LoadingState`, `ErrorState`, `CopyButton`. Each accepts `className`, `style` override, and variant props; uses existing CSS classes as the base so Style/Layout owns visuals.
- **Why:** The same 6–8 markup blocks are duplicated across views with drift (e.g., `freshness-cell`, `health-row`, `tech-bar-row`). Primitives give one source of truth, consistent a11y (roles, aria), and make Style/Layout changes mechanical.
- **Effort:** L
- **Files:** new `src/components/primitives/*` (≈12 files), refactor all `*View.tsx`, `MissionControl.tsx`, `Dossier.tsx`, `SearchOverlay.tsx`.
- **Dependencies:** Style/Layout (must finalize class names/variants first); Color/Theme (token-based variant colors). Blocks Item 11 partly.

### Item 4 — Shared Data Selectors & Domain Hooks
- **What:** Move repeated `useMemo` derivations into `src/lib/selectors.ts` + hooks in `src/hooks/`: `useActiveRepos()`, `useLiveRepos()`, `useDomainCounts()`, `useLanguageCounts()`, `useWeeklyBuckets(weeks)`, `useFreshnessBuckets()`, `useTopStarred(n)`, `useIssueLoad(n)`. Each takes optional filters.
- **Why:** `activeRepos` filter is copy-pasted in 5 files; weekly-bucket logic duplicated in 3. Centralizing fixes subtle drift (e.g., `TelemetryView` counts forks differently than `MissionControl`) and gives Data/Interactivity a place to define canonical metrics.
- **Effort:** M
- **Files:** new `src/lib/selectors.ts`, new `src/hooks/useRepoSelectors.ts`, refactor views.
- **Dependencies:** Data/Interactivity (canonical metric definitions / filter rules); depends on Item 1 (consumes `useData`).

### Item 5 — Routing Context / `useRoute` Hook
- **What:** Replace the inline hash routing in `App` with a `RouteProvider` exposing `useRoute()` → `{ page, navigate, params }` with typed `Page` (remove dead `'archive'` or implement the view). Keep hash + `pushState` sync, add `popstate` handling, and expose `navigate(page, { replace })`.
- **Why:** Routing logic is tangled with keyboard handling and tilt tracking in `App`; views that need navigation (e.g., `MissionControl`'s metric clicks) receive `onNavigate` prop. A hook lets any component navigate and keeps deep links/back-forward correct.
- **Effort:** M
- **Files:** new `src/app/providers/RouteProvider.tsx`, new `src/hooks/useRoute.ts`, `src/App.tsx`, `src/types.ts` (clean `Page`), views using `onNavigate`.
- **Dependencies:** Data/Interactivity (URL state conventions); Style/Layout (view transition classes).

### Item 6 — Toast & OpsLog as Context/Hooks
- **What:** Convert the module-singleton toast to a `ToastProvider` with a queue (multiple toasts, auto-dismiss, aria-live region) exposing `useToast()` → `{ show, dismiss }`. Convert ops log to `useOpsLog()` hook that subscribes to storage events and auto-syncs, removing manual `setOpsLogEntries` calls.
- **Why:** Current toast can only show one message and is not React-idiomatic; ops log desyncs easily (App manually refreshes after `logAction`). Providers make both reactive and accessible.
- **Effort:** S (toast) + S (ops log) = M total
- **Files:** new `src/app/providers/ToastProvider.tsx`, refactor `src/toast.ts` into hook, refactor `src/opslog.ts` to emit events, `src/App.tsx`, `src/components/OpsLog.tsx`.
- **Dependencies:** Style/Layout (toast positioning/animation); Color/Theme (toast variants).

### Item 7 — View Composition + Per-View Error Boundaries
- **What:** Introduce `ViewShell`/`PageLayout` (HeaderBar + scroll container + optional sidebar actions) and wrap each route in its own `ErrorBoundary` with a retry action. Move the `key={page}` view-stage transition into `ViewShell`.
- **Why:** A crash in one view (e.g., Constellation3D WebGL failure) currently takes down the whole app via the single top-level boundary. Per-view boundaries + a shell standardize layout and recovery.
- **Effort:** M
- **Files:** new `src/components/primitives/ViewShell.tsx`, `src/components/ErrorBoundary.tsx` (add reset/retry props), `src/App.tsx`.
- **Dependencies:** Visual/Rendering (WebGL failure fallbacks); Style/Layout (transition classes).

### Item 8 — Dossier Navigation Abstraction
- **What:** Extract `useDossierNavigation(siblings)` hook handling prev/next index, keyboard arrows, and bounds; expose `DossierController` context so `Dossier` is purely presentational. Standardize the `siblings` contract to `(repos, filter?)`.
- **Why:** Prev/next + keyboard logic is duplicated inside `Dossier` and the view's `onNavigate`. Extracting makes it testable and lets search results open a dossier with sibling navigation.
- **Effort:** S
- **Files:** new `src/hooks/useDossierNavigation.ts`, refactor `src/components/Dossier.tsx`, `ProjectsView.tsx`, `NetworkView.tsx`, `SearchOverlay.tsx` (open dossier via context).
- **Dependencies:** Data/Interactivity (selection state); Item 5 (navigation).

### Item 9 — Keyboard & Shortcut System
- **What:** Replace the inline `keydown` handler in `App` with a `ShortcutProvider` + `useShortcut(key, handler, { when })` hook. Declaratively register: `/`, `?`, `1–8`, Konami, `Esc`, dossier arrows. Support scoped shortcuts (only when overlay open).
- **Why:** The current single handler is 60 lines with manual index tracking and is hard to extend; overlays re-implement Esc independently. A registry makes shortcuts discoverable (feed the HelpOverlay from it) and testable.
- **Effort:** M
- **Files:** new `src/app/providers/ShortcutProvider.tsx`, new `src/hooks/useShortcut.ts`, refactor `src/App.tsx`, `src/components/SearchOverlay.tsx`, `src/components/HelpOverlay.tsx`, `src/components/Dossier.tsx`.
- **Dependencies:** Item 5 (navigation); Data/Interactivity (none).

### Item 10 — New Components Needed
- **What:** Add the following new components (many fold into Item 3's primitives, but called out as net-new capabilities):
  - `RepoCard` — extracted from `ProjectsView` + `MissionControl` (field shortlist), with `variant: 'grid' | 'list' | 'compact'`.
  - `FilterBar` — sort buttons + domain filter chips + count; replaces duplicated filter rows in `ProjectsView`/`NetworkView`.
  - `MetricGrid` — responsive grid of `Metric` with consistent gaps.
  - `TechBarGroup` — labeled group of `TechBarRow` with normalization.
  - `StatusChip` — visual for `DossierStatus` (ACTIVE/MONITORED/DORMANT/ARCHIVED).
  - `Skeleton` / `LoadingState` — shimmer placeholders for cards/metrics (coordination: Visual).
  - `EmptyState` — icon + title + hint for empty lists.
  - `ErrorState` — message + retry button for failed loads.
  - `VirtualList` — windowed list for 100+ repos in ProjectsView (performance).
  - `ConfirmDialog` — accessible modal for destructive ops (clear ops log, etc.).
- **Why:** These are the gaps the codebase currently fills with inline markup; each is reused ≥3 times or is a clear UX gap (loading/empty/error states are inconsistent or absent).
- **Effort:** L
- **Files:** new files under `src/components/primitives/` and `src/components/features/`.
- **Dependencies:** Style/Layout (class names); Visual/Rendering (skeleton shimmer, virtualization); Color/Theme (status colors); Data/Interactivity (empty/error triggers).

### Item 11 — Constellation3D Decomposition
- **What:** Split the 37 KB `Constellation3D.tsx` into: `ConstellationScene` (renderer/camera/controls setup), `ConstellationNodes`, `ConstellationEdges`, `ConstellationLabels`, `useConstellationData` (node/edge derivation), `useConstellationInteraction` (hover/select/raycast). Define a stable props contract `{ repos, filter, compact, onSelect, highlightedId }`. Create a single `lazyConstellation` factory exported from `src/components/visual/` to dedupe `lazy()` calls.
- **Why:** One 37 KB file is hard to review/test; `lazy()` duplicated in two views risks double bundles. Decomposition enables Visual/Rendering to iterate on effects without touching data logic.
- **Effort:** L
- **Files:** refactor `src/components/Constellation3D.tsx` into `src/components/visual/constellation/*`, new `src/components/visual/lazyConstellation.ts`.
- **Dependencies:** Visual/Rendering (owns scene/effects); Data/Interactivity (node derivation inputs). Style/Layout (container sizing).

### Item 12 — Component API Standardization + Type Hygiene
- **What:** Standardize prop APIs across all components: rename `repos`→`data` only where a generic `DataSlice` is used (or keep `repos` but consistent order `data, telemetry`); unify `onNavigate: (page: Page) => void` (no `string`); add `className?`/`style?` passthrough to primitives; replace `any` casts (e.g., `['--circ' as any]`) with typed CSS custom property helpers; remove dead `'archive'` from `Page` or implement the view; add JSDoc to all public components.
- **Why:** Inconsistent prop types (`Page` vs `string`) cause casts at call sites; `any` casts hide CSS typing errors; dead types rot. Standardization is the prerequisite for the primitive library (Item 3) to be usable.
- **Effort:** L (mechanical, but wide-reaching)
- **Files:** all `src/components/*.tsx`, `src/types.ts`, `src/theme.ts` (export typed CSS var helper).
- **Dependencies:** All domains (naming agreement); Data/Interactivity (Page type).

### Item 13 (bonus) — Accessibility & Motion Hooks
- **What:** Add `useReducedMotion`, `useMediaQuery`, `useAnnouncer` (aria-live for toasts/status), and `useIntersectionObserver` to `src/hooks/`. Wire `prefers-reduced-motion` into visual components (EntropyField, MatrixRain, PhosphorTrail) and the toast region.
- **Why:** Accessibility doc promises motion respect; current code has no reduced-motion handling. Hooks make it consistent and reusable.
- **Effort:** S
- **Files:** new hooks in `src/hooks/`, refactor visual components.
- **Dependencies:** Visual/Rendering (motion gating); Style/Layout (reduced-motion CSS).

---

## 4. Coordination Needs (cross-domain)

| This item | Needs from | Contract |
|---|---|---|
| 1 DataContext | Data/Interactivity | Fetch/retry/cache/status state machine + `reload()` semantics |
| 1 DataContext | Style/Layout | Loading/error skeleton component slots |
| 3 Primitives | Style/Layout | Final CSS class names & variant modifiers before extraction |
| 3 Primitives | Color/Theme | Token names for variant colors (success/warning/error/info) |
| 4 Selectors | Data/Interactivity | Canonical definitions of "active", "live", "freshness" buckets |
| 5 Routing | Data/Interactivity | Deep-link param conventions (e.g., `#projects?repo=x`) |
| 6 Toast | Style/Layout | Toast container position/animation; aria-live region markup |
| 7 ViewShell | Visual/Rendering | WebGL failure fallback content |
| 10 New components | Visual/Rendering | Skeleton shimmer + virtualization approach |
| 11 Constellation3D | Visual/Rendering | Scene API contract so effects can be added without data changes |
| 12 API standardization | All | Agreed prop naming (`data` vs `repos`, `onNavigate` typed) |
| 13 A11y hooks | Visual/Rendering | Which animations must respect reduced motion |

**Sequencing recommendation:**
1. Items 12 (types/API) + 5 (routing) + 9 (shortcuts) — foundation, low visual risk.
2. Items 1 (DataContext) + 4 (selectors) + 2 (settings) — data flow.
3. Items 6 (toast/opslog) + 8 (dossier) — state ergonomics.
4. Items 3 (primitives) + 10 (new components) — UI layer (needs Style/Layout agreement first).
5. Items 7 (view shell/boundaries) + 11 (constellation split) + 13 (a11y hooks) — polish/hardening.

## 5. Risks & Out of Scope

- **No new runtime dependencies** — plan uses only React 19 + existing Vite/TS. If a router (react-router) is desired, that's a separate decision (would replace Items 5/9 partly).
- **Visual fidelity** must not regress: primitives must preserve current CSS classes; Style/Layout lead signs off before Item 3 lands.
- **Out of scope:** backend/data pipeline changes (collect-data.py), 3D effect redesign (Visual/Rendering owns), color token redefinition (Color/Theme owns), CSS rewrite (Style/Layout owns). This plan only restructures React component code and consumes those domains' outputs.
- **Testing:** plan assumes adding Vitest + React Testing Library is approved by Data/Interactivity lead; component tests for hooks/primitives are part of each item's "done" criteria.

## 6. Definition of Done (per item)

- TypeScript compiles (`tsc`) with no new errors.
- No prop drilling of `repos`/`telemetry` beyond the provider boundary.
- Each new primitive has a usage example in at least two views.
- Hooks have unit tests (selectors, routing, shortcuts).
- `npm run build` succeeds and bundle size does not regress by >5% (Constellation3D split should reduce main chunk).
- Accessibility: keyboard-only navigation still works for all overlays; reduced-motion respected where applicable.