#!/usr/bin/env python3
"""
Collect GitHub data for Nortaq Mission Control dashboard.
Generates mission-control/data/dashboard.json
"""
import json
import os
import sys
import hashlib
import urllib.request
from datetime import datetime, timezone

OWNER = "Nortaq-PlayNexus"
SALT = "PHANTOMTAPE::SIGNAL::V1"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

DOMAIN_MAP = {
    "ai": "AI", "artificial-intelligence": "AI", "machine-learning": "AI", "llm": "AI", "neural": "AI",
    "audio": "AUDIO", "music": "AUDIO", "sound": "AUDIO", "dsp": "AUDIO", "synth": "AUDIO", "radio": "AUDIO", "fm": "AUDIO",
    "earth": "EARTH", "gis": "EARTH", "geospatial": "EARTH", "nasa": "EARTH", "mars": "EARTH", "terrain": "EARTH",
    "gaming": "GAMING", "game": "GAMING", "voxel": "GAMING",
    "system": "SYSTEMS", "os": "SYSTEMS", "kernel": "SYSTEMS", "driver": "SYSTEMS", "security": "SYSTEMS",
    "tool": "TOOLS", "utility": "TOOLS", "cli": "TOOLS", "automation": "TOOLS",
    "web": "WEB", "browser": "WEB", "frontend": "WEB",
    "data": "DATA", "database": "DATA", "analytics": "DATA",
    "lang": "LANG", "language": "LANG", "parser": "LANG", "compiler": "LANG",
}


def api_get(path, token=None):
    url = f"https://api.github.com{path}"
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github.v3+json")
    if token:
        req.add_header("Authorization", f"token {token}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def graphql_contributions(owner, token):
    """Total contributions + per-week counts for the last year (same query as scripts/rebroadcast.py)."""
    query = (
        "query($login:String!){ user(login:$login){ contributionsCollection {"
        " contributionCalendar { totalContributions"
        " weeks { contributionDays { contributionCount } } } } } }"
    )
    payload = json.dumps({"query": query, "variables": {"login": owner}}).encode("utf-8")
    req = urllib.request.Request("https://api.github.com/graphql", data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data.get("errors"):
        raise RuntimeError(data["errors"][0].get("message", "graphql error"))
    cal = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]
    weeks = [sum(d["contributionCount"] for d in w["contributionDays"]) for w in cal["weeks"]]
    return cal["totalContributions"], weeks[-52:]


def classify_domain(repo):
    name = repo.get("name", "").lower()
    desc = (repo.get("description") or "").lower()
    topics = [t.lower() for t in repo.get("topics", [])]
    text = f"{name} {desc} {' '.join(topics)}"
    for keyword, domain in DOMAIN_MAP.items():
        if keyword in text:
            return domain
    lang = (repo.get("language") or "").lower()
    lang_map = {"python": "AI", "rust": "SYSTEMS", "typescript": "WEB", "javascript": "WEB"}
    return lang_map.get(lang, "OTHER")


def days_since(date_str):
    if not date_str:
        return 9999
    dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    return (now - dt).days


def signal_hash(repos, stars_total):
    canonical = f"repos={len(repos)}:stars={stars_total}:owner={OWNER}"
    preimage = f"{SALT}:{canonical}"
    return hashlib.sha256(preimage.encode()).hexdigest()[:6].upper()


def main():
    token = os.environ.get("GITHUB_TOKEN")
    print(f"[collect] Fetching repos for {OWNER}...")

    repos = []
    page = 1
    while True:
        data = api_get(f"/users/{OWNER}/repos?per_page=100&page={page}&type=public", token)
        if not data:
            break
        repos.extend(data)
        if len(data) < 100:
            break
        page += 1

    print(f"[collect] Found {len(repos)} repos")

    try:
        followers = api_get(f"/users/{OWNER}", token).get("followers")
    except Exception as exc:
        print(f"[collect] user fetch failed ({exc}); followers left unset", file=sys.stderr)
        followers = None

    contributions = None
    contrib_weeks = None
    if token:
        try:
            contributions, contrib_weeks = graphql_contributions(OWNER, token)
            print(f"[collect] GraphQL contributions: {contributions}")
        except Exception as exc:
            print(f"[collect] graphql failed ({exc}); contribution fields left unset", file=sys.stderr)

    processed = []
    total_stars = 0
    total_forks = 0
    total_issues = 0
    languages = {}
    domain_counts = {}

    for r in repos:
        domain = classify_domain(r)
        stars = r.get("stargazers_count", 0)
        forks = r.get("forks_count", 0)
        issues = r.get("open_issues_count", 0)
        lang = r.get("language")
        pushed = r.get("pushed_at", "")
        created = r.get("created_at", "")
        days = days_since(pushed)

        total_stars += stars
        total_forks += forks
        total_issues += issues
        if lang:
            languages[lang] = languages.get(lang, 0) + 1
        domain_counts[domain] = domain_counts.get(domain, 0) + 1

        processed.append({
            "name": r.get("name", ""),
            "full_name": r.get("full_name", ""),
            "description": r.get("description"),
            "html_url": r.get("html_url", ""),
            "language": lang,
            "topics": r.get("topics", []),
            "stargazers_count": stars,
            "forks_count": forks,
            "open_issues_count": issues,
            "created_at": created,
            "updated_at": r.get("updated_at", ""),
            "pushed_at": pushed,
            "archived": r.get("archived", False),
            "fork": r.get("fork", False),
            "size": r.get("size", 0),
            "default_branch": r.get("default_branch", "main"),
            "homepage": r.get("homepage"),
            "domain": domain,
            "activity_score": max(0, 100 - min(days, 100)),
            "days_since_push": days,
        })

    processed.sort(key=lambda x: x["pushed_at"], reverse=True)

    active = sum(1 for r in processed if not r["archived"] and not r["fork"] and r["days_since_push"] < 30)
    stale = sum(1 for r in processed if not r["archived"] and not r["fork"] and r["days_since_push"] > 90)
    live = [r for r in processed if not r["archived"] and not r["fork"]]
    avg_days = sum(r["days_since_push"] for r in live) / max(1, len(live))

    sh = signal_hash(processed, total_stars)
    now = datetime.now(timezone.utc)
    phase = (now.day % 28) + 1
    frequency = f"{100 + (now.hour % 4) * 0.9 + (now.minute / 60) * 0.9:.1f}"

    # Activity by week (52 weeks, oldest first). Prefer the real contribution
    # calendar when a token is available; otherwise fall back to counting each
    # repo's last push per week (an honest proxy, clearly weaker data).
    if contrib_weeks is not None:
        activity_by_week = contrib_weeks[-52:]
    else:
        now_ts = now.timestamp()
        week_ms = 7 * 24 * 60 * 60
        epochs = []
        for r in live:
            s = r.get("pushed_at") or ""
            if s:
                epochs.append(datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp())
        activity_by_week = [
            sum(1 for e in epochs if now_ts - (i + 1) * week_ms <= e < now_ts - i * week_ms)
            for i in range(52)
        ]

    telemetry = {
        "total_repos": len(processed),
        "total_stars": total_stars,
        "total_forks": total_forks,
        "total_issues": total_issues,
        "public_repos": len(processed),
        "followers": followers,
        "contributions": contributions,
        "languages": languages,
        "domain_counts": domain_counts,
        "activity_by_week": activity_by_week,
        "active_repos": active,
        "stale_repos": stale,
        "avg_days_since_push": round(avg_days, 1),
        "signal_hash": sh,
        "signal_percent": max(10, min(99, 100 - stale)),
        "phase": phase,
        "frequency": frequency,
    }

    dashboard = {
        "generated_at": now.isoformat(),
        "repos": processed,
        "telemetry": telemetry,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "dashboard.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, indent=2, ensure_ascii=False)
    print(f"[collect] Wrote {out_path} ({len(processed)} repos, hash={sh})")


if __name__ == "__main__":
    main()
