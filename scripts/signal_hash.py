#!/usr/bin/env python3
"""PHANTOMTAPE SIGNAL HASH — verifiable fingerprint of the live transmission.

The hash is a plain SHA-256 over PUBLIC facts anyone can re-read:
  owner, public_repos, followers, year-of-visit contributions, UTC date, salt.

Anyone can recompute it locally:  python3 scripts/signal_hash.py <owner> <repos> <followers> <contribs> <YYYYMMDD>
See docs/how-to-verify.md.
"""
import hashlib
import sys

SALT = "PHANTOMTAPE::SIGNAL::V1"


def signal_hash(owner: str, public_repos: int, followers: int,
                contributions: int, date_utc: str) -> str:
    payload = f"SALT={SALT}|OWNER={owner}|REPOS={public_repos}|FOLLOWERS={followers}|CONTRIB={contributions}|DATE={date_utc}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:6].upper()


if __name__ == "__main__":
    # usage: CONTRIB can be "0" if unknown; DATE in YYYYMMDD UTC
    if len(sys.argv) == 6:
        owner, repos, followers, contrib, day = sys.argv[1:6]
        print(signal_hash(owner, int(repos), int(followers), int(contrib), day))
    else:
        print("usage: python3 signal_hash.py <owner> <public_repos> <followers> <contrib> <YYYYMMDD>")
        sys.exit(2)