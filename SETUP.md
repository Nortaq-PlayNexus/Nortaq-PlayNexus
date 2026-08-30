# SETUP

This is the profile repository for **DJ PHANTOMTAPE**. It is the GitHub special repo
`<username>/<username>` — its README is rendered at the top of the profile page.

## One-time setup

```bash
# 1. Repo is public and named exactly: Nortaq-PlayNexus  (done)
# 2. Enable Actions on the repo (repo → Settings → Actions → Allow)
# 3. Trigger both workflows to generate the first round of content:
gh workflow run snake.yml
gh workflow run rebroadcast.yml
```

No secrets or tokens are required: both workflows use GitHub's built-in
`GITHUB_TOKEN`. Nothing sensitive is ever committed (docs/security.md).

## What happens after first push

1. `snake.yml` renders the contribution snake into `assets/snake-signal-dark.svg`
   and recolors it into the acid signal palette; commits nightly.
2. `rebroadcast.yml` recomputes the live facts block in README.md (between the
   `<!-- REBROADCAST:BEGIN -->` markers), updates the verifiable **SIGNAL HASH**,
   and commits; runs nightly and on every push touching `scripts/rebroadcast.py`.

## Editing

- Workshop/archive truth lives in `docs/projects.md`.
- Placeholders `<PHANTOMTAPE_P-*>` list where your real-world data slots in
  (music links, socials, location, artwork). Fill or remove.
- Assets: keep SVG, keep under ~200 KB, honor the token palette
  (docs/accessibility.md).

## Verify after changes

```bash
python3 scripts/signal_hash.py Nortaq-PlayNexus 41 2 893 20260831   # matches README?
python3 scripts/rebroadcast.py --gen-only | head -40                  # preview block
```