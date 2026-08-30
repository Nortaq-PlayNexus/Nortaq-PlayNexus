# Security notes

1. **No tokens in the repository.** Not in README, workflows, or scripts. The only
   credential material used is GitHub's built-in `secrets.GITHUB_TOKEN`, injected at
   runtime by the runner and never printed.
2. **Least privilege:** workflows declare `permissions: contents: write` for their repo
   only; they cannot read other repos or actions secrets they don't need.
3. **No output leakage:** scripts read `GH_TOKEN`/`GITHUB_TOKEN` from the environment and
   never log its value. No workflow prints `secrets.*`.
4. **Public facts only:** rebroadcast fetches public profile/repo data. It writes
   contributions back into the README — the same number shown on the public profile.
5. **The SIGNAL HASH carries no secret:** its salt is fixed and published; it exists to
   prove freshness, not to hide anything.
6. **If a future dependency needs a real secret** (e.g., a music-streaming integration),
   it goes in Settings → Secrets and variables → Actions, as `PROFILE_TOKEN` or similar,
   referenced only as `${{ secrets.X }}` and documented here.
7. **Workflow audits:** a `trufflehog`/`gitleaks` pass can be added to rebroadcast.yml to
   hard-block accidental secret pushes. Recommended before enabling premium features.

Scan check from `docs/launch-check.md` is the gate: no token/key/secret strings anywhere
except documentation examples.