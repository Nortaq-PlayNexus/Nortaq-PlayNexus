# Color / Theme Upgrade Plan — Spy/Intel Mission Control

**Domain:** Color tokens, palettes, theming system, color modes (phosphor/amber/thermal/night-vision), contrast, color psychology, semantic color usage, dark/light modes, color accessibility.
**Owner:** Color / Theme Lead
**App:** `Nortaq-PlayNexus/mission-control` (React 19 + Vite + TypeScript + Three.js, static GitHub Pages host)
**Companion domains:** Visual/Rendering, Style/Layout, Component Architecture, Data/Interactivity
**Status:** Plan only — no code changes yet. Incremental, ship in phases.

---

## 1. Current state (audit summary)

- Color lives in two disconnected places: CSS variables in `:root` (`src/styles/global.css`) and TS constants in `src/theme.ts` (`DOMAIN_COLORS`, `LANG_COLORS`). There is no single source of truth and the two drift (e.g. CSS `--green` is actually amber `#f5b942`).
- `:root` defines a workable dark palette (charcoal + amber phosphor + stamp red + teal + purple) plus 7 neon accents, but names are inconsistent (`--green` for amber, `--green-dim`, `--green-glow`), and alpha values are inlined as 128 distinct `rgba(...)` literals.
- Hardcoded hex/rgba are scattered: ~37 unique hex and ~128 unique rgba in `global.css`, plus numeric literals (`0xf5b942`, `0xffe9bd`, `0x383e2e`, …) in `Constellation3D.tsx` and the domain/language maps in `theme.ts`. None of these respond to a theme change.
- Only one real color mode exists: "phantom mode" (konami toggle) implemented as `filter: hue-rotate(18deg) saturate(1.18)` on `.scanlines`, which recolors the *entire* UI including photography/3D and cannot be themed precisely.
- No dark/light switching: the app is dark-only. `<meta name="theme-color">` is `#0a0e1a`, which does not even match the real background `#0a0c0b`.
- Contrast is uneven: gradient text (`linear-gradient(95deg, #ffd479, #ff3fd8, #2ff3e0)`) is applied to ~9 headline surfaces, lowering effective contrast; `--text-dim: #737a70` is used for critical metadata; status info is encoded by color alone in several places.
- Domain colors are not colorblind-safe and there is no indirection: changing a domain color requires editing `theme.ts` and re-running the build, and the 3D scene will not follow.
- No validation: nothing checks contrast ratios or flags new hardcoded colors.

## 2. Coordination map

| This plan depends on | They own | We need from them | We provide |
|---|---|---|---|
| Style / Layout | Token file split, spacing/type/radius/elevation/motion/z-index scales, glass/neon governance, responsive breakpoints | Final token file layout (`tokens.css` / partials), glass fallback solid colors, neon intensity tiers (`data-neon`), class names for variants | Color token values, mode palettes, alpha utilities, light/high-contrast palettes, contrast ratios |
| Component Architecture | Settings provider, primitives, context, persistence hooks | Provider placement for `colorMode`/`theme`/`colorVision`, primitive variant prop contract (`variant="success"`), prop naming | `useColorMode`, `useThemeColors`, resolved color helpers, CSS var contracts, mode switcher component |
| Data / Interactivity | Status semantics ("active/live/dormant"), prefs store, a11y hooks, reduced-motion | Canonical definitions of status/severity, `usePrefs`/`useReducedMotion` contracts, persistence keys | Status/severity color tokens + helpers, contrast verification, non-color cue guidance |
| Visual / Rendering | Three.js scene, overlays, LUT/grade, animation budget, device DPR | Scene color uniform contract, LUT texture slots, `reducedMotion` gating in visual components | Mode palettes (light/fog/bloom tint), domain color indirection, time-of-day stops, colorblind variants, phantom-mode overrides |

**We own:** color token *values*, palette definitions, mode matrices, semantic color mapping, contrast policy, color psychology guidelines, color accessibility. Token *structure* is co-owned with Style/Layout; consumption is owned by Component Architecture.

## 3. Implementation order

1. Item 1 — Color token architecture & legacy alias migration (unblocks everything).
2. Item 2 — Theme mode engine + no-flash bootstrap (unblocks mode-specific work).
3. Item 3 — CSS-variable indirection for data colors (unblocks colorblind + canvas sync).
4. Item 4 — Semantic status & severity colors (unblocks primitives/badges).
5. Item 5 — Contrast & readability governance.
6. Item 8 — Dynamic color utilities & alpha handling (needed by modes).
7. Item 6 — Colorblind-safe variants.
8. Item 7 — Mode-specific ambient/neon/3D treatments.
9. Item 9 — Light & high-contrast modes.
10. Item 10 — Color psychology & restraint policy.
11. Item 11 — Non-color cues.
12. Item 12 — Validation tooling & regression checks.

---

## 4. Upgrade items

### Item 1 — Color Token Architecture & Legacy Alias Migration

- **What:** Create `src/styles/color-tokens.css` holding a three-layer token system:
  1. **Primitives** (raw): `--color-amber-100..900`, `--color-teal-100..900`, `--color-red-100..900`, `--color-lime-100..900`, `--color-violet-100..900`, `--color-neutral-0..1000` (dark scale). Values are the single source of truth.
  2. **Semantic** (role-based): `--color-bg`, `--color-bg-raised`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-border-strong`, `--color-fg`, `--color-fg-bright`, `--color-fg-muted`, `--color-fg-on-primary`, `--color-primary`, `--color-primary-dim`, `--color-primary-glow`, `--color-accent`, `--color-danger`, `--color-warning`, `--color-success`, `--color-info`, `--color-focus`, `--color-selection`.
  3. **Compatibility aliases**: keep `--bg`, `--bg-card`, `--bg-hover`, `--border`, `--border-bright`, `--text`, `--text-dim`, `--text-bright`, `--green`, `--green-dim`, `--green-glow`, `--red`, `--amber`, `--cyan`, `--purple` as aliases pointing at the semantic tokens so existing CSS keeps working during migration.
  - Add `src/color/tokens.ts` exporting the same primitive hex values for TS/Three.js consumers, plus `resolveColor(varName)` (reads a computed CSS var and caches per mode) and `withAlpha(hex, alpha)`.
  - Document in `docs/COLOR_TOKENS.md`.
- **Why:** `--green` meaning amber is a latent bug; 128 ad-hoc rgba values cannot be themed; a layered system (primitive → semantic → alias) lets modes swap primitives without touching components and keeps migration incremental.
- **Effort:** M.
- **Files:** `src/styles/color-tokens.css` (new), `src/styles/global.css` (replace `:root` color block with `@import`/aliases), `src/color/tokens.ts` (new), `src/color/utils.ts` (new), `docs/COLOR_TOKENS.md` (new).
- **Dependencies:** Style/Layout (token file split and `@layer` ownership); Component Architecture (consumption); Visual/Rendering (canvas color resolution).

### Item 2 — Theme Mode Engine (phosphor / amber / thermal / night-vision + dark/light)

- **What:** Implement runtime switching via attributes on `<html>`: `data-color-mode="amber|phosphor|thermal|night-vision"` and `data-theme="dark|light"`.
  - CSS overrides per mode live in `src/styles/color-modes.css`, re-pointing the semantic tokens (and, for dark/light, surface/text tokens).
  - Mode definitions in `src/color/modes.ts`: for each mode, accent hex, surface tint, ambient gradient stops, neon set, and 3D scene uniforms (background, fog, key light, bloom tint).
  - No-flash bootstrap: inline `<script>` in `index.html` reads `localStorage` keys (`nortaq.colorMode`, `nortaq.theme`) and sets attributes before React mounts; `theme-color` meta updated to match.
  - `useColorMode()` / `useTheme()` hooks (wired through the Settings provider from Component Architecture) with `setColorMode`, `setTheme`, persisted via the prefs store (Data/Interactivity).
  - Add a `ThemeSwitcher` component (Sidebar or System view) and a keyboard shortcut.
  - Restrict light theme to amber + phosphor (thermal/night-vision are inherently dark) and document that.
- **Why:** The four named modes are the headline feature of this domain; today only a crude hue-rotate filter exists. Attribute-based overrides keep components mode-agnostic and avoid FOUC.
- **Effort:** L.
- **Files:** `src/styles/color-modes.css` (new), `src/color/modes.ts` (new), `src/hooks/useColorMode.ts` (new), `src/components/ThemeSwitcher.tsx` (new), `index.html`, `src/App.tsx`, `src/main.tsx`.
- **Dependencies:** Component Architecture (Settings provider, prop naming); Data/Interactivity (prefs persistence, `useReducedMotion`); Style/Layout (token overrides); Visual/Rendering (scene uniforms).

### Item 3 — CSS-Variable Indirection for Data Colors (domain & language)

- **What:** Replace hardcoded maps in `src/theme.ts` with CSS-variable indirection:
  - Define `--color-domain-ai`, `--color-domain-audio`, … and `--color-lang-python`, … in `color-tokens.css`, seeded from current values.
  - `colorFor(domain)` returns `var(--color-domain-<slug>, <fallback>)` for DOM use; add `domainColorHex(domain)` resolving the computed value for Three.js/canvas, cached and invalidated on mode change.
  - Language colors follow the same pattern.
  - Update `Constellation3D.tsx` to call the resolver instead of `0xf5b942` literals; keep a `useResolvedThemeColors()` hook that re-resolves on mode change.
- **Why:** Visual/Rendering explicitly needs CSS-var indirection so colorblind variants and modes swap without code changes; it also removes the last source of drift between CSS and TS.
- **Effort:** M.
- **Files:** `src/theme.ts` (refactor), `src/color/domainColors.ts` (new), `src/color/useResolvedColor.ts` (new), `src/components/Constellation3D.tsx`, views that call `colorFor`.
- **Dependencies:** Visual/Rendering (scene uniforms, hover labels); Component Architecture (settings/mode context); Data/Interactivity (none).

### Item 4 — Semantic Status & Severity Color System

- **What:** Define a status/severity palette and helpers:
  - Status: `ACTIVE → --color-success`, `MONITORED → --color-info`, `DORMANT → --color-warning`, `ARCHIVED → --color-fg-muted`.
  - Severity: `info/success/warning/danger` mapped to `--color-info/success/warning/danger`, used by toasts, OpsLog badges, error states.
  - Export `statusColor(status)` and `severityColor(severity)` returning both a CSS var string (DOM) and a hex (canvas), plus `--color-on-*` foreground tokens for text on colored fills.
  - Replace ad-hoc usages (`--green` for stars, `--amber` for dormant, `--red` for errors) in `MissionControl`, `NetworkView`, `Dossier`, `OpsLog`.
- **Why:** Status is currently color-coded inconsistently (stars use the primary amber); a semantic system makes meaning legible and gives Component Architecture primitive variants (`Badge`, `StatusChip`) a stable contract.
- **Effort:** S–M.
- **Files:** `src/color/status.ts` (new), `src/styles/color-tokens.css`, `src/theme.ts`, `src/components/OpsLog.tsx`, `src/components/Dossier.tsx`, `src/components/MissionControl.tsx`, `src/components/NetworkView.tsx`.
- **Dependencies:** Component Architecture (primitive variants); Data/Interactivity (OpsLog severity, canonical status defs); Style/Layout (badge styles).

### Item 5 — Contrast & Readability Governance

- **What:** Audit and enforce contrast:
  - Remove gradient text from all surfaces except brand + hero metric; use solid `--color-fg-bright`/`--color-primary` elsewhere (`section-heading`, `repo-name`, `card-title`, `header-title`, `freshness-n`, etc.).
  - Verify every text token meets WCAG AA on its intended surface (4.5:1 normal, 3:1 large) and document ratios in `docs/COLOR_TOKENS.md`.
  - Add `--color-fg-on-primary` for text on amber fills (selection, active nav) and use it in `::selection`.
  - Raise `--color-fg-muted` until metadata meets 4.5:1, or restrict it to large/decorative text.
  - Fix 3D label colors (`0xffe9bd`, `0x9a9486`) with an outline/stroke or higher-contrast value.
  - Correct `<meta name="theme-color">` to `#0a0c0b`.
- **Why:** Gradient text and dim grays are the biggest legibility defects; fixing them is the highest-impact accessibility win in this domain.
- **Effort:** M.
- **Files:** `src/styles/global.css`, `src/styles/color-tokens.css`, `src/components/Constellation3D.tsx`, `index.html`, `docs/COLOR_TOKENS.md`.
- **Dependencies:** Style/Layout (typography scale); Visual/Rendering (canvas text); Data/Interactivity (none).

### Item 6 — Colorblind-Safe Palette Variants

- **What:** Provide deuteranopia, protanopia, tritanopia (and a monochrome) variants for domain + status colors, selectable via settings:
  - CSS overrides under `[data-color-vision="..."]` re-point `--color-domain-*` and status tokens.
  - Parallel JS maps in `src/color/vision.ts` for canvas resolution.
  - Design variants by varying lightness/shape, not hue alone; pair with the non-color cues from Item 11.
  - Add an accessibility panel (System view or modal) exposing the selector.
- **Why:** Visual/Rendering item 8 explicitly requires colorblind palettes; ~8% of male users cannot distinguish the current domain colors. Color must never be the only channel.
- **Effort:** M.
- **Files:** `src/color/vision.ts` (new), `src/styles/color-vision.css` (new), `src/components/AccessibilityPanel.tsx` (new), `src/components/SystemView.tsx`.
- **Dependencies:** Visual/Rendering (palette swap in scene); Component Architecture (settings provider, focus mgmt); Data/Interactivity (prefs persistence).

### Item 7 — Mode-Specific Ambient, Neon & 3D Treatments

- **What:** For each color mode define the full ambient treatment:
  - Background gradients, surface tints, border tints, and neon accent set (CSS).
  - 3D scene uniforms: background color, fog color/density, key/fill light colors, bloom tint, particle tints (TS).
  - Thermal mode uses a heat palette (black → red → orange → yellow → white) for accents and data viz; night-vision uses green phosphor monochrome with reduced saturation and a subtle scanline intensification; phosphor uses classic green; amber keeps the current look.
  - Provide LUT/grade stops for Visual/Rendering's `ColorCorrection` pass and CRT mask tokens.
  - Phantom (konami) mode becomes a first-class variant of night-vision with magenta primary and intensified scanlines, replacing the global hue-rotate filter.
- **Why:** Modes must feel distinct, not just recolored; the 3D scene and ambient pools need to follow or the glass panels refract the wrong light. Removing the hue-rotate filter fixes color distortion of content.
- **Effort:** L.
- **Files:** `src/styles/color-modes.css`, `src/color/modes.ts`, `src/components/Constellation3D.tsx`, `src/styles/global.css` (ambient gradients via vars), `src/App.tsx`.
- **Dependencies:** Visual/Rendering (LUT, scene, animation budget); Style/Layout (neon governance, intensity tiers); Component Architecture (settings).

### Item 8 — Dynamic Color Utilities & Alpha Handling

- **What:** Eliminate the 128 ad-hoc rgba literals:
  - Expose RGB triplets for each semantic color (`--color-primary-rgb: 245 185 66`) and use `rgb(var(--color-primary-rgb) / 0.15)` (or `color-mix`) for alpha variants.
  - Provide a small set of alpha utility classes (`.bg-primary-10`, `.border-primary-30`, `.text-danger`, …) and document them.
  - Add `withAlpha(hex, alpha)` and `mixColors(a, b, t)` helpers in `src/color/utils.ts` for canvas.
  - Sweep components/CSS to replace inline rgba with tokens/utilities; allow raw rgba only inside `color-tokens.css`.
- **Why:** Alpha values are the bulk of the color mess; tokenizing them is what makes modes actually work and shrinks the CSS.
- **Effort:** M.
- **Files:** `src/styles/color-tokens.css`, `src/styles/utilities.css`, `src/color/utils.ts`, all `src/components/*.tsx`, `src/styles/global.css`.
- **Dependencies:** Style/Layout (utility layer, class names); Component Architecture (primitive styles).

### Item 9 — Light & High-Contrast Modes

- **What:** Add an optional light "Day Ops" theme and a high-contrast mode:
  - Light theme: light neutral surfaces, dark text, same accent hues (adjusted for contrast), softer shadows, reduced glow.
  - High-contrast: triggered by `prefers-contrast: more` or a manual toggle; stronger borders, no glass blur, higher-contrast text, thicker focus rings, disable ambient gradients.
  - Implement via `data-theme="light"` and `data-contrast="more"` overrides; no-flash bootstrap extended to read both.
  - Canvas background/fog/lighting adjust for light mode.
- **Why:** Style/Layout explicitly needs a light-theme palette from this domain; bright-environment usability and accessibility require it. High-contrast is a WCAG 1.4.3/1.4.6 concern.
- **Effort:** M.
- **Files:** `src/styles/color-themes.css` (new), `src/color/themes.ts` (new), `index.html`, `src/components/Constellation3D.tsx`, `src/components/ThemeSwitcher.tsx`.
- **Dependencies:** Style/Layout (glass fallback, reduced transparency); Data/Interactivity (prefs); Visual/Rendering (canvas background).

### Item 10 — Color Psychology & Visual Restraint Policy

- **What:** Document and enforce a color-usage policy in `docs/COLOR_PSYCHOLOGY.md`:
  - One primary accent (phosphor amber) per view for interactive/focus/brand; everything else neutral.
  - Status colors reserved for status — never decoration.
  - Domain colors only inside data visualizations (constellation, donut, bars, heatmap), never UI chrome.
  - Neutral surfaces; at most one accent bar per card; gradient text only on brand + hero metric.
  - Color must reinforce hierarchy: bright fg for titles, muted for metadata, dim only for tertiary.
  - Include a review checklist for PRs and a "before/after" example set.
- **Why:** "Everything glows" flattens hierarchy and increases cognitive load; a written policy keeps the four parallel domains aligned and prevents regression during the CSS split.
- **Effort:** S.
- **Files:** `docs/COLOR_PSYCHOLOGY.md` (new), `src/styles/global.css` (remove decorative color), components touched by Style/Layout extraction.
- **Dependencies:** Style/Layout (hierarchy levels); Visual/Rendering (focal points); Component Architecture (primitive variants).

### Item 11 — Color Accessibility Standards & Non-Color Cues

- **What:** Ensure color is never the sole signal:
  - Status chips and freshness indicators keep text labels (verify all instances; add where missing).
  - Domain filters/legend include text + optional pattern fills for colorblind mode.
  - Focus rings use `--color-focus` with a visible outline style (not color alone).
  - Respect `prefers-reduced-transparency` (coordinate with Style/Layout) by falling back to solid surfaces.
  - Provide a "colorblind preview" toggle in the accessibility panel (uses Item 6).
  - Verify toast/error states include icons/text, not just red.
- **Why:** WCAG 1.4.1 (use of color) and 2.4.7 (focus visible); operators in stressful conditions benefit from redundant cues.
- **Effort:** S–M.
- **Files:** `src/components/*.tsx`, `src/styles/accessibility.css`, `src/components/AccessibilityPanel.tsx`.
- **Dependencies:** Data/Interactivity (a11y hooks); Style/Layout (focus-visible CSS); Visual/Rendering (none).

### Item 12 — Color Validation Tooling & Regression Checks

- **What:** Add lightweight, dependency-free checks:
  - `scripts/check-colors.mjs` that parses `color-tokens.css`, resolves token pairs, and fails if any documented text/surface pair is below WCAG AA.
  - A lint rule (script) flagging new hardcoded hex/rgba outside `color-tokens.css` / `modes.ts` / `vision.ts`.
  - A mode matrix document (`docs/COLOR_MODES.md`) listing each mode's tokens and a screenshot checklist.
  - Add `npm run check:colors` to `package.json`.
- **Why:** Without automation the 128-rgba regression returns. A cheap script keeps all four domains honest and gives CI a gate.
- **Effort:** S.
- **Files:** `scripts/check-colors.mjs` (new), `package.json`, `docs/COLOR_MODES.md` (new).
- **Dependencies:** None (reads CSS); coordinates with Style/Layout on token file location.

---

## 5. Coordination needs (explicit asks of other domains)

- **Style/Layout:** finalize the token file split and `@layer` order before Item 1 lands; provide the glass fallback solid colors and neon intensity tiers (`data-neon`) that Items 7/9 depend on; own `:focus-visible` CSS that Item 11 references.
- **Component Architecture:** land the Settings provider (Item 2 of that plan) and `usePrefs` before Item 2 here; agree primitive variant prop names (`variant="success|warning|danger|info"`) so Item 4 tokens map 1:1; confirm views become prop-less so mode state is consumed via hooks.
- **Data/Interactivity:** provide canonical status/severity definitions and persistence keys for Item 4 and Item 2; expose `useReducedMotion` and `usePrefs` contracts; OpsLog severity badges (their Item 12) consume our severity tokens.
- **Visual/Rendering:** provide the scene color uniform contract and LUT slots for Items 3 and 7; ensure `Constellation3D` accepts a `reducedMotion`/`disabled` flag and does not crash the app (their Item 7); expose `colorFor`-driven updates without full scene rebuild.

## 6. Risks & out of scope

- **Visual fidelity regression:** mode swaps touch every surface. Mitigate with the alias layer (Item 1) and incremental rollout; Style/Layout signs off before Item 3.
- **Over-theming:** four modes × light/dark × colorblind is a large matrix. Mitigate by restricting light mode to amber/phosphor and treating high-contrast as an overlay on any mode.
- **Canvas sync complexity:** Three.js colors are resolved at runtime; caching must invalidate on mode change. Mitigate with a single `useResolvedThemeColors()` hook and a mutation observer on `<html>` attributes.
- **Out of scope:** 3D effect redesign (Visual/Rendering owns), CSS architecture/splitting (Style/Layout owns), component restructuring (Component Architecture owns), data pipeline (Data/Interactivity owns). This plan defines color values and mode matrices and consumes those domains' outputs.
- **No new runtime dependencies.** Color checks use a small Node script; theming uses CSS + React context only.

## 7. Definition of done (per item)

- TypeScript compiles (`tsc`) with no new errors; `npm run build` succeeds.
- No hardcoded hex/rgba in components or `global.css` outside token/mode/vision files (enforced by Item 12).
- All four named modes + dark/light + at least one colorblind variant are selectable and persist across reloads.
- Every documented text/surface pair meets WCAG AA (verified by `npm run check:colors`).
- Canvas colors follow the selected mode (verified manually in Constellation view).
- `prefers-reduced-motion`, `prefers-contrast: more`, and `prefers-reduced-transparency` are respected.
- Bundle size does not regress by >5%.

*Prepared by Color/Theme lead. Ready to coordinate with Style/Layout, Component Architecture, Data/Interactivity, and Visual/Rendering leads.*