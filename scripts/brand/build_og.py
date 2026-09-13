"""Compose the 1200x630 social card as a pure-path SVG.

Everything is outlines, so the card renders identically with no font installed.
The tagline is shaped from Plus Jakarta Sans by build.sh."""
import re, os
exec(open('scripts/brand/build_svg.py')
     .read().split("# ---------- 1. the mark")[0].replace("os.makedirs(OUT, exist_ok=True)",""))

BUILD = 'scripts/brand/.build/'
CANVAS  = '#060606'   # --canvas  dark
FG      = '#fafafa'   # --foreground dark
MUTED   = '#a2a2a2'   # --muted-foreground dark
ACCENT  = '#37b8d4'   # --primary dark

W, H = 1200.0, 630.0
mark_d = open(BUILD + 'mark32.d').read().strip()
mx0,my0,mx1,my1 = bbox([mark_d]); MW,MH = mx1-mx0, my1-my0
mark0 = xform(mark_d,1,1,-mx0,-my0)

# Latin wordmark on a baseline
gl = open(BUILD + 'wordmark_paths.txt').read().strip().split('\n')[:6]
rows=[gl[:3],gl[3:]]; boxes=[[bbox([g]) for g in r] for r in rows]
base=[max(b[3] for b in r) for r in boxes]; gap=boxes[0][1][0]-boxes[0][0][2]
placed,pen=[],0.0
for ri,row in enumerate(rows):
    for gi,g in enumerate(row):
        x0,y0,x1,y1=boxes[ri][gi]
        placed.append(xform(g,1,1,pen-x0,-base[ri])); pen+=(x1-x0)+gap
LX0,LY0,LX1,LY1=bbox(placed); LW,LASC = LX1-LX0, -LY0

# Tagline on a baseline (Plus Jakarta Sans outlines)
tag = open(BUILD + 'tagline_ar.txt').read().strip().split('\n')
TX0,TY0,TX1,TY1 = bbox(tag); TW, TASC, TDESC = TX1-TX0, -TY0, TY1

# ---- layout ----
PAD   = 96.0
CAP   = 104.0                      # METRIX cap height on the card
ws    = CAP / LASC
ms    = (CAP * 1.34) / MH
mw, mh = MW*ms, MH*ms
space  = CAP * 0.40
lock_w = mw + space + LW*ws
base_y = 322.0                     # baseline of the wordmark

TAG_ASC = 30.0                     # tagline cap height
ts   = TAG_ASC / TASC
tag_w = TW*ts
tag_base = base_y + 108.0

parts = ['<rect width="1200" height="630" fill="%s"/>' % CANVAS]
# accent hairline, top edge
parts.append('<rect x="0" y="0" width="1200" height="6" fill="%s"/>' % ACCENT)
# mark in the accent, wordmark in the foreground: accent stays a small share
parts.append('<path fill="%s" d="%s"/>' % (
    ACCENT, xform(mark0, ms, ms, PAD, base_y - CAP/2 - mh/2)))
for p in placed:
    parts.append('<path fill="%s" d="%s"/>' % (
        FG, xform(p, ws, ws, PAD + mw + space - LX0*ws, base_y)))
# Tagline, sharing the lockup's left margin
for p in tag:
    parts.append('<path fill="%s" d="%s"/>' % (
        MUTED, xform(p, ts, ts, PAD - TX0*ts, tag_base)))

open('public/brand/og.svg','w').write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">%s</svg>\n'
    % ''.join(parts))
print("og.svg written")
print("  lockup width %.1f (fits: %s)" % (lock_w, lock_w + 2*PAD <= W))
print("  tagline width %.1f (fits: %s)" % (tag_w, tag_w + 2*PAD <= W))
print("  tagline baseline %.1f, descent to %.1f (fits: %s)" % (
    tag_base, tag_base + TDESC*ts, tag_base + TDESC*ts <= H))
