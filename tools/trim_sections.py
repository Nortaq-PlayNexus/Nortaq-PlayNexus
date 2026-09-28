"""Remove README sections 10-16, which only repeat panels already in section 08,
then renumber the surviving sections so the sequence stays gapless.

Sections dropped (all nightly-generated, all duplicated in section 08):
    10 SIGNAL WEATHER            13 CURRENT OBSESSION
    11 NIGHTLY INTEL REPORT      14 LANGUAGE EVOLUTION
    12 SYSTEM INTEGRITY          15 PROJECT LIFECYCLE
                                 16 WHILE YOU WERE AWAY

Their <a name="..."> anchors go with them. The help block never linked to
weather/intel/integrity/obsession/timeline/lifecycle/away, so no link rots.
"""
import io
import re
import pathlib

PATH = pathlib.Path("README.md")
lines = io.open(PATH, encoding="utf-8").read().splitlines(keepends=True)

DROP_FROM = "## // 10 :: SIGNAL WEATHER"
DROP_TO = "## // 17 :: CLASSIFIED ARCHIVE"

start = next(i for i, l in enumerate(lines) if DROP_FROM in l)
end = next(i for i, l in enumerate(lines) if DROP_TO in l)

# Walk back from the heading to swallow its anchor tag, and back one more to
# swallow the "---" separator that introduced the block, so we do not leave
# two adjacent rules behind.
i = start
while i > 0 and ("<a name=" not in lines[i]):
    i -= 1                      # now on the anchor line
while i > 0 and lines[i - 1].strip() != "---":
    i -= 1
i -= 1                         # include the "---" itself

removed = end - i
print(f"  cutting lines {i+1}-{end}  ({removed} lines)")

out = lines[:i] + lines[end:]

# Renumber: old 17..23 become 10..16. Go high-to-low so we never collide.
text = "".join(out)
for old in range(23, 16, -1):
    new = old - 7
    before = text
    text = re.sub(rf"## // {old:02d} ::", f"## // {new:02d} ::", text)
    if text != before:
        print(f"    // {old:02d} -> // {new:02d}")

PATH.write_text(text, encoding="utf-8")
print(f"  README.md: {len(lines)} -> {len(text.splitlines())} lines")
