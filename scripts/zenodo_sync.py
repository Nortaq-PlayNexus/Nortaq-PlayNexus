#!/usr/bin/env python3
"""ZENODO SYNC — rebuild the README's Zenodo archive table from the live Zenodo API.

The Research Bay section claims the record list is "auto-synced from my
account"; this script makes that true. It queries the public Zenodo records
API for everything owned by ZENODO_OWNER_ID and rewrites the block between
the ZENODO markers in README.md.

Nothing here invents data, and a broken sync never wipes a good table: on any
fetch failure or empty result the existing README block is left untouched.

Local preview (no README write):  python scripts/zenodo_sync.py --gen-only
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

OWNER_ID = os.environ.get("ZENODO_OWNER_ID", "1912072")
API = "https://zenodo.org/api/records/"
PAGE_SIZE = 25  # unauthenticated page-size cap; paginate past it

BEGIN = "<!-- ZENODO:BEGIN -->"
END = "<!-- ZENODO:END -->"

README = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "README.md"
)


def fetch_all() -> list[dict]:
    """All published records owned by OWNER_ID, newest first."""
    records: list[dict] = []
    page = 1
    while True:
        qs = urllib.parse.urlencode(
            {"q": f"owners:{OWNER_ID}", "size": PAGE_SIZE, "page": page, "sort": "newest"}
        )
        req = urllib.request.Request(
            f"{API}?{qs}", headers={"User-Agent": "phantomtape-zenodo-sync"}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8"))
        hits = data["hits"]["hits"]
        records.extend(hits)
        total = data["hits"]["total"]
        if not hits or len(records) >= total:
            break
        page += 1
    return records


def build_block(records: list[dict], date_utc: str) -> str:
    rows = []
    for h in sorted(records, key=lambda x: x["id"], reverse=True):
        md = h.get("metadata", {})
        title = re.sub(r"\s+", " ", md.get("title") or "").strip().replace("|", "\\|")
        doi = md.get("doi") or f"10.5281/zenodo.{h['id']}"
        rows.append(f"| {h['id']} | {title} | [{doi}](https://doi.org/{doi}) |")

    return "\n".join(
        [
            BEGIN,
            "",
            "### Zenodo archive — all records",
            "",
            "Full list of published Zenodo records (auto-synced from my account):",
            "",
            "| Record | Title | DOI |",
            "|---|---|---|",
            *rows,
            "",
            f"<sup>ZENODO ARCHIVE · {len(rows)} RECORDS · SYNCED {date_utc} UTC · "
            f"rebuilt by scripts/zenodo_sync.py · owner {OWNER_ID}</sup>",
            "",
            f"Zenodo profile: https://zenodo.org/search?q=owners:{OWNER_ID}",
            "",
            END,
        ]
    )


def replace_block(readme: str, block: str) -> str | None:
    pattern = re.escape(BEGIN) + r".*?" + re.escape(END)
    if not re.search(pattern, readme, flags=re.DOTALL):
        return None
    return re.sub(pattern, block, readme, flags=re.DOTALL)


def main() -> int:
    date_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        records = fetch_all()
    except Exception as exc:
        # fail open: keep the last known-good table rather than wiping it
        print(f"[zenodo] fetch failed ({exc}); README left untouched", file=sys.stderr)
        return 0

    if not records:
        print("[zenodo] zero records returned (API glitch or empty account); "
              "README left untouched", file=sys.stderr)
        return 0

    block = build_block(records, date_utc)

    if "--gen-only" in sys.argv:
        sys.stdout.write(block + "\n")
        return 0

    with open(README, encoding="utf-8") as fh:
        readme = fh.read()

    updated = replace_block(readme, block)
    if updated is None:
        print("[zenodo] ZENODO markers not found in README.md — add "
              f"{BEGIN} / {END} around the archive section", file=sys.stderr)
        return 1

    if updated != readme:
        with open(README, "w", encoding="utf-8") as fh:
            fh.write(updated)
        print(f"[zenodo] README archive table rebuilt: {len(records)} records")
    else:
        print(f"[zenodo] README archive already current: {len(records)} records")
    return 0


if __name__ == "__main__":
    sys.exit(main())
