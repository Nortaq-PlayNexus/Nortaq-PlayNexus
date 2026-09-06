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
    avg_days = sum(r["days_since_push"] for r in processed if not r["archived"] and not r["fork"]) / max(1, active + stale)

    sh = signal_hash(processed, total_stars)
    now = datetime.now(timezone.utc)
    phase = (now.day % 28) + 1
    frequency = f"{100 + (now.hour % 4) * 0.9 + (now.minute / 60) * 0.9:.1f}"

    # Activity by week (52 weeks)
    activity_by_week = []
    week_ms = 7 * 24 * 60 * 60
    now_ts = now.timestamp()
    for i in range(52):
        week_start = now_ts - (i + 1) * week_ms
        week_end = now_ts - i * week_ms
        count = sum(1 for r in processed if not r["archived"] and not r["fork"])
        activity_by_week.append(count // 10)

    telemetry = {
        "total_repos": len(processed),
        "total_stars": total_stars,
        "total_forks": total_forks,
        "total_issues": total_issues,
        "public_repos": len(processed),
        "followers": 0,
        "contributions": 0,
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
