# Style / Layout Upgrade Plan — Spy/Intel Mission Control

**Domain:** CSS architecture, spacing, typography, responsive design, glassmorphism, neon effects, layout systems, visual hierarchy, whitespace, grid systems.
**Scope:** React 19 + Vite + Three.js app (`Nortaq-PlayNexus/mission-control`), 34 components, single `src/styles/global.css` (~2.5k lines), heavy inline styling.
**Status:** Plan only — no code changes yet. Incremental, ship in phases.

## Current state (audit summary)

- One monolithic stylesheet (`src/styles/global.css`) mixes reset, tokens, layout, components, glass, neon, typography, motion, HUD, viz, responsive, and phantom overrides. Specificity is managed by source order and `!`-ish overrides; hard to reason about.
- Design tokens exist only as CSS variables in `:root`, but values are ad hoc (spacing `0.1rem`…`2rem`, font sizes `0.5rem`…`2.6rem`, radii mostly `2px`/`4px`/`6px`). No spacing scale, no type scale, no motion/elevation/z-index scales.
- ~hundreds of inline `style={{ ... }}` objects in components bypass the cascade and duplicate token values.
- Only one real breakpoint (`max-width: 768px`); everything else is fixed (`grid-4`, `210px` sidebar, `500px` search box).
- `prefers-reduced-motion` is explicitly *omitted* ("full effects requested"), which is an accessibility defect. `hue-rotate` runs continuously on the status dot; many infinite animations.
- Glassmorphism relies on `backdrop-filter` on many surfaces with no `@supports` fallback or reduced-transparency handling.
- Typography: Orbitron is applied to ~16 surfaces including body-ish labels; gradient text is used on 10+ surfaces, reducing contrast; Google Fonts loaded without `display=swap`.
- Visual hierarchy is flat: nearly every surface glows, pulses, or has a laser sweep, so nothing is focal.

## Coordination map

| This plan depends on | They own | We need from them |
|---|---|---|
| Color / Theme | Palette, contrast ratios, theme switching | Final token names + values for color, semantic status colors, light-theme palette, neon intensity palette |
| Component Architecture | Component APIs, primitives, module boundaries | Agreement on `Stack`/`Grid`/`Cluster`/`Surface`/`Text` primitives and CSS Modules adoption path |
| Data / Interactivity | Data shapes, loading states, virtualization | Stable dynamic values exposed as CSS custom props (`--value`, `--pct`); skeleton state hooks |
| Visual / Rendering | Three.js canvas, overlays, perf budget | Z-index scale, canvas container contract, animation perf budget, device DPR handling |

We own: token *structure* (names, scales, layering), spacing/type/radius/elevation/motion/z-index scales, responsive breakpoints, glass/neon/motion CSS, accessibility visuals, performance CSS. Color values are co-owned with Color/Theme.

## Implementation order

1. Token foundation (item 1) — unblocks everything.
2. CSS architecture split (item 2) — makes incremental work safe.
3. Typography + spacing (items 3, 4) — biggest perceptual win.
4. Responsive + grid (item 5).
5. Glass + neon governance (items 6, 7, 9).
6. Component style extraction (item 8) — largest, depends on Component Architecture.
7. Accessibility + performance (items 10, 11).
8. Theme variants (item 12).

---

## Items

### 1. Design Token Foundation
- **What:** Create `src/styles/tokens.css` with primitive + semantic tokens: spacing scale (`--space-0`…`--space-12`, 4px base), type scale (`--text-2xs`…`--text-3xl`), line-height (`--lh-tight/normal/loose`), font weights, radii (`--r-xs`…`--r-xl`), elevation (`--elev-0`…`--elev-4`), motion (`--dur-fast/base/slow`, `--ease-standard/decel/accel`), z-index (`--z-base/raised/overlay/modal/toast`), glass (`--glass-blur`, `--glass-fill-*`). Mirror a subset in `src/theme.ts` for TS consumers. Document in `docs/TOKENS.md`.
- **Why:** Current values are ad hoc and inconsistent; a single scale makes rhythm predictable and enables theming.
- **Effort:** L (1–2 weeks, touches all files but mostly mechanical).
- **Files:** `src/styles/tokens.css` (new), `src/styles/global.css`, `src/theme.ts`, `docs/TOKENS.md` (new).
- **Dependencies:** Color/Theme (color tokens), Component Architecture (consumption), Visual/Rendering (z-index scale).

### 2. CSS Architecture & Cascade Layers
- **What:** Split `global.css` into partials imported in a defined order: `tokens.css`, `reset.css`, `base.css`, `layout.css`, `components.css`, `effects/glass.css`, `effects/neon.css`, `effects/motion.css`, `typography.css`, `responsive.css`, `accessibility.css`, `utilities.css`. Wrap each in `@layer` (`reset, tokens, base, layout, components, effects, utilities, overrides`) via `src/styles/index.css`. Adopt CSS Modules for new/rewritten components; keep legacy global classes during migration.
- **Why:** 2.5k-line file with interleaved concerns; overrides depend on source order; impossible to refactor safely.
- **Effort:** L.
- **Files:** `src/main.tsx`, `src/styles/index.css` (new), `src/styles/*.css` (split), `vite.config.ts` (if CSS module config needed).
- **Dependencies:** Component Architecture (module boundary agreement), all domains (layer ownership).

### 3. Spacing & Vertical Rhythm
- **What:** Replace inline `marginBottom: '1rem'`, `padding: '1.2rem'`, `gap: '0.8rem'` with spacing tokens. Introduce layout utilities/primitives: `.stack` (vertical gap), `.cluster` (wrap row), `.grid-auto` (responsive auto-fill), plus React `Stack`/`Grid` if Component Architecture approves. Standardize card padding to `--space-5`/`--space-6`, section gaps to `--space-6`.
- **Why:** Vertical rhythm is currently per-component; inconsistent whitespace makes hierarchy muddy.
- **Effort:** M.
- **Files:** `src/styles/layout.css`, `src/styles/utilities.css`, all `src/components/*.tsx` (inline removal), optional `src/components/ui/Stack.tsx` etc.
- **Dependencies:** Component Architecture (primitives), item 1 (tokens).

### 4. Typography System & Font Loading
- **What:** Define type scale tokens and assign: Orbitron only to display/labels (brand, section headings, metric values, chips), Space Grotesk to body/prose, JetBrains Mono to data/numeric/time. Add `&display=swap` to the Google Fonts URL and `<link rel="preload">` for the two critical weights in `index.html`. Remove gradient text from all but brand/hero metric; use solid high-contrast text elsewhere. Enable `text-wrap: balance` on headings.
- **Why:** Orbitron overuse reduces legibility; missing `display=swap` causes FOIT; gradient text lowers contrast.
- **Effort:** M.
- **Files:** `src/styles/tokens.css`, `src/styles/typography.css`, `index.html`, `src/styles/global.css` (remove gradient overrides), components.
- **Dependencies:** Color/Theme (gradient palette restraint), Visual/Rendering (canvas text if any).

### 5. Responsive Layout & Grid System
- **What:** Define breakpoints (sm 480, md 768, lg 1024, xl 1280, 2xl 1536) and apply progressively: sidebar drawer at md (already partially), metric grids 2 cols at sm / 4 at lg, constellation height fluid (`clamp(260px, 40vh, 520px)`), search overlay width `min(92vw, 560px)`, dossier max-width `min(92vw, 780px)`. Add container queries for `.card`/`.repo-card` so internal layout adapts to card width. Enforce 44px min touch targets on buttons/chips. Add safe-area insets for mobile.
- **Why:** Tablet and large-desktop layouts are unhandled; touch targets are ~24px; fixed heights clip content.
- **Effort:** M–L.
- **Files:** `src/styles/responsive.css`, `src/styles/layout.css`, `src/App.tsx` (drawer), `src/components/*.tsx`.
- **Dependencies:** Component Architecture (drawer component), Data (long lists).

### 6. Glassmorphism Performance & Fallbacks
- **What:** Create a `.glass` / `.glass-strong` utility using tokens; reduce blur to `8px` on mobile and under `prefers-reduced-transparency`. Add `@supports not (backdrop-filter: blur(1px))` solid fallback backgrounds. Limit blur to small surfaces; keep large panels at lower blur. Respect reduced transparency.
- **Why:** `backdrop-filter` on many large surfaces causes mobile jank and has no fallback; accessibility for reduced transparency.
- **Effort:** M.
- **Files:** `src/styles/effects/glass.css`, `src/styles/tokens.css`, `src/styles/global.css`.
- **Dependencies:** Color/Theme (fallback solid colors), Visual/Rendering (canvas behind glass).

### 7. Neon Effects Governance
- **What:** Consolidate all keyframes into `effects/neon.css` + `effects/motion.css`. Add intensity tiers via `data-neon="off|low|med|high"` on root (default `med`) controlling glow opacity/animation. Implement `prefers-reduced-motion: reduce` globally: disable infinite animations, keep static (non-animated) glow, disable tilt/parallax. Remove `hueCycle` from status dot. Pause laser sweeps when tab is hidden (Page Visibility API in `App.tsx` toggling `.is-paused`).
- **Why:** Current CSS explicitly omits reduced-motion (a11y defect); constant hue rotation causes repaints; too many competing glows.
- **Effort:** M.
- **Files:** `src/styles/effects/neon.css`, `src/styles/effects/motion.css`, `src/App.tsx`, `src/styles/global.css`.
- **Dependencies:** Visual/Rendering (animation budget), Data (live update cadence).

### 8. Component Style Extraction (remove inline styles)
- **What:** Audit all 34 components and move inline `style={{}}` to classes/CSS Modules, keeping only genuinely dynamic values as CSS custom properties (`style={{ '--w': `${pct}%` }}`). Create shared primitives (`Surface`, `Stack`, `Grid`, `Cluster`, `Text`) with Component Architecture. Target zero inline style objects except dynamic geometry.
- **Why:** Inline styles defeat theming/cascade and duplicate tokens; extraction enables consistent restyling.
- **Effort:** L (biggest single item).
- **Files:** all `src/components/*.tsx`, new `src/components/ui/*`, `src/styles/components.css`.
- **Dependencies:** Component Architecture (owns APIs), items 1–3 (tokens/spacing).

### 9. Visual Hierarchy & Surface Restraint
- **What:** Define hierarchy levels (page title, section heading, card title, body, meta) with distinct size/weight/color. Reduce glow to interactive/focus/status elements only; one accent bar per card (not every card); limit gradient text to brand + hero metrics. Add `.is-emphasis` / `.is-muted` helpers.
- **Why:** "Everything glows" flattens hierarchy; gradient text reduces contrast and legibility.
- **Effort:** S–M.
- **Files:** `src/styles/typography.css`, `src/styles/effects/neon.css`, `src/styles/components.css`, components.
- **Dependencies:** Color/Theme (contrast), Visual/Rendering.

### 10. Accessibility Visual Standards
- **What:** Add global `prefers-reduced-motion` handling (item 7 expands), `prefers-contrast: more` (stronger borders/text, disable glass blur), focus-visible rings (already present — verify coverage on all interactive elements including `.nav-item`, chips, repo cards), add `.sr-only` utility, skip-to-content link in `App.tsx`, ensure decorative overlays (`scanlines`, `EntropyField`, `PhosphorTrail`) are `aria-hidden`.
- **Why:** Current code explicitly opts out of reduced motion; touch/focus coverage incomplete.
- **Effort:** M.
- **Files:** `src/styles/accessibility.css`, `src/App.tsx`, components.
- **Dependencies:** Component Architecture (semantic HTML/ARIA), Data (status semantics).

### 11. Performance Containment
- **What:** Add `contain: layout paint` to cards/panels; `content-visibility: auto` with `contain-intrinsic-size` for long lists (projects grid, telemetry lists); remove permanent `will-change` (only on `:hover`/active); avoid layout animations (use transform/opacity only). Add `decoding="async"` to any images.
- **Why:** Large DOM + many effects; containment reduces paint/layout cost.
- **Effort:** S.
- **Files:** `src/styles/layout.css`, `src/styles/components.css`, list components.
- **Dependencies:** Data/Interactivity (list virtualization decision), Visual/Rendering.

### 12. Theme Variants & Runtime Switching
- **What:** Support `data-theme` on `<html>` with token overrides (`dark` default, `light` scaffold, `phantom` replacing the current `hue-rotate` filter hack). Persist preference in `localStorage`; expose toggle (could live in StatusBar or System view). Keep phantom mode as a first-class theme rather than a CSS filter.
- **Why:** Single hard-coded dark theme; phantom mode is a filter hack that distorts colors; mixed environments need light mode.
- **Effort:** M.
- **Files:** `src/styles/tokens.css`, `src/App.tsx`, `src/components/StatusBar.tsx`, `src/components/SystemView.tsx`.
- **Dependencies:** Color/Theme (light palette + phantom palette), Component Architecture.

---

## Acceptance criteria (domain-level)

- Single source of truth for spacing/type/radius/elevation/motion/z-index tokens; no magic numbers in new code.
- `global.css` reduced to an aggregator; concerns split into layered partials.
- No `prefers-reduced-motion` opt-out bypass; animations respect it.
- Lighthouse/Performance: no layout thrash from animations; mobile scroll ≥ 50fps on mid-tier device (manual check).
- All interactive elements have visible focus and ≥ 44px touch target on mobile.
- Inline style objects limited to genuinely dynamic geometry.
- Light theme scaffold renders without broken colors (full palette pending Color/Theme).

## Risks & notes

- The biggest risk is visual regression during extraction; recommend per-component PRs with screenshot comparison.
- Neon/glass effects are the brand identity — restraint (items 7, 9) should be validated with stakeholders before shipping.
- Coordinate token naming with Color/Theme before item 1 lands to avoid rename churn.