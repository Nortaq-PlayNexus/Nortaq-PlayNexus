# Easter egg index

The eggs are deliberately findable by curious visitors, but none should fall out of the
reading flow. List for maintainers; visitors don't need this file.

## Original eggs (v1)

| # | Egg | Location | Notes |
|---|---|---|---|
| 1 | `<!-- you weren't supposed to inspect this -->` | top of README | html comment |
| 2 | `$ sudo open_secret` -> joke | CLASSIFIED ARCHIVE details block | |
| 3 | Base64-able string + plaintext answer | CLASSIFIED ARCHIVE | never make visitors decode by hand |
| 4 | Cassette SKUs PHNT-001..005 | hero + transmission + archive | the `07` trail starts here |
| 5 | ASCII PHANTOMTAPE block | CLASSIFIED ARCHIVE | |
| 6 | `ERROR 404: NORMAL PROFILE NOT FOUND` | end of CLASSIFIED block | |
| 7 | `/archive-07` repo (ARG second layer) | CLASSIFIED ARCHIVE `find /` | secret trail resolved |
| 8 | VHS B-sides "track list" | CLASSIFIED ARCHIVE | obviously fictional, by design |
| 9 | `whisper 103.7` closing comment | README footer comment | |

## New eggs (v2 — expanded ARG)

| # | Egg | Location | Notes |
|---|---|---|---|
| 10 | `ARG-NODE-07` HTML comment | README footer | 9 domains + 8 languages + 6 hash chars = 23. 23rd char of README is... |
| 11 | `HINT-01` DNA card ranking | README footer | Top card has 2 stars. Look at the nasa-investigation card. |
| 12 | `HINT-02` frequency repetition | README footer | 103.7 appears in boot sequence, FM dial, and archive clue trail |
| 13 | `HINT-03` ARCHIVE NODE 07 count | README footer | 7th egg = 7th section. Find all 7 to unlock the backdoor. |
| 14 | `HINT-04` audit date | README footer | System integrity panel shows rebroadcast date. |
| 15 | `HINT-05` hash entropy | README footer | 6 hex chars = 24 bits. That's 16M possibilities. |
| 16 | `HINT-06` constellation dots | README footer | Green = active this week, yellow = this month, grey = dormant. |
| 17 | `HINT-07` manifest word count | README footer | MAKE, BREAK, LEARN, BETTER, SHIP. Five words. Five what? |

## The `07` thread (ARG)

Every `07` motif resolves to the same thread:

```
FREQ 103.7 -> PHNT-001 (hero cassette) -> ARCHIVE NODE 07 (terminal) -> SIGNAL 07 (footer)
           └──────────────────────────────┴──────────────→ /archive-07 README
```

Keep all touchpoints in sync or the loop breaks. `archive-07` must stay harmless,
public, and clearly fictional (docs/security.md).

## The constellation puzzle

The SVG constellation has 9 color-coded domains. Each domain has a symbol:
- `~` AUDIO (red)
- `@` AI (green)
- `#` SYSTEMS (cyan)
- `*` EARTH (yellow)
- `x` GAMING (orange)
- `+` DATA (purple)
- `>` WEB (blue)
- `^` LANG (white)
- `.` OTHER (grey)

Count the repos in each domain. The domain with exactly 4 repos... look closer.

## Solving the ARG

When someone finds all 7 original eggs + the new hints:

```
PHANTOMTAPE // NODE 07

FREQUENCY: 103.7
SIGNAL: 07
KEY: ********

> YOU FOUND THE BACKDOOR
```

Not an actual security backdoor. Just an ARG.
