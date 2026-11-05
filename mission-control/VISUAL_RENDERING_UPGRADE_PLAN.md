# Visual / Rendering Upgrade Plan — Spy/Intel Mission Control

**Domain:** 3D scene, effects, animations, transitions, micro-interactions, motion design, visual polish
**Owner:** Visual/Rendering lead
**App:** `Nortaq-PlayNexus/mission-control` (React 19 + Three.js 0.187 + Vite 6)
**Goal:** Make the dashboard feel like a living intelligence instrument — cinematic, responsive, accessible, and 10000× more polished — without breaking the existing neon/glass aesthetic.

> Coordinate with parallel domains: **Style/Layout**, **Color/Theme**, **Component Architecture**, **Data/Interactivity**. Items below list cross-domain dependencies explicitly.

---

## Table of contents
1. Adaptive Quality Tiering (3D + FX)
2. View Transitions API (shared-element morphs)
3. Cinematic Post-Processing Stack (DoF / SSAO / LUT / CRT)
4. Instanced Constellation + LOD + Frustum Culling
5. Sonification / Spatial Audio Layer
6. Parallax Tilt + Device-Orientation "Hologram" Cards
7. Data-Driven Scene Telemetry (live pulses)
8. Accessibility-First Motion & Colorblind Palettes
9. WebGL Boot Sequence + Load-Progress Shader
10. In-Scene Minimap / Camera Focus Ring
11. Snapshot Export & Share (canvas + overlay)
12. Time-of-Day / Phantom Lighting Rig

---

## 1. Adaptive Quality Tiering (3D + FX)

- **What:** Detect GPU capability (WebGL2, max texture size, estimated VRAM, `navigator.deviceMemory`, `hardwareConcurrency`) and bucket into `low / mid / high / ultra`. Drive a single `quality` token that scales: bloom strength/radius, MSAA samples, pixel ratio cap, particle counts (starfield 800→200, dust 600→150), tube segments (44→16), sphere segments (48→16), post-FX on/off (grade pass, SSAO). Persist override in `localStorage` with an in-app "QUALITY" toggle in the status bar. Auto-downgrade on sustained <50fps (rolling 60-frame median) and show a one-time toast "QUALITY ADJUSTED FOR SMOOTHNESS".
- **Why:** The scene is heavy (bloom + MSAA + 230 tubes + 800 stars + grain). On mid laptops it janks, which kills the "premium instrument" feel. Adaptive quality keeps 60fps everywhere while still looking stunning on capable rigs.
- **Effort:** M (2 sprints)
- **Files:** `src/components/Constellation3D.tsx` (quality props + conditional geometry), `src/hooks.ts` (new `useQualityTier`), `src/components/StatusBar.tsx`, `src/styles/global.css` (quality badge), new `src/quality.ts`.
- **Dependencies:**
  - **Data/Interactivity:** expose a `capability` probe + fps sampler hook; telemetry of frame times.
  - **Style/Layout:** status bar slot for quality badge; settings popover layout.
  - **Color/Theme:** quality badge color tokens.
  - **Component Architecture:** `Constellation3D` must accept `quality` prop without rebuilding scene (use refs/uniforms).

## 2. View Transitions API — Shared-Element Morphs

- **What:** Wrap `setPage` in `document.startViewTransition` when supported. Assign `view-transition-name` to shared entities: metric cards, repo cards, constellation canvas container, dossier. Morph the 3D constellation container between Mission Control (compact) and Network (full) instead of unmount/remount. Fallback: existing `viewIn` CSS fade. Respect reduced motion.
- **Why:** Current navigation hard-cuts the DOM (`key={page}`) causing a fade; morphing preserves spatial memory and feels like a real OS. The constellation is the hero — reusing it across views is the single biggest perceived-quality win.
- **Effort:** M–H (2–3 sprints)
- **Files:** `src/App.tsx` (transition wrapper + `viewTransitionName` style props), `src/styles/global.css` (`::view-transition-*` keyframes, old/new pseudo tuning), `src/components/MissionControl.tsx`, `src/components/NetworkView.tsx`.
- **Dependencies:**
  - **Component Architecture:** stable element IDs / `viewTransitionName` registry; avoid duplicate names.
  - **Style/Layout:** transition timing tokens; layout must not reflow during transition.
  - **Data/Interactivity:** navigation state must be synchronous inside the transition callback.

## 3. Cinematic Post-Processing Stack (DoF / SSAO / LUT / CRT)

- **What:** Extend the `EffectComposer` with optional passes gated by quality tier: `BokehPass`/`DepthOfField` (focus on hovered node), `SSAOPass` (contact shadows under nodes), `ColorCorrection`/LUT (filmic teal-amber grade matching theme), and an opt-in `CRT` pass (scanline curvature + phosphor mask + barrel distortion) for "analyst terminal" vibe. Add a command-palette toggle and a `?` help entry. Keep ACES + bloom.
- **Why:** Current grade is chromatic-aberration + vignette + grain only. DoF on hover focuses attention; LUT unifies 3D with 2D glass palette; CRT mode is a love-letter to the spy aesthetic and differentiates from generic dashboards.
- **Effort:** H (3 sprints)
- **Files:** `src/components/Constellation3D.tsx`, new `src/fx/{dof,ssao,lut,crt}.ts`, `src/components/SearchOverlay.tsx` (toggle), `src/styles/global.css`.
- **Dependencies:**
  - **Color/Theme:** provide LUT texture + grade uniforms; CRT color mask tokens.
  - **Style/Layout:** pass enable/disable UI; settings panel.
  - **Data/Interactivity:** persist user FX prefs.

## 4. Instanced Constellation + LOD + Frustum Culling

- **What:** Convert neuron spheres and dust to `InstancedMesh` with per-instance color/scale via instance attributes; use `THREE.LOD` (3 levels) for nodes; enable frustum culling on merged synapse mesh (split into chunks by domain for culling); use `BufferGeometryUtils.mergeGeometries` only at high quality. Add hover via GPU picking (color-ID render target) instead of raycasting 34+ meshes — eliminates per-frame raycast cost and enables 10k+ nodes.
- **Why:** Scales to large repos, cuts CPU, enables future 10k-node datasets, smoother hover. GPU picking is more accurate and faster than JS raycast.
- **Effort:** H–XL (3–4 sprints)
- **Files:** `src/components/Constellation3D.tsx` (major refactor), new `src/three/instancedNodes.ts`, `src/three/gpuPicking.ts`.
- **Dependencies:**
  - **Data/Interactivity:** repo count growth; needs stable IDs for instance mapping.
  - **Component Architecture:** `Constellation3D` public API unchanged; internal only.

## 5. Sonification / Spatial Audio Layer

- **What:** Web Audio graph: ambient low drone (filtered noise + sub bass) that modulates with threat index; interaction SFX — nav click (short blip), hover (soft tick), dossier open (stamp thud + paper rustle), konami (power-up sweep), error (low buzzer). 3D positional audio: node hover plays a tone mapped to domain (pentatonic scale) at node's spatial position via `PannerNode`. Master volume + mute in status bar; respects reduced motion (audio still optional). Preload as AudioBuffers.
- **Why:** Sound is the missing sense; turns the dashboard from a picture into an instrument. Domain-mapped tones create an audio identity for clusters.
- **Effort:** M (2 sprints)
- **Files:** new `src/audio/{engine,sfx,ambient}.ts`, `src/App.tsx` (wiring), `src/components/StatusBar.tsx`, `src/components/Constellation3D.tsx` (hover → playTone).
- **Dependencies:**
  - **Data/Interactivity:** threat index / status events to drive ambient.
  - **Style/Layout:** mute/volume control UI.
  - **Color/Theme:** domain → frequency mapping (parallel to colorFor).

## 6. Parallax Tilt + Device-Orientation "Hologram" Cards

- **What:** Enhance existing mouse-tilt handler: add inner parallax layers (icon, title, stats move at different Z via `translateZ`), specular highlight that tracks cursor (radial gradient on card), and on touch devices use `DeviceOrientationEvent` (with permission prompt) for tilt. Add a subtle "hologram scanline" overlay that sweeps on hover. Extend to dossier modal and search results.
- **Why:** Current tilt is a flat 7° rotate; parallax + specular makes cards feel like physical glass objects. Device orientation brings the effect to phones.
- **Effort:** M (2 sprints)
- **Files:** `src/App.tsx` (tilt handler expansion), `src/styles/global.css` (parallax layers, specular), `src/components/Dossier.tsx`, `src/components/SearchOverlay.tsx`.
- **Dependencies:**
  - **Style/Layout:** card DOM must expose `.card-layer` children; container queries for mobile.
  - **Color/Theme:** specular color tokens.

## 7. Data-Driven Scene Telemetry (live pulses)

- **What:** Feed real telemetry into the 3D scene: node emission intensity ∝ recent commits; beam count/pulse speed ∝ open issues; core pulse ∝ signal_percent; domain label glow ∝ domain_counts. Add a "data weather" overlay: when a repo is pushed (newer `updated_at` than last session), emit a radial shockwave from that node + toast. Poll `dashboard.json` every 60s (or SSE/WebSocket later) and animate deltas rather than rebuild.
- **Why:** Today the scene is decorative; tying it to data makes it a live mission picture and rewards attention. Shockwaves make changes legible.
- **Effort:** M–H (2–3 sprints)
- **Files:** `src/components/Constellation3D.tsx` (uniform inputs + shockwave ring mesh), `src/App.tsx` (polling + delta detection), new `src/data/live.ts`.
- **Dependencies:**
  - **Data/Interactivity:** polling/SSE, delta detection, repo identity stability (Component Architecture).
  - **Color/Theme:** shockwave color tokens.

## 8. Accessibility-First Motion & Colorblind Palettes

- **What:** Respect `prefers-reduced-motion` (currently forced off — explicitly violating it). Provide: (a) a "Motion" toggle (Full / Reduced / Off) that drives a CSS var `--motion-scale` and Three.js speed multiplier; (b) colorblind-safe palette variants (deuteranopia/protanopia/tritanopia) selectable in settings, swapping `DOMAIN_COLORS` via CSS vars + scene uniforms; (c) keyboard control of the 3D scene (arrow keys rotate, +/- zoom, Enter selects hovered, Tab cycles nodes) with a visible focus ring on the hovered node; (d) ARIA live region announcing navigation/selection. Add an in-app accessibility panel.
- **Why:** Forced motion is an a11y regression and a legal/accessibility risk. Colorblind users can't distinguish domain colors. Keyboard users are locked out of the hero visualization.
- **Effort:** M (2 sprints)
- **Files:** `src/theme.ts` (palette variants), `src/styles/global.css` (motion vars, focus rings), `src/components/Constellation3D.tsx` (keyboard handlers, focus ring mesh), `src/App.tsx` (settings state), `src/components/HelpOverlay.tsx`.
- **Dependencies:**
  - **Color/Theme:** palette variant definitions + CSS var indirection.
  - **Component Architecture:** settings store; focus management.
  - **Data/Interactivity:** persist prefs.

## 9. WebGL Boot Sequence + Load-Progress Shader

- **What:** Replace the static boot box with a full-screen WebGL canvas: animated wireframe brain assembling (nodes fly in from infinity to laid-out positions), matrix-rain columns, progress bar driven by actual fetch milestones (start → local fetch → parse → ready). On completion, the brain "snaps" to the real constellation layout (shared geometry) and the DOM fades in over it (crossfade). Sound: boot hum + lock-in chime (ties to item 5).
- **Why:** Boot is the first impression and currently a CSS box with a fake 40% bar. A real, data-driven boot builds trust and delight.
- **Effort:** M (2 sprints)
- **Files:** `src/components/BootSequence.tsx` (rewrite), new `src/boot/{scene,progress}.ts`, `src/App.tsx` (progress callbacks).
- **Dependencies:**
  - **Data/Interactivity:** expose load milestones; retry handling.
  - **Style/Layout:** z-index/layering for canvas under DOM.
  - **Component Architecture:** `BootSequence` props contract.

## 10. In-Scene Minimap / Camera Focus Ring

- **What:** Render a small orthographic minimap (bottom-left of constellation container) showing domain cluster positions as colored dots and the camera frustum as a rectangle; click a dot to fly the camera to that cluster (animated lerp over 600ms with easing); double-click a node to "focus" (camera dolly + node scale pulse + vignette). Show a "RESET VIEW" chip. Minimap updates with filter.
- **Why:** The 3D view lacks orientation aids; users get lost. A minimap is the standard for spatial UIs and makes exploration confident.
- **Effort:** M (2 sprints)
- **Files:** `src/components/Constellation3D.tsx` (minimap renderer + camera animation), `src/styles/global.css` (minimap chrome).
- **Dependencies:**
  - **Style/Layout:** container positioning, responsive hide on small.
  - **Component Architecture:** camera control API exposed via ref.

## 11. Snapshot Export & Share (canvas + overlay)

- **What:** "CAPTURE" button (status bar / constellation toolbar) that composites the WebGL canvas + DOM overlay (tooltip, labels) into a PNG, adds a classified-stamp watermark + case-file header + timestamp, downloads as `nortaq-snapshot-<date>.png`, and copies a shareable link (data URL or uploaded). Also export a 5s looping WebM of the scene (MediaRecorder on canvas) for social. Respects quality tier (capture at 2x).
- **Why:** Mission control outputs should be shareable artifacts; great for demos and social. Encourages virality.
- **Effort:** M (2 sprints)
- **Files:** new `src/capture/{png,webm}.ts`, `src/components/Constellation3D.tsx` (capture ref), `src/components/StatusBar.tsx`.
- **Dependencies:**
  - **Data/Interactivity:** share URL / upload endpoint (optional).
  - **Style/Layout:** capture button placement.

## 12. Time-of-Day / Phantom Lighting Rig

- **What:** Drive scene lighting + palette by (a) real local time (dawn amber / day teal / dusk magenta / night deep) using a smooth gradient of `DirectionalLight` color/intensity + fog + background color, and (b) phantom mode (konami) which shifts to a magenta-dominant "infrared" look with scanline intensification and a "PHANTOM" HUD badge. Expose a manual override (Auto / Day / Night / Phantom) in settings. Animate transitions over 1.5s.
- **Why:** Static lighting is flat; time-of-day makes the dashboard feel alive and personal. Phantom mode becomes a real visual transformation rather than a hue-rotate filter.
- **Effort:** M (2 sprints)
- **Files:** `src/components/Constellation3D.tsx` (lights/fog/bg uniforms), `src/styles/global.css` (phantom overrides), `src/App.tsx` (time sampler + override state), `src/theme.ts` (time palettes).
- **Dependencies:**
  - **Color/Theme:** time-of-day palette definitions + CSS vars.
  - **Style/Layout:** override control UI.
  - **Data/Interactivity:** persist override.

---

## Cross-domain coordination matrix

| Visual item | Needs from Style/Layout | Needs from Color/Theme | Needs from Component Architecture | Needs from Data/Interactivity |
|---|---|---|---|---|
| 1 Quality tiering | status bar slot, settings popover | quality badge tokens | `quality` prop contract | capability probe + fps sampler |
| 2 View transitions | transition timing tokens, no-reflow layout | — | stable `viewTransitionName` registry | sync navigation in transition cb |
| 3 Post-FX stack | settings panel, pass toggles | LUT texture + grade uniforms, CRT mask | — | persist FX prefs |
| 4 Instancing/LOD | — | — | stable repo IDs | large-dataset support |
| 5 Sonification | mute/volume control UI | domain→frequency map | audio engine module | threat/status events |
| 6 Parallax tilt | `.card-layer` DOM, container queries | specular tokens | — | device-orientation permission |
| 7 Data-driven scene | — | shockwave tokens | repo identity stability | polling/SSE + delta detection |
| 8 A11y motion/colorblind | motion vars, focus rings | palette variants + CSS var indirection | settings store, focus mgmt | persist prefs |
| 9 WebGL boot | canvas/DOM layering, z-index | — | `BootSequence` props contract | load milestones |
| 10 Minimap | container positioning, responsive hide | — | camera control ref API | — |
| 11 Snapshot export | capture button placement | watermark styling | capture ref | share endpoint (optional) |
| 12 Time-of-day lighting | override control UI | time palettes + CSS vars | — | persist override |

## Items requested from other domains (please deliver)

- **Style/Layout:** container-query breakpoints; settings popover/drawer component; `viewTransitionName`-safe layout (no reflow during morph); minimap positioning tokens; z-index scale documentation.
- **Color/Theme:** CSS-variable indirection for all domain colors (so colorblind variants swap without code changes); LUT PNG + grade uniforms; time-of-day palette stops; specular/shockwave/watermark tokens; frequency map for domains.
- **Component Architecture:** stable component IDs/keys for view transitions and instance mapping; a small settings store (zustand or context) with persistence; `BootSequence` + `Constellation3D` prop contracts documented; focus-management utilities.
- **Data/Interactivity:** load-progress milestones; polling/SSE hook with delta detection; capability/fps probe; persisted user prefs (quality, FX, motion, palette, audio, lighting override); device-orientation permission flow.

## Suggested build order

1 → 8 (quality + a11y foundations) → 2 (view transitions) → 10 (minimap) → 6 (parallax) → 12 (lighting) → 7 (data-driven) → 5 (audio) → 9 (boot) → 3 (post-FX) → 11 (capture) → 4 (instancing/LOD, last because largest refactor).

## Risks & notes

- **Performance budget:** keep 60fps on mid-tier; item 4 (instancing) is the escape hatch for large datasets but is the riskiest refactor — gate behind quality tier and ship incrementally.
- **Motion policy:** item 8 reverses the current "force motion" decision; coordinate with Color/Theme to ensure neon animations have reduced-motion fallbacks (opacity-only, no transform).
- **Three.js version:** 0.187 — confirm `BokehPass`/`SSAOPass` import paths; prefer `postprocessing` (pmndrs) if bundle size becomes an issue.
- **No new runtime deps unless necessary:** prefer native Web APIs (View Transitions, Web Audio, MediaRecorder, DeviceOrientation) to keep bundle lean; only add a library if a domain owner approves.
- **Testing:** add visual regression (Playwright screenshots) for boot, view transition, phantom mode, and each quality tier; add unit tests for quality bucketing and palette swapping.

---

*Prepared by Visual/Rendering lead. Ready to coordinate with Style/Layout, Color/Theme, Component Architecture, and Data/Interactivity leads.*