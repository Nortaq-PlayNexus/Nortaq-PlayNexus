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


def fetch_zenodo(owner_id):
    """Fetch Zenodo records for an owner. Returns list of record dicts."""
    records = []
    page = 1
    while True:
        qs = urllib.parse.urlencode({"q": f"owners:{owner_id}", "size": 25, "page": page, "sort": "newest"})
        req = urllib.request.Request(f"https://zenodo.org/api/records/?{qs}", headers={"User-Agent": "nortaq-mission-control"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
        except Exception as exc:
            print(f"[zenodo] fetch failed ({exc}); skipping", file=sys.stderr)
            break
        hits = data.get("hits", {}).get("hits", [])
        if not hits:
            break
        for h in hits:
            md = h.get("metadata", {})
            stats = h.get("stats", {})
            records.append({
                "id": h.get("id"),
                "title": md.get("title", ""),
                "description": md.get("description", ""),
                "type": md.get("resource_type", {}).get("type", ""),
                "subtype": md.get("resource_type", {}).get("subtype", ""),
                "creators": [c.get("name", "") for c in md.get("creators", [])],
                "keywords": md.get("keywords", []),
                "publication_date": md.get("publication_date", ""),
                "license": md.get("license", {}).get("id", "") if isinstance(md.get("license"), dict) else str(md.get("license", "")),
                "doi": md.get("doi", f"10.5281/zenodo.{h.get('id')}"),
                "files": [{"key": f.get("key", ""), "size": f.get("size", 0), "checksum": f.get("checksum", "")} for f in h.get("files", [])],
                "downloads": stats.get("downloads", 0),
                "views": stats.get("views", 0),
                "html_url": h.get("links", {}).get("html", f"https://zenodo.org/record/{h.get('id')}"),
                "doi_url": h.get("links", {}).get("doi", f"https://doi.org/10.5281/zenodo.{h.get('id')}"),
            })
        total = data.get("hits", {}).get("total", 0)
        if len(records) >= total:
            break
        page += 1
    return records


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

    # Profile
    profile = {}
    try:
        u = api_get(f"/users/{OWNER}", token)
        profile = {
            "login": u.get("login", OWNER),
            "name": u.get("name"),
            "bio": u.get("bio"),
            "company": u.get("company"),
            "location": u.get("location"),
            "blog": u.get("blog"),
            "twitter": u.get("twitter_username"),
            "avatar_url": u.get("avatar_url"),
            "followers": u.get("followers", 0),
            "following": u.get("following", 0),
            "public_repos": u.get("public_repos", 0),
            "public_gists": u.get("public_gists", 0),
            "created_at": u.get("created_at", ""),
            "updated_at": u.get("updated_at", ""),
            "html_url": u.get("html_url", ""),
        }
        print(f"[collect] Profile: {profile.get('name') or OWNER}")
    except Exception as exc:
        print(f"[collect] profile fetch failed ({exc}); profile left empty", file=sys.stderr)

    # Organizations
    orgs = []
    try:
        org_data = api_get(f"/users/{OWNER}/orgs", token)
        for o in org_data:
            orgs.append({
                "login": o.get("login", ""),
                "description": o.get("description"),
                "avatar_url": o.get("avatar_url"),
                "url": o.get("html_url", f"https://github.com/{o.get('login')}"),
            })
        print(f"[collect] Orgs: {len(orgs)}")
    except Exception as exc:
        print(f"[collect] orgs fetch failed ({exc}); orgs left empty", file=sys.stderr)

    # Starred repos (first page)
    starred = []
    try:
        star_data = api_get(f"/users/{OWNER}/starred?per_page=30", token)
        for s in star_data:
            starred.append({
                "name": s.get("name", ""),
                "full_name": s.get("full_name", ""),
                "description": s.get("description"),
                "html_url": s.get("html_url", ""),
                "language": s.get("language"),
                "stargazers_count": s.get("stargazers_count", 0),
                "owner": s.get("owner", {}).get("login", ""),
            })
        print(f"[collect] Starred: {len(starred)}")
    except Exception as exc:
        print(f"[collect] starred fetch failed ({exc}); starred left empty", file=sys.stderr)

    # Gists
    gists = []
    try:
        gist_data = api_get(f"/users/{OWNER}/gists?per_page=30", token)
        for g in gist_data:
            gists.append({
                "id": g.get("id", ""),
                "description": g.get("description"),
                "html_url": g.get("html_url", ""),
                "created_at": g.get("created_at", ""),
                "updated_at": g.get("updated_at", ""),
                "files": list(g.get("files", {}).keys()),
                "public": g.get("public", True),
            })
        print(f"[collect] Gists: {len(gists)}")
    except Exception as exc:
        print(f"[collect] gists fetch failed ({exc}); gists left empty", file=sys.stderr)

    # Zenodo records
    zenodo_records = []
    try:
        zenodo_records = fetch_zenodo("1912072")
        print(f"[collect] Zenodo: {len(zenodo_records)} records")
    except Exception as exc:
        print(f"[zenodo] fetch failed ({exc}); zenodo left empty", file=sys.stderr)

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
        "profile": profile,
        "organizations": orgs,
        "starred": starred,
        "gists": gists,
        "zenodo_records": zenodo_records,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "dashboard.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, indent=2, ensure_ascii=False)
    print(f"[collect] Wrote {out_path} ({len(processed)} repos, hash={sh})")


if __name__ == "__main__":
    main()
