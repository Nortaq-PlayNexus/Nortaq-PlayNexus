#!/usr/bin/env python3
"""PHANTOMTAPE CRT EQUALIZER -- animated contribution graph as a retro equalizer.

Generates an SVG that looks like a CRT/equalizer visualization of the
GitHub contribution graph. Each day is a bar, intensity maps to height,
colored in the PHANTOMTAPE acid green palette.
"""
import datetime
import json
import os
import sys
import urllib.request

OWNER = os.environ.get("PROFILE_USER", "Nortaq-PlayNexus")

def graphql_contributions(owner: str, token: str | None = None) -> list[int]:
    """Get daily contribution counts for the last 365 days."""
    query = """
      query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    """
    body = json.dumps({"query": query, "variables": {"login": owner}}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=body,
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    cal = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]
    days = []
    for week in cal["weeks"]:
        for day in week["contributionDays"]:
            days.append((day["date"], day["contributionCount"]))
    return days


def generate_crt_svg(days: list[tuple[str, int]]) -> str:
    """Generate a CRT/equalizer style SVG from contribution data."""
    bar_width = 3
    gap = 1
    max_height = 60
    svg_width = len(days) * (bar_width + gap) + 40
    svg_height = max_height + 40

    max_count = max((c for _, c in days), default=1) or 1

    bars = []
    for i, (date, count) in enumerate(days):
        x = 20 + i * (bar_width + gap)
        height = max(1, int((count / max_count) * max_height)) if count > 0 else 1
        y = svg_height - 20 - height

        # Color gradient based on intensity
        if count == 0:
            color = "#1a1a2e"
        elif count <= 2:
            color = "#0a3d0a"
        elif count <= 5:
            color = "#1a6b1a"
        elif count <= 10:
            color = "#2d8b2d"
        elif count <= 20:
            color = "#B8FF1E"
        else:
            color = "#00FF88"

        # CRT glow effect - thinner bright bar inside
        glow_height = max(1, height - 2)
        glow_y = y + 1

        bars.append(f'    <rect x="{x}" y="{y}" width="{bar_width}" height="{height}" fill="{color}" rx="1"/>')
        if count > 0:
            bars.append(f'    <rect x="{x}" y="{glow_y}" width="{bar_width}" height="{glow_height}" fill="{color}" opacity="0.4" rx="1"/>')

    # Scanlines for CRT effect
    scanlines = []
    for y in range(0, svg_height, 3):
        scanlines.append(f'    <line x1="0" y1="{y}" x2="{svg_width}" y2="{y}" stroke="#000" stroke-width="0.5" opacity="0.15"/>')

    # Month labels
    month_labels = []
    current_month = ""
    for i, (date, _) in enumerate(days):
        month = datetime.date.fromisoformat(date).strftime("%b")
        if month != current_month:
            current_month = month
            x = 20 + i * (bar_width + gap)
            month_labels.append(f'    <text x="{x}" y="{svg_height - 4}" fill="#4a5568" font-size="7" font-family="monospace">{month}</text>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_width} {svg_height}" width="{svg_width}" font-family="monospace">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="crt-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#B8FF1E" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#0a0e1a" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#0a0e1a"/>
  <rect width="100%" height="100%" fill="url(#crt-gradient)"/>
{chr(10).join(scanlines)}
  <text x="20" y="12" fill="#B8FF1E" font-size="8" font-weight="bold" filter="url(#glow)">CONTRIBUTION EQUALIZER // 52 WEEKS</text>
{chr(10).join(bars)}
{chr(10).join(month_labels)}
  <line x1="20" y1="{svg_height - 20}" x2="{svg_width - 20}" y2="{svg_height - 20}" stroke="#2d3748" stroke-width="0.5"/>
</svg>'''
    return svg


def main() -> int:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    print(f"[*] Fetching contributions for {OWNER}...")
    try:
        days = graphql_contributions(OWNER, token)
    except Exception as exc:
        print(f"[!] GraphQL failed: {exc}", file=sys.stderr)
        # Generate placeholder
        today = datetime.date.today()
        days = [(str(today - datetime.timedelta(days=i)), 0) for i in range(364, -1, -1)]

    print(f"[*] Got {len(days)} days of data")
    svg = generate_crt_svg(days)

    out_path = os.path.join(os.path.dirname(__file__), "..", "assets", "crt-equalizer.svg")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"[OK] CRT equalizer written to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
