# PHANTOMTAPE YouTube Pack // FREQ 103.7
`assets/youtube/` - pirate broadcast kit for YouTube, matches `assets/hero.svg:1` palette `#0A0A0A` `#B8FF1E` `#00E5FF`.

## Files

| File | Size | Use |
|------|------|-----|
| `youtube-banner.svg` | 2560x1440 | Channel banner. Export to PNG/JPG <6MB. Safe text inside `662.5,551,1235x338`. Upload: YouTube Studio → Customization → Branding → Banner |
| `pfp.svg` | 800x800 | Profile picture. YouTube crops to circle - keep logo inside r=290. Export 800x800 PNG. Upload: Branding → Picture |
| `thumbnail-template.svg` | 1280x720 | Thumbnail base. Edit `PHNT-XXX`, `TITLE`, subtitle. Export 1280x720 PNG <2MB per video |
| `intro-outro.svg` | 1920x1080 | Top half = 3s intro, bottom half = 15s outro with end-screen zone. Split in editor or use as two cards |
| `description.txt` | - | Paste into YouTube Studio → Customization → Basic info → Description. Per-video: append timestamps/links |
| `handle.txt` | - | Suggested handles |

## Export

YouTube does NOT accept SVG. Export:

```powershell
# Inkscape (free) - banner example
inkscape assets/youtube/youtube-banner.svg --export-filename=banner.png --export-width=2560 --export-height=1440
# or: open SVG in Chrome → screenshot → resize, or Figma → Export PNG

# Quick with rsvg (if installed)
rsvg-convert -w 2560 -h 1440 youtube-banner.svg -o banner.png
```

Requirements:
- Banner: 2560x1440, JPG/PNG/GIF, <6MB, safe area 1235x338 centered
- PFP: 98x98 min, 800x800 recommended, PNG/JPG <4MB
- Thumbnail: 1280x720 (16:9), JPG/PNG <2MB
- Intro/Outro: render to MP4 in DaVinci/Premiere - import SVG as image, add visualizer animation

## Upload Checklist

1. **Branding**
   - [ ] Banner: upload `youtube-banner.png` → check on mobile/desktop/TV preview
   - [ ] PFP: upload `pfp.png`
   - [ ] Watermark: export 150x150 `pfp.svg` crop → Branding → Video watermark → Entire video

2. **Basic Info**
   - [ ] Handle: `@phantomtape1037` (try, fallback `@nortaq-playnexus` or `@dj-phantomtape`)
   - [ ] Name: `DJ PHANTOMTAPE`
   - [ ] Description: paste `description.txt`
   - [ ] Links: add GitHub first (other links unlock at 100 subs - keep in description until then)

3. **Layout**
   - [ ] Trailer for non-subs: upload SYNTHESIS demo, set as trailer
   - [ ] Featured section: Add section → Popular uploads + Created playlists (PHNT-002..006)
   - [ ] Playlists: create 6 playlists named `PHNT-002 SONIC FACILITY` etc, set thumbnail to template variants

4. **Per-Video**
   - [ ] Thumbnail: duplicate `thumbnail-template.svg`, edit title, export `thumb-[slug].png`
   - [ ] Intro 3s: use top half of `intro-outro.svg`
   - [ ] Outro: use bottom half - add YouTube End Screen elements (2 videos + subscribe circle) aligned to dashed zone
   - [ ] Chapters: paste timestamp template from `description.txt`
   - [ ] Tags: `phantomtape, synthesis dj, ai dj, wasapi, rust, local ai`

## Style Notes

- Font: `Tomorrow/Orbitron` for PHANTOMTAPE, `Cascadia Code/Fira Code` monospace for readouts. If missing, fallback to Impact/Consolas.
- Colors: `#B8FF1E` acid for active/ON AIR, `#00E5FF` cyan for PHANTOMTAPE label, `#8A8A8A` for secondary, `#1A1A1A` borders.
- Keep glitch copies at 0.12-0.14 opacity - subtle, not noisy.
- Verify banner on 3 sizes: Studio shows mobile/tablet/TV croppings - text must stay inside 1235x338.

## Next

- Generate 6 thumbnail variants pre-filled for PHNT-002..006 + SYNTHESIS trailer
- Record 45s SYNTHESIS trailer (screen cap + Music DNA overlay)
- After 100 subs: add Discord/Instagram/Website links to banner + header
