# GitHub & Zenodo Feature Ideas for Mission Control

## GitHub Features (public API, no token required for most)

### 1. GitHub Profile / Identity Card
- **What:** Fetch `/users/{owner}` for avatar, bio, company, location, followers, following, public repos count, created_at, blog, twitter. Render as a "OPERATOR IDENTITY" card on Signal or System view.
- **Why:** Currently only derived repo data; profile identity is missing.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `SystemView.tsx` or new `ProfileView.tsx`

### 2. User Events Stream (Activity Feed)
- **What:** Fetch `/users/{owner}/events/public` (PushEvent, CreateEvent, PullRequestEvent, IssuesEvent, etc.). Render as a "SIGNAL INTERCEPTS" feed with event type, repo, timestamp, action. More granular than current LiveFeed (which only uses pushed_at).
- **Why:** Real-time activity stream; shows PRs, issues, stars, forks as events.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, `LiveFeed.tsx` or new `EventsFeed.tsx`

### 3. Starred Repositories
- **What:** Fetch `/users/{owner}/starred` (repos the owner starred). Show as "WATCHED ASSETS" — external repos of interest. Could reveal tech interests.
- **Why:** Currently only own repos; starred repos show what the operator watches.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, new `StarredView.tsx` or section in MissionControl

### 4. Organizations
- **What:** Fetch `/users/{owner}/orgs`. Show org memberships with avatars. "AFFILIATIONS" card.
- **Why:** Shows organizational context.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `SystemView.tsx`

### 5. Gists
- **What:** Fetch `/users/{owner}/gists`. Show as "SNIPPETS / FIELD NOTES" — code snippets shared publicly.
- **Why:** Gists are often overlooked; shows quick code shares.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, new section

### 6. Followers / Following Network
- **What:** Fetch follower/following lists. Render as a mini "SOCIAL GRAPH" — avatars, counts, mutual connections. Could integrate into Constellation as a second layer.
- **Why:** Social proof and network analysis.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, `NetworkView.tsx`

### 7. Repo Issues (actual list)
- **What:** Fetch `/repos/{owner}/{repo}/issues` for open issues. Show in Dossier as "OPEN CASES" with title, labels, assignee, created date. Currently only count.
- **Why:** Drill-down from count to actual issues.
- **Effort:** M (needs per-repo fetches, rate-limited)
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`

### 8. Repo Pull Requests
- **What:** Fetch `/repos/{owner}/{repo}/pulls`. Show PR state (open/merged/closed), author, title. "PENDING MERGES" view.
- **Why:** Shows collaboration activity.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, new view or Dossier section

### 9. Repo Commits (recent)
- **What:** Fetch `/repos/{owner}/{repo}/commits`. Show recent commit messages + authors + dates. "RECENT TRANSMISSIONS" in Dossier.
- **Why:** Granular activity beyond pushed_at.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`

### 10. Repo Releases
- **What:** Fetch `/repos/{owner}/{repo}/releases`. Show tag, name, body, published_at, assets. Could replace/enhance current ReleasesView (which just uses pushed_at as proxy).
- **Why:** Real releases vs. proxy.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, `ReleasesView.tsx`

### 11. Repo Branches & Tags
- **What:** Fetch `/repos/{owner}/{repo}/branches` and `/tags`. Show branch count, default branch, tag list. "VERSION CONTROL" in Dossier.
- **Why:** Shows repo maturity.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`

### 12. Repo Contributors
- **What:** Fetch `/repos/{owner}/{repo}/contributors`. Show top contributors with avatars + commit counts. "OPERATIVES" in Dossier.
- **Why:** Shows who's working on each asset.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`

### 13. Repo Languages (detailed)
- **What:** Fetch `/repos/{owner}/{repo}/languages` for byte counts per language. Currently only primary language. Show language breakdown bar.
- **Why:** More granular than single language.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`, `TechnologyView.tsx`

### 14. Repo Traffic (views/clones)
- **What:** Fetch `/repos/{owner}/{repo}/traffic/views` and `/clones`. Shows popularity trends. (Requires push access token.)
- **Why:** Shows which repos are being viewed/cloned.
- **Effort:** M (needs token with push access)
- **Files:** `collect-data.py`, `types.ts`, `TelemetryView.tsx`

### 15. Repo Community Health
- **What:** Fetch `/repos/{owner}/{repo}/community/profile`. Shows health percentage, has README, license, contributing, code of conduct, issue template, PR template.
- **Why:** Repo quality metrics.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`

### 16. Security Alerts (Dependabot/Code Scanning)
- **What:** Fetch `/repos/{owner}/{repo}/dependabot/alerts` and `/code-scanning/alerts`. Show vulnerability count by severity. "THREAT ASSESSMENT" in Dossier.
- **Why:** Security posture per repo.
- **Effort:** L (needs security scope token)
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`, `SystemView.tsx`

### 17. GitHub Actions Runs
- **What:** Fetch `/repos/{owner}/{repo}/actions/runs`. Show latest workflow status (success/failure), duration. "CI STATUS" in Dossier.
- **Why:** Build health per repo.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`

### 18. GitHub Search (repos/code/users)
- **What:** Use `/search/repositories`, `/search/code`, `/search/users` for global search. Enhance command palette with code search.
- **Why:** Search across all GitHub, not just own repos.
- **Effort:** M
- **Files:** `SearchOverlay.tsx`, `collect-data.py`

### 19. GitHub Notifications
- **What:** Fetch `/notifications` (needs notifications scope). Show unread count as badge in header. "INBOX" view.
- **Why:** Real-time notification center.
- **Effort:** M (needs token)
- **Files:** `collect-data.py`, `types.ts`, `HeaderBar.tsx`, new view

### 20. GitHub Discussions
- **What:** Fetch `/repos/{owner}/{repo}/discussions`. Show discussion count, categories. "FORUM" in Dossier.
- **Why:** Community engagement metric.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `Dossier.tsx`

### 21. GitHub Projects (classic)
- **What:** Fetch `/repos/{owner}/{repo}/projects`. Show project boards. "OPERATIONS BOARD" view.
- **Why:** Project management visibility.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, new view

### 22. GitHub Packages
- **What:** Fetch `/users/{owner}/packages`. Show published packages (npm, docker, etc.). "ARSENAL" view.
- **Why:** Shows published artifacts.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `TechnologyView.tsx`

### 23. GitHub GPG/SSH Keys
- **What:** Fetch `/users/{owner}/gpg_keys` and `/keys`. Show key count. "CRYPTO IDENTITY" in SystemView.
- **Why:** Security posture.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `SystemView.tsx`

### 24. GitHub Rate Limit Status
- **What:** Fetch `/rate_limit`. Show remaining/limit/reset. "API QUOTA" in SystemView or footer.
- **Why:** Transparency about data freshness.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `SystemView.tsx`

### 25. GitHub User Hovercard
- **What:** Fetch `/users/{owner}/hovercard` with subject context. Show contextual info (repos, orgs, issues, PRs).
- **Why:** Rich hover tooltips.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`

### 26. Commit Activity (per repo)
- **What:** Fetch `/repos/{owner}/{repo}/stats/commit_activity`. Weekly commit counts for last year. Could enhance ActivityGraph.
- **Why:** More granular than push counts.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, `ActivityGraph.tsx`

### 27. Code Frequency
- **What:** Fetch `/repos/{owner}/{repo}/stats/code_frequency`. Additions/deletions per week. "CODE VELOCITY" chart.
- **Why:** Shows code churn.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, new chart

### 28. Punch Card
- **What:** Fetch `/repos/{owner}/{repo}/stats/punch_card`. Commits by hour/day of week. "OPERATIONAL HOURS" heatmap.
- **Why:** Shows when work happens.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, new viz

### 29. Participation Stats
- **What:** Fetch `/repos/{owner}/{repo}/stats/participation`. Owner vs. others commit split. "CONTRIBUTION SPLIT" chart.
- **Why:** Shows collaboration ratio.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`

### 30. Top Languages (user-level)
- **What:** Aggregate languages across all repos (already have languages count, but could add byte-level breakdown via `/repos/{owner}/{repo}/languages`).
- **Why:** More accurate than repo-count-based.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `TechnologyView.tsx`

---

## Zenodo Features (public API, no token for reads)

### 31. Zenodo Records List
- **What:** Fetch `/api/records?q=owners:{OWNER_ID}` (already in zenodo_sync.py). Show all Zenodo records as "RESEARCH ARCHIVE" view with title, type, date, DOI.
- **Why:** Currently only in README; not in dashboard.
- **Effort:** S
- **Files:** `collect-data.py` (or new script), `types.ts`, new `ZenodoView.tsx`

### 32. Zenodo Record Detail
- **What:** Fetch `/api/records/{id}` for full metadata: title, description, creators, keywords, publication date, license, files, DOI, downloads, views.
- **Why:** Drill-down into each record.
- **Effort:** M
- **Files:** `collect-data.py`, `types.ts`, `ZenodoView.tsx` or Dossier-like modal

### 33. Zenodo File Browser
- **What:** List files in a record with download links, sizes, checksums. "EVIDENCE FILES" in record detail.
- **Why:** Shows downloadable artifacts.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `ZenodoView.tsx`

### 34. Zenodo Download/View Stats
- **What:** Zenodo records include `stats.downloads` and `stats.views`. Show as metrics. "DISSEMINATION" stats.
- **Why:** Shows research impact.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `ZenodoView.tsx`

### 35. Zenodo Communities
- **What:** Fetch `/api/records?q=communities:{id}`. Show which communities the records belong to. "AFFILIATED COMMUNITIES".
- **Why:** Shows institutional context.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`

### 36. Zenodo Search
- **What:** Search Zenodo records by keyword. Add to command palette as "SEARCH ZENODO".
- **Why:** Cross-platform search.
- **Effort:** M
- **Files:** `SearchOverlay.tsx`, `collect-data.py`

### 37. Zenodo Versions
- **What:** Show all versions of a record (all_versions=true). "VERSION HISTORY" in record detail.
- **Why:** Shows evolution of research.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`

### 38. Zenodo DOI Badge
- **What:** Render DOI as a badge/link. "CITATION" section in record detail with copyable DOI + BibTeX.
- **Why:** Academic citation support.
- **Effort:** S
- **Files:** `ZenodoView.tsx`

### 39. Zenodo License Info
- **What:** Show license (CC-BY, MIT, etc.) for each record. "CLEARANCE LEVEL" badge.
- **Why:** Shows usage rights.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`

### 40. Zenodo Creators/Affiliations
- **What:** Show creators with affiliations (ORCID, etc.). "OPERATIVES" in record detail.
- **Why:** Shows authorship.
- **Effort:** S
- **Files:** `collect-data.py`, `types.ts`, `ZenodoView.tsx`

---

## Other Integrations

### 41. arXiv Papers
- **What:** Fetch arXiv API for papers by author. "RESEARCH PAPERS" view.
- **Effort:** M

### 42. Hugging Face Models/Datasets
- **What:** Fetch HF API for models/datasets by user. "AI ASSETS" view.
- **Effort:** M

### 43. npm/PyPI Packages
- **What:** Fetch package registries for published packages. "PUBLISHED ARSENAL" view.
- **Effort:** S

### 44. Docker Hub Images
- **What:** Fetch Docker Hub for published images. "CONTAINER REGISTRY" view.
- **Effort:** S

### 45. ORCID Profile
- **What:** Fetch ORCID for academic profile. "ACADEMIC IDENTITY".
- **Effort:** S

### 46. Google Scholar Citations
- **What:** Scrape/parse Google Scholar for citation counts. "CITATION METRICS".
- **Effort:** M

### 47. LinkedIn/GitHub Profile Cross-Reference
- **What:** Combine GitHub + LinkedIn + ORCID into unified operator profile.
- **Effort:** L

---

## Recommended Priority (impact/effort)

### Tier 1 (S effort, high impact)
1. GitHub Profile/Identity Card (#1)
2. GitHub Organizations (#4)
3. GitHub Gists (#5)
4. GitHub Rate Limit Status (#24)
5. GitHub Community Health (#15)
6. Zenodo Records List (#31)
7. Zenodo Download/View Stats (#34)
8. Zenodo License Info (#39)
9. Zenodo Creators (#40)
10. GitHub Packages (#22)
11. GitHub GPG/SSH Keys (#23)

### Tier 2 (M effort, high impact)
12. GitHub User Events Stream (#2)
13. GitHub Starred Repositories (#3)
14. GitHub Repo Issues (#7)
15. GitHub Repo Releases (#10)
16. GitHub Repo Contributors (#12)
17. GitHub Repo Languages detailed (#13)
18. GitHub Repo Commits (#9)
19. GitHub Commit Activity (#26)
20. GitHub Search (#18)
21. Zenodo Record Detail (#32)
22. Zenodo File Browser (#33)
23. Zenodo Communities (#35)
24. Zenodo Versions (#37)
25. Zenodo DOI Badge (#38)

### Tier 3 (L effort, strategic)
26. GitHub Security Alerts (#16)
27. GitHub Actions Runs (#17)
28. GitHub Traffic (#14)
29. GitHub Notifications (#19)
30. Zenodo Search (#36)
31. arXiv Papers (#41)
32. Hugging Face (#42)
