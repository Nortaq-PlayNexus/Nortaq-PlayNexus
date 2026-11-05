# NORTAQ // Phantom Field — Desktop Wallpaper

A live, interactive 3D desktop wallpaper based on the [Nortaq-PlayNexus Mission Control](https://nortaq-playnexus.github.io/Nortaq-PlayNexus/mission-control/) constellation scene.

## Quick start

### Option A — Lively Wallpaper (free, recommended)
1. Install [Lively Wallpaper](https://www.rocksdanister.com/lively/) (Microsoft Store or GitHub releases).
2. Open Lively → "Add Wallpaper" → "Enter URL" → paste:
   `https://nortaq-playnexus.github.io/Nortaq-PlayNexus/mission-control/` (or use the local file).
   Or point it at `wallpaper/index.html` via "Add Wallpaper" → "Browse" → select `index.html`.
3. Set as wallpaper. Drag to orbit, scroll to zoom.

### Option B — Wallpaper Engine (Steam, ~$4)
1. Install Wallpaper Engine from Steam.
2. In Wallpaper Engine, click "Open Wallpaper" → select the `wallpaper/` folder (it contains `project.json`).
3. Configure quality/particles/bloom/rotation in the wallpaper settings panel.
4. Wallpaper Engine auto-pauses when a fullscreen app runs (saves battery).

### Option C — Browser (any)
Just open `wallpaper/index.html` in any modern browser. Works offline-ish (fetches data from the deployed site; falls back to generated nodes if offline).

## Features
- **Live 3D AI-brain constellation** — neurons, synapses, pulsing data flow
- **Post-processing** — ACES tone mapping, UnrealBloom, chromatic aberration, vignette, film grain
- **Interactive** — drag to orbit, scroll to zoom, auto-rotate
- **Live data** — fetches repo data from the deployed Mission Control (refreshes on load)
- **Performance-aware** — pauses rendering when the tab/window is hidden; reduced-motion respected
- **Wallpaper Engine integration** — quality/particle/bloom/rotation settings

## Performance notes
- Runs at 1.5× DPR cap (lower than the dashboard's 2×) for sustained 24/7 use.
- Particle counts are halved vs. the dashboard.
- The rAF loop fully pauses when `document.hidden` is true.
- Wallpaper Engine users: enable "Pause when maximized/fullscreen" in settings.

## Files
- `index.html` — standalone wallpaper (self-contained, Three.js from CDN)
- `project.json` — Wallpaper Engine metadata & settings schema
- `README.md` — this file

## Customization
Edit `index.html` to change colors, particle counts, or data source. The scene uses the same color palette as the dashboard:
- Amber `#f5b942`, Teal `#5ec8c5`, Violet `#a58bd4`, Orange `#ff8c42`, Magenta `#ff3fd8`, Cyan `#2ff3e0`
