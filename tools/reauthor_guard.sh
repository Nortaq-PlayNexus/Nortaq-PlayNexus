#!/bin/sh
# Amend a commit's author only if it was committed under an address GitHub
# does not recognise.
#
# Two identities in this history are already correct and MUST be left alone:
#   41898282+github-actions[bot]@...   the nightly rebroadcast workflow
#   89400000+Nortaq-PlayNexus@...     an older account id, still linked
# Re-attributing the bot's commits to the human would put a false record in
# the history, and that is the failure this guard exists to prevent.

EMAIL="$(git log -1 --format=%ae)"

case "$EMAIL" in
  natha@natha-m2|opencode@localhost)
    echo "      reauthoring $EMAIL"
    git commit --amend --no-edit --reset-author --quiet
    ;;
  *)
    ;;
esac
