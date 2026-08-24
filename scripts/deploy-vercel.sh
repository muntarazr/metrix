#!/usr/bin/env bash
#
# Deploy METRIX to Vercel.
#
# Reads the six required keys out of .env.local and passes them to Vercel as
# both build-time and run-time variables. NEXT_PUBLIC_* has to be present at
# build time because Next inlines it into the client bundle; the proxy and the
# API routes read the rest at run time. The values are never printed.
#
# Usage:  ./scripts/deploy-vercel.sh
#
set -euo pipefail

export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "error: .env.local is missing — every request 500s in src/proxy.ts without it." >&2
  exit 1
fi

# The Vercel project name must be lowercase; the directory is METRIX, so the
# name cannot be inferred from it and has to be passed explicitly.
npx vercel link --yes --project metrix

set -a; . ./.env.local; set +a

REQUIRED_KEYS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  GEMINI_API_KEY
  MISTRAL_API_KEY
)

# Not required to run the live app: it is read only by
# scripts/migrate-to-imagekit.mjs, a local one-off migration script. Image
# display uses a public ik.imagekit.io URL that needs no key. Pass it along
# only if the user has actually set it — never block a deploy on it.
OPTIONAL_KEYS=(
  IMAGEKIT_PRIVATE_KEY
)

ARGS=()
for K in "${REQUIRED_KEYS[@]}"; do
  if [ -z "${!K:-}" ]; then
    echo "error: $K is empty in .env.local" >&2
    exit 1
  fi
  V="${!K}"
  ARGS+=( -e "$K=$V" -b "$K=$V" )
done

for K in "${OPTIONAL_KEYS[@]}"; do
  if [ -n "${!K:-}" ]; then
    V="${!K}"
    ARGS+=( -e "$K=$V" -b "$K=$V" )
  else
    echo "note: $K is empty — skipping (only needed for scripts/migrate-to-imagekit.mjs)"
  fi
done

echo "deploying with ${#REQUIRED_KEYS[@]} required + up to ${#OPTIONAL_KEYS[@]} optional environment variables (values not echoed)"
npx vercel deploy --prod --yes "${ARGS[@]}"

cat <<'NEXT'

------------------------------------------------------------------
Done. Two things still have to happen by hand, or login will break:

1. Supabase -> Authentication -> URL Configuration
     Site URL:       https://<your-deployment>.vercel.app
     Redirect URLs:  https://<your-deployment>.vercel.app/auth/callback

2. src/lib/api.ts — SERVER_URL is hardcoded for the Capacitor Android build.
   Point it at the new deployment before the next ./scripts/build-mobile.sh.
------------------------------------------------------------------
NEXT
