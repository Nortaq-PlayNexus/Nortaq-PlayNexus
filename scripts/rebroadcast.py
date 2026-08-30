#!/usr/bin/env python3
"""PHANTOMTAPE REBROADCAST — the profile re-transmits its own live facts.

Every scheduled run:
  1. fetches real public facts via the GitHub REST API (+ GraphQL when a token
     is available),
  2. recomputes the verifiable SIGNAL HASH,
  3. rebuilds the dynamic block between the REBROADCAST markers in README.md,
  4. prints a summary; the workflow commits the change.

Nothing here invents data: unavailable values degrade to honest placeholders.

Local preview (no token):  python rebroadcast.py --gen-only
"""
import datetime
import json
import os
import re
import sys
import urllib.request

SALT_HELPER = "scripts/signal_hash.py"

BEGIN = "<!-- REBROADCAST:BEGIN -->"
END = "<!-- REBROADCAST:END -->"

LEVEL_EMPTY = "\u2591"   # ░
LEVEL_LOW = "\u2592"     # ▒
LEVEL_MID = "\u2593"     # ▓
LEVEL_HIGH = "\u2588"    # █

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
        return LEVEL_EMPTY
    if c <= 5:
        return LEVEL_LOW
    if c <= 19:
        return LEVEL_MID
    return LEVEL_HIGH


def strip_line(weeks: list[int]) -> str:
    return "".join(cell(c) for c in weeks)


def reactions(hash_str: str) -> str:
    # derive a "signal strength" and phase readout deterministically
    n = int(hash_str, 16)
    sig = 40 + (n % 50)              # 40..89 %
    phase = n % 8
    return f"▓▓▓{'▓' * (sig // 10)}▒{'░' * (12 - sig // 10)}  {sig}%  PHASE {phase:02d}"


def build(user: dict, contrib: int, weeks: list[int], date_utc: str, has_token: bool,
          owner: str) -> str:
    repos = user["public_repos"]
    followers = user["followers"]
    h = signal_hash(owner, repos, followers, contrib, date_utc)
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

    return "\n".join([
        BEGIN,
        "",
        "```text",
        "┌─ TRANSMISSION STATUS ─────────────────────────────┐",
        f"│ GITHUB ........... ONLINE      REPOS ............. {repos:>4} │",
        f"│ CONTRIBUTIONS ..... {contrib_line:<6}  FOLLOWERS .......... {followers:>4} │",
        f"│ UPLINK AGE ........ {age_days:>4} DAYS │",
        f"│ SIGNAL HASH ....... {h}   SIGNAL ......... {reactions(h)} │",
        "└──────────────────────────────────────────────────────┘",
        "",
        "// SIGNAL ACTIVITY — 53 WEEK REAL-TIME STRIP (LIVE DATA)",
        "   " + labels,
        "   " + strip_line(weeks),
        "   LOW ───────────────────────────────────────────── HIGH",
        "",
        "// SYSTEM METRICS — SNAPSHOT (AUDITABLE)",
        f"CONTRIBUTIONS ...... {contrib_line}",
        f"REPOSITORIES ....... {repos}",
        f"FOLLOWERS .......... {followers}",
        f"BROADCASTING FOR ... {age_days} DAYS (SINCE {user['created_at'][:10]} UTC)",
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
        f"<sup>LAST REBROADCAST {date_utc} UTC · data source: {src} · hash salt public in "
        "docs/how-to-verify.md</sup>",
        "",
        END,
    ])


def replace_block(readme: str, block: str) -> str:
    pattern = re.escape(BEGIN) + r".*?" + re.escape(END)
    if re.search(pattern, readme, flags=re.DOTALL):
        return re.sub(pattern, block, readme, flags=re.DOTALL)
    # no markers yet: append at the end (first run)
    return readme.rstrip() + "\n\n" + block + "\n"


def main() -> int:
    owner = os.environ.get("PROFILE_USER", "Nortaq-PlayNexus")
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    now = datetime.datetime.now(datetime.timezone.utc)
    date_utc = now.strftime("%Y%m%d")

    user = http_json(f"https://api.github.com/users/{owner}", token)
    contrib = 0
    weeks: list[int] = []
    has_token = bool(token)
    if has_token:
        try:
            contrib, weeks = graphql_weeks(owner, token)
        except Exception as exc:  # keep the block honest, don't fabricate
            print(f"graphql failed ({exc}); contribution fields left unset", file=sys.stderr)
            has_token = False

    block = build(user, contrib, weeks, date_utc, has_token, owner)

    if "--gen-only" in sys.argv:
        sys.stdout.write(block)
        return 0

    readme_path = "README.md"
    with open(readme_path, encoding="utf-8") as fh:
        readme = fh.read()
    updated = replace_block(readme, block)
    with open(readme_path, "w", encoding="utf-8") as fh:
        fh.write(updated)
    print(f"rebroadcast ok: {len(weeks)} weeks, {contrib if has_token else 0} contribs, hash updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())