"""Structural validation of README.md after the section trim."""
import io
import re

t = io.open("README.md", encoding="utf-8").read()
lines = t.splitlines()

print("  sections now:")
for i, l in enumerate(lines, 1):
    if l.startswith("## //"):
        print(f"    L{i:<5} {l.strip()[:58]}")

nums = [int(m.group(1)) for m in re.finditer(r"## // (\d+) ::", t)]
print()
print(f"  numbering gapless 1..16 : {nums == list(range(1, 17))}")
print(f"  duplicate sections     : {len(nums) != len(set(nums))}")
print(f"  U+FFFD corruption      : {'YES' if chr(0xFFFD) in t else 'none'}")
print(f"  doubled --- rules      : {'YES' if re.search(r'---[ \t]*\n[ \t]*\n---', t) else 'no'}")

anchors = re.findall(r'<a name="([a-z0-9_-]+)"', t)
links = re.findall(r'href="#([a-z0-9_-]+)"', t)
dead = sorted({a for a in links if a not in anchors})
print(f"  anchors kept           : {', '.join(anchors)}")
print(f"  dead #links            : {dead or 'none'}")

leaked = [n for n in ("weather", "intel", "integrity", "obsession", "timeline", "lifecycle", "away")
          if f'name="{n}"' in t]
print(f"  stale anchors removed  : {'none left' if not leaked else leaked}")
print(f"  total lines            : {len(lines)}")
