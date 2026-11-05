# Upgrade Plan — DATA / INTERACTIVITY Lead

**App:** `Nortaq-PlayNexus/mission-control` (React 19 + TS + Vite, static GitHub-Pages host)
**Domain:** data flow, state management, interactivity, keyboard navigation, accessibility, user input, data fetching, caching, real-time updates, error handling.
**Companion domains:** Visual/Rendering, Style/Layout, Color/Theme, Component Architecture. Coordination notes are called out per item and in §Coordination.

This plan is scoped to *data and interaction plumbing*. It deliberately does not change visual styling, color tokens, or component file layout beyond what is required to wire state and handlers; those are owned by the other leads. Where a change touches another domain, the dependency is flagged `DEP:`.

---

## Current baseline (what exists today)

- Single `fetch()` in `App.tsx` (`DATA_URL` → `FALLBACK_URL`), status `'loading' | 'ok' | 'error'`. No abort, no retry, no cache, no revalidation.
- State: ~15 `useState` in `App`, prop-drilled to views. View-local state (`sort`, `domainFilter`, `selected`) is lost on unmount/navigation.
- Keyboard: one global `keydown` handler in `App`; `Dossier` and `SearchOverlay` add their own window listeners. No input-focus guard → typing in a field still triggers `1`–`8` navigation.
- Accessibility: `useFocusTrap` hook exists; many clickable `div`s have `onClick` only (no `role`, `tabIndex`, or `onKeyDown`). Toast has no `aria-live`. No skip link, no reduced-motion handling, no focus restoration on modal close.
- Persistence: `sessionStorage` ops log, `localStorage` covert mode/phantom. No versioned preference store, no migration.
- Error handling: one top-level `ErrorBoundary`; no per-view boundaries; fetch failure is all-or-nothing.
- No tests in `src/`.

---

## Items

### 1. Typed data layer with runtime validation + fetch lifecycle
**What.** Replace the ad-hoc `fetch` in `App.tsx` with a `loadDashboard()` in `src/data/dashboard.ts` that (a) validates the JSON against a runtime schema (zod is not a dep — implement a small hand-rolled `isDashboard()` guard + normalizer, consistent with the "no new heavy deps" ethos), (b) exposes a discriminated status `'idle' | 'loading' | 'success' | 'error' | 'stale'`, (c) returns `{ repos, telemetry, generatedAt, etag }`, (d) supports `AbortSignal` and a 10s timeout, (e) surfaces a typed `DashboardError { code, message, retryable }`. `App` keeps `status` but gains `error` and `lastLoadedAt`.
**Why.** Today a malformed/empty payload silently becomes `repos=[]` and looks identical to "no data"; there is no way to distinguish network vs. parse vs. schema failure, and no retry path except full reload. Runtime validation is the precondition for every other data item (caching, revalidation, partial data).
**Effort.** M (3–4 days).
**Files.** New `src/data/dashboard.ts`, `src/data/schema.ts`; modify `src/App.tsx` (fetch effect), `src/types.ts` (add `DashboardError`, `LoadStatus`); new `src/data/__tests__/schema.test.ts`.
**DEP.** Component Architecture (where the loader is invoked — keep in `App` or move to a provider). No visual dep.

### 2. SWR-style cache + revalidation hook (`useDashboard`)
**What.** A `useDashboard()` hook wrapping item 1 with: in-memory cache keyed by URL, `stale-while-revalidate` on mount, automatic revalidation on `visibilitychange` (tab focus) and `online` events, manual `refresh()`, and `isRefreshing` flag. Cache persists across route changes (lives in `App` provider, not view). Exposes `data`, `status`, `error`, `refresh`, `lastUpdatedAt`. Keep an ETag/`If-None-Match` pass-through when the host supports it (GitHub Pages does not, so fall back to `generated_at` comparison to skip redundant state writes).
**Why.** Data is "live" in copy but static in practice; operators have no way to pick up a nightly rebuild without a hard reload, and every navigation re-runs nothing (data is already in state, but there's no refresh affordance at all). SWR gives honesty: the dashboard re-checks on focus and shows when it last synced.
**Effort.** M (3–5 days).
**Files.** New `src/data/useDashboard.ts`, `src/data/cache.ts`; modify `src/App.tsx` (replace inline fetch with provider); modify `src/components/StatusBar.tsx` (last-synced stamp + refresh button — coordinate with Component Architecture for prop shape).
**DEP.** Item 1. Style/Layout (refresh button placement in StatusBar).

### 3. Global state store (context + reducer) to replace prop drilling
**What.** Introduce `AppStore` (React context + `useReducer`) holding `{ page, repos, telemetry, status, error, filters, selection, preferences, opsLog }`. Actions: `NAVIGATE`, `SET_DATA`, `SET_FILTER`, `SELECT_REPO`, `SET_PREF`. Views read via `useAppStore()` selectors instead of props; `App.tsx` shrinks to provider + layout. Keep `repos`/`telemetry` in the store so data is fetched once. Persist `preferences` (sort defaults, verbosity, reduced-motion override) and `filters` to `localStorage` with a version key.
**Why.** Current prop drilling (`repos`, `telemetry` into 8 views) means every view re-renders on any App state change and view-local filters vanish on navigation. A reducer gives a single source of truth, enables URL sync (item 4) and persistence (item 8), and is the prerequisite for the storytelling features' disposition state (Black Box, tour progress) without each inventing its own storage.
**Effort.** L (5–7 days).
**Files.** New `src/state/store.tsx`, `src/state/actions.ts`, `src/state/selectors.ts`; modify all `src/components/*View.tsx`, `src/components/Sidebar.tsx`, `src/components/SearchOverlay.tsx`, `src/App.tsx`; modify `src/types.ts`.
**DEP.** Component Architecture lead must agree on provider placement and on whether views become prop-less. Color/Theme no. Visual/Rendering no.

### 4. URL-synced filters, sort, search, and dossier deep links
**What.** Extend the existing hash routing (`#page`) to also encode `?q=&sort=&domain=&repo=` (use `URLSearchParams` on `location.hash` or a separate `?` query — prefer query string on the hash fragment to stay GitHub-Pages-safe: `#/projects?sort=stars&domain=AI`). Bidirectional sync: filter/sort/search changes push state; `popstate`/`hashchange` hydrate store. Opening a dossier sets `?repo=<name>`; closing clears it; on load, if `repo` param present, open that dossier automatically. Search overlay query also syncs to `?q=` when open.
**Why.** Today filters/sort reset on navigation and there is no shareable link to a specific case file or filtered view — a real limitation for a "mission control" that operators want to bookmark or send to teammates. Deep-linkable dossiers are explicitly requested by the Case File Narrative idea (shareable "case story" URL).
**Why.** Depends on item 3 (store) so URL hydration has somewhere to land; otherwise each view re-implements parsing.
**Effort.** M (4–5 days).
**Files.** New `src/routing/urlState.ts`, `src/routing/useUrlSync.ts`; modify `src/App.tsx` (hashchange handler), `src/components/ProjectsView.tsx`, `src/components/SearchOverlay.tsx`, `src/components/Dossier.tsx`; modify `src/types.ts` (`RouteState`).
**DEP.** Item 3. Component Architecture (Dossier host location).

### 5. Keyboard navigation system (roving tabindex + input guards)
**What.** (a) Guard the global `keydown` handler: ignore when `e.target` is an `input/textarea/select/contenteditable` unless the key is `Escape`. (b) Add a `useRovingTabIndex` hook for lists/grids (sidebar nav, filter chips, repo grid, search results) with Arrow keys, Home/End, Enter/Space activation. (c) Add `useArrowGrid` for the repo grid (2D arrow navigation). (d) Make clickable cards (`metric`, `repo-card`, `freshness-cell`) real buttons or add `role="button" tabIndex={0} onKeyDown` consistently via a shared `InteractiveCard` wrapper (coordinate with Component Architecture). (e) `Escape` closes the topmost overlay; maintain an overlay stack instead of the current `searchOpen || helpOpen` early-return.
**Why.** Current keyboard support is partial and inconsistent: `Sidebar` items are focusable but grids are mouse-only; number-key shortcuts hijack typing; overlay escape handling is a boolean OR that breaks if both were ever open. Roving tabindex is the standard pattern for dense dashboards and is required for WCAG 2.1 SC 2.1.1.
**Effort.** M (4–5 days).
**Files.** New `src/hooks/useRovingTabIndex.ts`, `src/hooks/useOverlayStack.ts`; modify `src/App.tsx` (handler + overlay stack), `src/components/Sidebar.tsx`, `src/components/SearchOverlay.tsx`, `src/components/ProjectsView.tsx`, `src/components/MissionControl.tsx`; new `src/components/InteractiveCard.tsx` (coordination with Component Architecture).
**DEP.** Component Architecture (shared card wrapper). Style/Layout (focus-visible ring styles — DEP on Style/Layout for `:focus-visible` rules).

### 6. Accessibility baseline (ARIA, live regions, motion, focus restore)
**What.** (a) Toast becomes an `aria-live="polite"` region (`role="status"`) mounted once in `App`, not just a div; assertive for errors. (b) Focus restoration: when `Dossier`/`SearchOverlay`/`HelpOverlay` close, return focus to the trigger element (store `lastFocusRef`). (c) `useReducedMotion()` hook reading `prefers-reduced-motion`; disable PhosphorTrail, MatrixRain, tilt, and CountUp animation when set; expose as store preference (item 3) with manual override. (d) Skip-to-main-content link as first focusable element. (e) Landmark roles: `<nav>` for sidebar, `<main>` already, `aria-current="page"` on active nav. (f) All icon-only buttons get `aria-label`. (g) Color is never the only signal: freshness dots already paired with text; ensure status chips have text (they do). (h) Add `lang` on `<html>` (already `en`? check index.html).
**Why.** The app is visually rich (scanlines, trails, 3D) but screen-reader and keyboard users get a degraded experience; `prefers-reduced-motion` is currently ignored, which is a WCAG 2.3.3 issue and a real usability problem for operators. Focus restoration is needed once modals are URL-driven (item 4).
**Effort.** M (3–4 days).
**Files.** Modify `src/toast.ts` + `src/App.tsx` (live region), `src/hooks.ts` (add `useReducedMotion`, focus restore helper), `src/components/Dossier.tsx`, `src/components/SearchOverlay.tsx`, `src/components/HelpOverlay.tsx`, `src/components/Sidebar.tsx`, `index.html`; modify `src/components/PhosphorTrail.tsx`, `src/components/CountUp.tsx` (coordination with Visual/Rendering for animation gating).
**DEP.** Visual/Rendering (animation components must accept a `disabled`/`reducedMotion` prop). Style/Layout (skip-link + focus-visible CSS). Color/Theme (contrast verification — DEP on Color/Theme to confirm status colors meet 4.5:1).

### 7. Error boundaries per view + graceful partial data + retry
**What.** Wrap each routed view in its own `ErrorBoundary` (extend existing class component to accept a `fallback` render prop and `onReset`) so a crash in Constellation3D doesn't take down the whole dashboard. Add a `PartialDataBanner` when `repos` loaded but `telemetry` is null (or vice versa) instead of hiding the whole page. Fetch errors get a retry button calling `refresh()` (item 2) rather than `window.location.reload()`. Add an `offline` detection banner using `navigator.onLine` + `online`/`offline` events.
**Why.** Today one render error = full "SYSTEM FAULT" screen and a hard reload; one missing field = blank metric. Per-view boundaries localize failures and keep the rest of the dashboard usable, which matters for a mission-control tool that should degrade gracefully.
**Effort.** S–M (2–3 days).
**Files.** Modify `src/components/ErrorBoundary.tsx` (render prop + reset), `src/App.tsx` (wrap `renderPage()` branches), new `src/components/PartialDataBanner.tsx`, `src/components/OfflineBanner.tsx`; modify `src/components/MissionControl.tsx` (handle null telemetry gracefully — already mostly does).
**DEP.** Item 2 (retry uses `refresh`). Component Architecture (boundary placement).

### 8. Versioned preference & disposition store (localStorage)
**What.** A small `src/prefs/store.ts` with `getPref<T>(key, default)`, `setPref`, namespaced under `nortaq.prefs.v1`, plus a `migrate()` step for future schema bumps. Stores: default sort/domain filter, verbosity level (for Signal Intercept), reduced-motion override, tour progress/clearance (storytelling item 2), Black Box dispositions keyed by case-file id (storytelling item 4), phantom already uses sessionStorage (migrate to this store? keep as-is to avoid churn — just document). Expose via `usePrefs()` hook and the App store (item 3). Add `exportPrefs()`/`importPrefs()` for backup.
**Why.** Multiple upcoming features (tour, Black Box, Signal Intercept) each need persisted state; without a shared, versioned store they will each invent `localStorage` keys and collide. Centralizing also makes preferences URL-overridable later and testable.
**Effort.** S (2 days).
**Files.** New `src/prefs/store.ts`, `src/prefs/keys.ts`, `src/hooks/usePrefs.ts`; modify `src/covertMode.ts` (optionally route through store — coordination: keep its event bus), `src/App.tsx`; new `src/prefs/__tests__/store.test.ts`.
**DEP.** Item 3 (store integration). Coordination with storytelling features (Black Box dispositions, tour progress) — agree key names with that lead.

### 9. Honest "live" updates: focus revalidation + manual refresh + sync stamp
**What.** Combine items 2/7 into UX: StatusBar shows `LAST SYNC · 3m ago` (relative time, ticks every 30s via `setInterval` cleaned up properly), a `SYNC NOW` button (disabled + spinner while `isRefreshing`), and a subtle "NEW DATA AVAILABLE" toast when `generated_at` changed after revalidation. Add `useInterval` hook. No fake polling to a backend that doesn't exist; document that refresh is on-demand + on-focus.
**Why.** The UI claims "LIVE DATA" while nothing updates; this reconciles copy with reality and gives operators control. Doing it honestly (no fabricated real-time) preserves the project's auditability ethos (see STORYTELLING_IDEAS "no invented data").
**Effort.** S (1–2 days).
**Files.** Modify `src/components/StatusBar.tsx`, `src/App.tsx`; new `src/hooks/useInterval.ts`; modify `src/toast.ts` (queue support — see item 10).
**DEP.** Items 2, 7. Style/Layout (button styling).

### 10. Input handling: debounced search, toast queue, clipboard fallback
**What.** (a) Debounce the search input (150ms) in `SearchOverlay` via `useDeferredValue` (React 19) instead of re-filtering on every keystroke; keep `selectedIdx` reset on deferred value. (b) Convert `toast.ts` from a single global string to a small queue (max 3 stacked) with per-toast `aria-live` and a dismiss action; keep `showToast` API backward-compatible. (c) Add `copyToClipboard(text)` helper that tries `navigator.clipboard`, falls back to a hidden textarea + `execCommand('copy')`, and returns a boolean; replace inline clipboard calls in `Dossier` and `SignalView`. (d) Add form-style validation helper for any future inputs (tour name, etc.). 
**Why.** Search re-filters synchronously on every keystroke (fine now, but the storytelling features add more searchable content); toast is a single slot so rapid events overwrite each other (Konami + navigation can clobber); clipboard calls silently fail in insecure contexts (HTTP dev) with no fallback.
**Effort.** S–M (2–3 days).
**Files.** Modify `src/components/SearchOverlay.tsx`, `src/toast.ts`, `src/components/Dossier.tsx`, `src/components/SignalView.tsx`; new `src/utils/clipboard.ts`, `src/hooks/useDebounce.ts` (or use `useDeferredValue`); new tests.
**DEP.** Item 6 (live regions). Component Architecture (toast mount location).

### 11. Performance: memoized selectors + list virtualization threshold
**What.** (a) Replace repeated `repos.filter(...)` in views with shared selectors from `src/state/selectors.ts` (item 3) so filtering is computed once per data change. (b) Add a lightweight virtualized list wrapper (`src/components/VirtualList.tsx`) using native scroll + windowing (no new dep) used by `ProjectsView` repo grid and search results once count exceeds 200; below threshold render normally. (c) Wrap heavy views (`NetworkView`/Constellation3D already lazy) and add `React.memo` to pure presentational components (`Metric`, `HealthRow` if extracted). (d) Avoid re-running `useMemo` filters on unrelated state changes by selecting slices.
**Why.** With ~40 repos today performance is fine, but the data model grows (more repos, issues) and the storytelling features add more lists; virtualization + selector centralization prevent the O(n²) filtering that currently happens in multiple views (e.g., `MissionControl` and `TelemetryView` both recompute the same aggregates).
**Effort.** M (3–4 days).
**Files.** New `src/components/VirtualList.tsx`; modify `src/state/selectors.ts`, `src/components/ProjectsView.tsx`, `src/components/SearchOverlay.tsx`, `src/components/MissionControl.tsx`; new `src/components/Metric.tsx` (extracted, memoized) coordination with Component Architecture.
**DEP.** Items 3, 5. Component Architecture (component extraction boundaries). Visual/Rendering (Constellation3D already lazy — keep).

### 12. Interaction instrumentation + error telemetry in OpsLog
**What.** Extend `OpsLog`/`opslog.ts` to record not just navigations but: data load success/failure + duration, refresh actions, filter/sort changes (sampled), dossier open/close, clipboard results, and uncaught errors (via `window 'error'`/`unhandledrejection` listeners registered in `App`). Add `logError(err, context)`. OpsLog export already exists; add a "copy as markdown briefing" variant for standups (coordinates with Signal Intercept transcript). Cap stays 50; add a severity field (`info`/`warn`/`error`).
**Why.** The OpsLog is currently a navigation diary; for a mission-control tool it should be an audit trail of operator actions and system events, which is also what the Signal Intercept transcript (storytelling item 5) wants to consume. Centralizing here avoids each feature logging differently.
**Effort.** S (2 days).
**Files.** Modify `src/opslog.ts` (severity, `logError`, typed actions), `src/App.tsx` (global error listeners, data-load timing), `src/components/OpsLog.tsx` (severity styling — DEP on Style/Layout/Color for badges), `src/components/Dossier.tsx`, views (log filter changes).
**DEP.** Item 3 (read ops log from store). Item 10 (toast). Coordination with storytelling lead (transcript format).

---

## Coordination needs

- **Component Architecture lead:** provider placement (item 3), shared `InteractiveCard`/`Metric` extraction (items 5, 11), per-view ErrorBoundary placement (item 7), lazy-load boundaries (item 11). Need agreement on whether views become prop-less (item 3) — recommend yes, with `useAppStore` selectors.
- **Style/Layout lead:** `:focus-visible` ring, skip-link, overlay stacking z-index, reduced-motion gating hooks' CSS counterparts (item 6), StatusBar refresh button layout (item 2/9), OpsLog severity badges (item 12).
- **Color/Theme lead:** verify status color contrast for `aria` text (item 6); severity color tokens for OpsLog (item 12); do not introduce new color values here — reuse existing `--green/--amber/--red/--cyan`.
- **Visual/Rendering lead:** animation components (`PhosphorTrail`, `MatrixRain`, `CountUp`, tilt) must accept a `reducedMotion`/`disabled` prop (item 6); Constellation3D should not crash the whole app (item 7) — ensure its `onError`/Suspense fallback is robust.
- **Storytelling lead (parallel):** disposition state (Black Box) and tour progress must use the shared prefs store (item 8) and the `usePrefs` hook; agree key names `nortaq.prefs.v1.blackbox.*`, `nortaq.prefs.v1.tour.*`. Signal Intercept transcript should consume OpsLog (item 12) format. Case File Narrative deep link (item 4) provides the shareable URL it wants.

## Suggested implementation order

1. Item 1 (typed data layer) → 2 (cache hook) → 9 (sync stamp) — data foundation.
2. Item 3 (store) → 4 (URL sync) — state foundation; blocks storytelling dispositions.
3. Item 8 (prefs store) — small, unblocks storytelling lead.
4. Item 5 (keyboard) + 6 (a11y) together — interaction/accessibility pass.
5. Item 7 (error boundaries) + 10 (input handling) — robustness.
6. Item 11 (performance) + 12 (instrumentation) — polish.

## Out of scope (deliberately)

- No backend/real-time socket — host is static GitHub Pages; refresh is on-demand + on-focus only (item 9).
- No new heavy dependencies (no zod, no SWR lib, no virtualization lib) — hand-rolled guards/hooks to keep bundle small and consistent with project ethos.
- No fabricated metrics; unavailable values stay honest placeholders (already the convention).
- Visual restyling, color token changes, and component file reorganization are owned by the other leads; this plan only adds the minimal wiring they require.