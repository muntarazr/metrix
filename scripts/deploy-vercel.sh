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

KEYS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  GEMINI_API_KEY
  MISTRAL_API_KEY
  IMAGEKIT_PRIVATE_KEY
)

ARGS=()
for K in "${KEYS[@]}"; do
  if [ -z "${!K:-}" ]; then
    echo "error: $K is empty in .env.local" >&2
    exit 1
  fi
  V="${!K}"
  ARGS+=( -e "$K=$V" -b "$K=$V" )
done

echo "deploying with ${#KEYS[@]} environment variables (values not echoed)"
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
