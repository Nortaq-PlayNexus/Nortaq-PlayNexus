#!/usr/bin/env python3
"""Recolor a Platane/snk contribution snake into the PHANTOMTAPE signal palette.

Reads an .svg on stdin or path, swaps the stock GitHub contribution greens
for the broadcast acid scale, writes stdout or back to the same file.
"""
import re
import sys

PALETTE = {
    # github light
    "#ebedf0": "#161616",
    "#9be9a8": "#2E4D1A",
    "#40c463": "#4E8A1F",
    "#30a14e": "#7FCE2E",
    "#216e39": "#B8FF1E",
    # github dark
    "#161b22": "#0A0A0A",
    "#0e4429": "#2E4D1A",
    "#006d32": "#4E8A1F",
    "#26a641": "#7FCE2E",
    "#39d353": "#B8FF1E",
}


def recolor(text: str) -> tuple[str, int]:
    n = [0]

    def sub(m: re.Match[str]) -> str:
        key = m.group(0).lower()
        if key in PALETTE:
            n[0] += 1
            return PALETTE[key]
        return m.group(0)

    return re.sub(r"#[0-9a-fA-F]{6}", sub, text), n[0]


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else None
    src = open(path, encoding="utf-8").read() if path else sys.stdin.read()
    out, count = recolor(src)
    if path:
        open(path, "w", encoding="utf-8").write(out)
        print(f"recolored {count} hex values -> {path}")
    else:
        sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())