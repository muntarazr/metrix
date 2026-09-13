#!/usr/bin/env bash
# Regenerate every METRIX brand asset from the source artwork.
#
#   ./scripts/brand/build.sh
#
# Prerequisites:
#   - node on PATH (see CLAUDE.md — nvm is not on the default PATH)
#   - a Python venv with fontTools, brotli and uharfbuzz, at scripts/brand/venv
#     python3 -m venv scripts/brand/venv
#     ./scripts/brand/venv/bin/pip install fonttools brotli uharfbuzz
#
# The social-card tagline is shaped from Plus Jakarta Sans. The font is not
# vendored; it is lifted from next/font's cache under .next/static/media, so
# run `npm run build` (or `npm run dev`) at least once first.
set -euo pipefail
cd "$(dirname "$0")/../.."

BUILD=scripts/brand/.build
VENV=scripts/brand/venv/bin/python
mkdir -p "$BUILD"

if [ ! -x "$VENV" ]; then
  echo "error: $VENV missing — see the header of this script." >&2
  exit 1
fi

echo "==> locating Plus Jakarta Sans in next/font cache"
"$VENV" - <<'FONTPY'
import glob, os
from fontTools.ttLib import TTFont
out = "scripts/brand/.build"
need = "Turn any goal into a plan you can actually follow."
best = None
for p in sorted(glob.glob(".next/static/media/*.woff2")):
    try:
        f = TTFont(p, lazy=True)
        fam = f["name"].getDebugName(16) or f["name"].getDebugName(1)
    except Exception:
        continue
    if fam != "Plus Jakarta Sans":
        continue
    cm = f.getBestCmap()
    if any(ord(c) not in cm for c in need):
        continue          # wrong subset for the tagline
    if best is None or len(cm) > best[1]:
        best = (p, len(cm))
if best is None:
    raise SystemExit("no Plus Jakarta Sans subset covers the tagline - run `npm run build` first")
g = TTFont(best[0]); g.flavor = None
g.save(os.path.join(out, "jakarta.ttf"))
print("   jakarta.ttf <- %s (%d glyphs)" % (os.path.basename(best[0]), best[1]))
FONTPY

echo "==> normalising the mark from public/brand/source/logo-mark.svg"
"$VENV" - <<'PY'
import re
s = open('public/brand/source/logo-mark.svg').read()
m = re.search(r'<clipPath id="119459e8fd">(.*?)</clipPath>', s, re.S)
d = re.search(r'\sd="([^"]*)"', m.group(1)).group(1)
open('scripts/brand/.build/mark.d', 'w').write(d)
PY
python3 scripts/brand/normalize.py "$BUILD/mark.d" 32 > "$BUILD/mark32.d"

echo "==> extracting the Latin wordmark from public/brand/source/logo-stacked.svg"
python3 scripts/brand/extract_wordmark.py

echo "==> building SVG assets"
python3 scripts/brand/build_svg.py

echo "==> generating src/components/brand/Logo.tsx"
python3 scripts/brand/build_component.py

echo "==> shaping the tagline"
SHAPE_OUT="$BUILD/tagline_ar.txt" "$VENV" scripts/brand/shape.py \
  "$BUILD/jakarta.ttf" 'Turn any goal into a plan you can actually follow.' ltr Latn

echo "==> building the social card"
python3 scripts/brand/build_og.py

echo "==> rasterising icons, og.png and favicon.ico"
node scripts/brand/raster.js
cp public/brand/favicon.ico src/app/favicon.ico

echo "==> regenerating Android assets"
node scripts/brand/android-assets.js

echo
echo "done. Assets are in public/brand/ and mobile/android/app/src/main/res/."
