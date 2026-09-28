"""Confirm the hand-edited lines sit outside the nightly-regenerated blocks.

rebroadcast.py rewrites only what sits between REBROADCAST/ASSETS markers.
Anything a human edits outside those spans is safe from the nightly job.
"""
import io
import re

edited = {
    "header badge (103.7 BROADCAST)": 24,
    "section 02 transmission note": 113,
    "section 02 TUNE IN block": 116,
    "archive table PHNT-007 row": 139,
    "P-09 closed note": 141,
    "clue trail": 1018,
    "FREQUENCIES MUSIC": 1080,
    "FREQUENCIES WEBSITE": 1081,
    "man --tune flag": 1103,
}

lines = io.open("README.md", encoding="utf-8").read().splitlines()

spans = []
for begin, end in (
    ("<!-- REBROADCAST:BEGIN -->", "<!-- REBROADCAST:END -->"),
    ("<!-- ASSETS:BEGIN -->", "<!-- ASSETS:END -->"),
):
    b = next((i for i, l in enumerate(lines, 1) if begin in l), None)
    e = next((i for i, l in enumerate(lines, 1) if end in l), None)
    spans.append((b, e, begin.split(":")[1].strip("- ")))

print("  regenerated regions:")
for b, e, name in spans:
    print(f"    {name:<12} lines {b}-{e}")

print("\n  hand-edited lines:")
bad = 0
for label, ln in edited.items():
    inside = any(b and e and b <= ln <= e for b, e, _ in spans)
    if inside:
        bad += 1
    print(f"    L{ln:<5} {'INSIDE  <-- WOULD BE CLOBBERED' if inside else 'outside (safe)':<28} {label}")

print(f"\n  {'ALL SAFE' if not bad else f'{bad} AT RISK'} from the nightly rebroadcast")
