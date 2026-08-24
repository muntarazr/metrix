#!/usr/bin/env bash
#
# Pushes to GitHub without you having to splice a token into a URL by hand.
# Prompts for the token with hidden input (nothing echoed, nothing saved to
# shell history), builds the authenticated URL just for this one push, then
# immediately resets the remote to its clean form.
#
# Usage:  ./scripts/git-push-with-token.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_URL="github.com/muntarazr/metrix.git"

echo "Paste your GitHub token (starts with github_pat_) and press Enter."
echo "Nothing will be shown on screen as you paste — that's expected."
read -r -s TOKEN
echo

if [ -z "$TOKEN" ]; then
  echo "error: nothing was entered" >&2
  exit 1
fi

git remote set-url origin "https://${TOKEN}@${REPO_URL}"

# Always clean the remote back up, even if the push fails.
cleanup() { git remote set-url origin "https://${REPO_URL}"; }
trap cleanup EXIT

git push -u origin main
unset TOKEN
