"""Explicit duplication check: does section 08 already contain each of 10-16?

For every section in 10-16 we take its panel signature (the distinctive
header line of the generated ASCII box) and search for it inside section 08.
"""
import io

lines = io.open("README.md", encoding="utf-8").read().splitlines()


def bounds(num):
    """Line range of '## // NN :: ...', up to the next '## //' heading."""
    start = next((i for i, l in enumerate(lines) if l.startswith(f"## // {num:02d} ::")), None)
    if start is None:
        return None
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## //")), len(lines))
    return start, end


s08 = bounds(8)
sec08 = "\n".join(lines[s08[0]:s08[1]])

# Distinctive signature of each generated panel, as it appears in its own section.
SIGNATURES = {
    10: "PHANTOMTAPE SIGNAL WEATHER",
    11: "PHANTOMTAPE // NIGHTLY INTELLIGENCE REPORT",
    12: "SYSTEM INTEGRITY",
    13: "CURRENT OBSESSION",
    14: "CURRENT STACK",
    15: "PROJECT LIFECYCLE",
    16: "WHILE YOU WERE AWAY",
}

print(f"  section 08 = L{s08[0]+1}-L{s08[1]}\n")
print(f"  {'sec':<5} {'panel signature':<44} {'lines':<7} {'in 08?':<8} verdict")
total_dup = 0
for num, sig in SIGNATURES.items():
    b = bounds(num)
    if not b:
        continue
    body = "\n".join(lines[b[0]:b[1]])
    n = b[1] - b[0]
    present = sig in sec08
    verdict = "REDUNDANT" if present else "unique - keep"
    if present:
        total_dup += n
    print(f"  {num:<5} {sig:<44} {n:<7} {str(present):<8} {verdict}")

print(f"\n  {total_dup} of the lines in sections 10-16 repeat section 08.")
