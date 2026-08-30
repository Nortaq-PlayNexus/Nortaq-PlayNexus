# Accessibility + performance notes

## Accessibility

- **Alt text:** every `img` has a descriptor; decorative SVGs declare `role="img"`
  + `aria-label`.
- **Info > color:** every colored status also carries a glyph (● ◐ ○ ⚠ ◆) or label text;
  nothing important is conveyed by color alone.
- **Contrast:** tokens chosen for AA on near-black. Body `#E8E8E8` on `#0A0A0A` =
  ~13.9:1; dim `#8A8A8A` on `#0A0A0A` = ~5.2:1 (AA-compliant). `--fg-faint #4D4D4D`
  is decorative only — it never carries information.
- **Motion:** hero + visualizer ship animated (`*` assets) and static
  (`*-static.svg`) variants. The animated versions are slow, low-contrast, and
  clamped well below 3 Hz; if you prefer a no-motion experience, swap the
  README image URLs to the `-static` files (see maintenance.md).
- **Flashing:** no element exceeds ~2 Hz; no full-viewport flashing anywhere.
- **Order:** README structure mirrors reading order for screen readers.
- Terminal/terminal blocks use real `<pre>`/`<code>` monospace text (selectable),
  not rasterized screenshots.

## Performance budget

- Repo-hosted assets are small: hero/hero-static ≈ a few KB of SVG; visualizer,
  cassette, dna-strip similarly; snake ≈ tens of KB even when dense.
- Exactly **2** external image dependencies (stats card, streak card) — everything
  else is served from `raw.githubusercontent.com` or rendered at read time.
- No font, tracking, or analytics requests. No scripts anywhere (GitHub strips
  them), so nothing to "load".
- Weekly check: keep any new `assets/` addition under ~200 KB; prefer vector over raster.

Aim: the entire profile should feel instant even on 3G, because it basically is.