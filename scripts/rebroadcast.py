#!/usr/bin/env python3
"""PHANTOMTAPE REBROADCAST — the profile re-transmits its own live facts.

Every scheduled run:
  1. fetches real public facts via the GitHub REST API (+ GraphQL when a token
     is available),
  2. recomputes the verifiable SIGNAL HASH,
  3. rebuilds the dynamic block between the REBROADCAST markers in README.md,
  4. runs generate_assets.py to build constellation, genome, DNA cards, etc.
  5. injects the combined assets block into README.md,
  6. prints a summary; the workflow commits the change.

Nothing here invents data: unavailable values degrade to honest placeholders.

Local preview (no token):  python rebroadcast.py --gen-only
"""
import datetime
import json
import os
import re
import subprocess
import sys
import urllib.request

SALT_HELPER = "scripts/signal_hash.py"

BEGIN = "<!-- REBROADCAST:BEGIN -->"
END = "<!-- REBROADCAST:END -->"

ASSETS_BEGIN = "<!-- ASSETS:BEGIN -->"
ASSETS_END = "<!-- ASSETS:END -->"

def http_json(url: str, token: str | None = None) -> dict:
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "phantomtape-rebroadcast",
        **({"Authorization": f"Bearer {token}"} if token else {}),
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def graphql_weeks(owner: str, token: str) -> list[int]:
    query = """
      query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks { contributionDays { contributionCount } }
            }
          }
        }
      }
    """
    body = json.dumps({"query": query, "variables": {"login": owner}}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    cal = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]
    weeks = [sum(d["contributionCount"] for d in w["contributionDays"]) for w in cal["weeks"]]
    return cal["totalContributions"], weeks


def signal_hash(owner: str, repos: int, followers: int, contrib: int, date_utc: str) -> str:
    """Mirror of scripts/signal_hash.py (kept in sync; both derive from the SAME inputs)."""
    import hashlib
    salt = "PHANTOMTAPE::SIGNAL::V1"
    payload = f"SALT={salt}|OWNER={owner}|REPOS={repos}|FOLLOWERS={followers}|CONTRIB={contrib}|DATE={date_utc}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:6].upper()


def cell(c: int) -> str:
    if c <= 0:
        return "."
    if c <= 5:
        return "-"
    if c <= 19:
        return "="
    return "#"


def strip_line(weeks: list[int]) -> str:
    return "".join(cell(c) for c in weeks)


def reactions(hash_str: str) -> str:
    # derive a "signal strength" and phase readout deterministically
    n = int(hash_str, 16)
    sig = 40 + (n % 50)              # 40..89 %
    phase = n % 8
    return f"###{'#' * (sig // 10)}={'.' * (12 - sig // 10)}  {sig}%  PHASE {phase:02d}"


def repo_stats(repos: list[dict]) -> tuple[int, list, list]:
    lang_counts: dict[str, int] = {}
    total_stars = 0
    for r in repos:
        lang = r.get("language")
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1
        total_stars += r.get("stargazers_count") or 0
    top_langs = sorted(lang_counts.items(), key=lambda kv: -kv[1])
    latest = sorted(repos, key=lambda r: r.get("pushed_at") or "", reverse=True)[:3]
    return total_stars, top_langs, latest


def build(user: dict, repos: list[dict], contrib: int, weeks: list[int], date_utc: str, has_token: bool,
          owner: str) -> str:
    repos = repos or []
    repo_count = user["public_repos"]
    followers = user["followers"]
    total_stars, top_langs, latest = repo_stats(repos)
    h = signal_hash(owner, repo_count, followers, contrib, date_utc)
    age_days = (datetime.date.fromisoformat(date_utc) -
                datetime.date.fromisoformat(user["created_at"][:10])).days
    week_labels = []
    for i, w in enumerate(weeks):
        if i % 10 == 0 or i == len(weeks) - 1:
            week_labels.append(f"{i:02d}")
        else:
            week_labels.append("  ")
    labels = " ".join(week_labels)
    src = "GRAPHQL" if has_token else "REST (CONTRIB UNSET)"
    contrib_line = str(contrib) if has_token else "<PENDING_TOKEN>"

    lang_summary = ", ".join(f"{ln}x{c}" for ln, c in top_langs[:7]) or "<none>"
    catches = "\n".join(
        f"  {r['name']:<28} PUSHED {r.get('pushed_at', '')[:10]}" for r in latest)

    return "\n".join([
        BEGIN,
        "",
        "```text",
        "┌─ TRANSMISSION STATUS ─────────────────────────────┐",
        f"│ GITHUB ........... ONLINE      REPOS ............. {repo_count:>4} │",
        f"│ CONTRIBUTIONS ..... {contrib_line:<6}  FOLLOWERS .......... {followers:>4} │",
        f"│ UPLINK AGE ........ {age_days:>4} DAYS │",
        f"│ SIGNAL HASH ....... {h}   SIGNAL ......... {reactions(h)} │",
        "└──────────────────────────────────────────────────────┘",
        "",
        "// SIGNAL ACTIVITY -- REAL-TIME WEEK STRIP (LIVE DATA)",
        "   " + labels,
        "   " + strip_line(weeks),
        "   LOW ───────────────────────────────────────────── HIGH",
        "",
        "// SYSTEM METRICS -- SNAPSHOT (AUDITABLE)",
        f"CONTRIBUTIONS ...... {contrib_line}",
        f"REPOSITORIES ....... {repo_count}",
        f"FOLLOWERS .......... {followers}",
        f"COLLECTED STARS .... {total_stars}",
        f"BROADCASTING FOR ... {age_days} DAYS (SINCE {user['created_at'][:10]} UTC)",
        "",
        "// RECENT CATCHES -- LAST 3 PUSHES",
        catches,
        "",
        "// BROADCAST SCHEDULE -- REAL WORKFLOW CRONS",
        "  SNAKE TRANSMITTER [daily] -> .github/workflows/snake.yml",
        "  REBROADCAST       [nightly] -> .github/workflows/rebroadcast.yml",
        "  ASSET GENERATOR   [nightly] -> scripts/generate_assets.py",
        "",
        "// SYSTEM STATUS",
        "GITHUB ........ ONLINE",
        "PROJECTS ...... ACTIVE",
        "AUDIO ......... ONLINE",
        "BRAIN ......... QUESTIONABLE",
        "COFFEE ........ REQUIRED",
        "",
        "```",
        "",
        "<details>",
        f"  <summary><code>CASES:// RAW ARCHIVE INDEX -- {repo_count} FILES</code></summary>",
        "",
        "```text",
        *[f"  {r['name']:<32} {r.get('language') or '-':<12} *{r.get('stargazers_count') or 0}"
          for r in repos],
        "```",
        "</details>",
        "",
        f"<sup>LAST REBROADCAST {date_utc} UTC . data source: {src} . hash salt public in "
        "docs/how-to-verify.md</sup>",
        "",
        END,
    ])


def replace_block(readme: str, block: str, begin: str, end: str) -> str:
    pattern = re.escape(begin) + r".*?" + re.escape(end)
    if re.search(pattern, readme, flags=re.DOTALL):
        return re.sub(pattern, block, readme, flags=re.DOTALL)
    # no markers yet: append at the end (first run)
    return readme.rstrip() + "\n\n" + block + "\n"


def run_asset_generator(token: str | None) -> str | None:
    """Run generate_assets.py and return the combined block, or None on failure."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    gen_script = os.path.join(script_dir, "generate_assets.py")
    if not os.path.exists(gen_script):
        print("[!] generate_assets.py not found, skipping asset generation", file=sys.stderr)
        return None
    env = os.environ.copy()
    if token:
        env["GH_TOKEN"] = token
    try:
        result = subprocess.run(
            [sys.executable, gen_script],
            capture_output=True, text=True, timeout=120, env=env,
        )
        if result.returncode != 0:
            print(f"[!] generate_assets.py failed: {result.stderr}", file=sys.stderr)
            return None
        print(result.stdout)
        # Read the combined block
        combined_path = os.path.join(script_dir, "..", "assets", "generated", "combined_block.md")
        if os.path.exists(combined_path):
            with open(combined_path, encoding="utf-8") as f:
                return f.read()
    except Exception as exc:
        print(f"[!] Asset generation failed: {exc}", file=sys.stderr)
    return None


def main() -> int:
    owner = os.environ.get("PROFILE_USER", "Nortaq-PlayNexus")
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    now = datetime.datetime.now(datetime.timezone.utc)
    date_utc = now.strftime("%Y%m%d")

    user = http_json(f"https://api.github.com/users/{owner}", token)
    repos: list[dict] = []
    try:
        repos = http_json(
            f"https://api.github.com/users/{owner}/repos?per_page=100&sort=pushed", token)
    except Exception as exc:
        print(f"repos fetch failed ({exc}); archive index omitted", file=sys.stderr)
    contrib = 0
    weeks: list[int] = []
    has_token = bool(token)
    if has_token:
        try:
            contrib, weeks = graphql_weeks(owner, token)
        except Exception as exc:  # keep the block honest, don't fabricate
            print(f"graphql failed ({exc}); contribution fields left unset", file=sys.stderr)
            has_token = False

    block = build(user, repos, contrib, weeks, date_utc, has_token, owner)

    # Generate assets (constellation, genome, DNA cards, etc.)
    assets_block = run_asset_generator(token)

    if "--gen-only" in sys.argv:
        sys.stdout.buffer.write(block.encode("utf-8"))
        if assets_block:
            sys.stdout.buffer.write(("\n\n" + assets_block).encode("utf-8"))
        return 0

    readme_path = "README.md"
    with open(readme_path, encoding="utf-8") as fh:
        readme = fh.read()

    # Replace rebroadcast block
    updated = replace_block(readme, block, BEGIN, END)

    # Replace assets block
    if assets_block:
        updated = replace_block(updated, assets_block, ASSETS_BEGIN, ASSETS_END)

    with open(readme_path, "w", encoding="utf-8") as fh:
        fh.write(updated)
    print(f"rebroadcast ok: {len(weeks)} weeks, {contrib if has_token else 0} contribs, hash updated")
    if assets_block:
        print("assets ok: constellation, genome, DNA cards, intelligence report injected")
    return 0


if __name__ == "__main__":
    sys.exit(main())
