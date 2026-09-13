"""Emit the METRIX brand SVG set from extracted geometry.
Mark  : normalised from public/logo.svg clip path (exact original geometry)
Latin : glyph outlines lifted from public/logo2.svg, re-laid out horizontally
The wordmark is Latin only - METRIX. There is no Arabic lockup by design.
"""
import re, os, subprocess, sys

BUILD = 'scripts/brand/.build/'
OUT = 'public/brand'
BRAND = '#0097b2'
os.makedirs(OUT, exist_ok=True)

# ---------- helpers ----------
ARGC = {'M':1, 'L':1, 'T':1, 'S':2, 'Q':2, 'C':3}

def parse(d):
    """Normalise a path into [(cmd, [(x,y),...])] with H/V expanded to L."""
    toks = re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:[eE]-?\d+)?', d)
    i, cmd, out = 0, None, []
    cx = cy = sx_ = sy_ = 0.0
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd in 'Zz':
                out.append(('Z', [])); cx, cy = sx_, sy_; continue
        if cmd in 'Hh':
            x = float(toks[i]); i += 1
            if cmd == 'h': x += cx
            out.append(('L', [(x, cy)])); cx = x; continue
        if cmd in 'Vv':
            y = float(toks[i]); i += 1
            if cmd == 'v': y += cy
            out.append(('L', [(cx, y)])); cy = y; continue
        n = ARGC.get(cmd.upper() if cmd else None)
        if n is None:
            raise SystemExit('unsupported path command %r' % cmd)
        pts = []
        for _ in range(n):
            x, y = float(toks[i]), float(toks[i+1]); i += 2
            if cmd.islower(): x, y = x + cx, y + cy
            pts.append((x, y))
        C = cmd.upper()
        out.append((C, pts))
        cx, cy = pts[-1]
        if C == 'M': sx_, sy_ = cx, cy
    return out

def bezier_pts(p0, pts, n=32):
    if len(pts) == 3:
        p1, p2, p3 = pts
        for k in range(n+1):
            t = k/n; u = 1-t
            yield (u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],
                   u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1])
    else:
        p1, p2 = pts
        for k in range(n+1):
            t = k/n; u = 1-t
            yield (u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],
                   u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1])

def bbox(ds):
    xs, ys = [], []
    for d in ds:
        cur = (0.0, 0.0)
        for c, pts in parse(d):
            if c == 'Z': continue
            if c in ('C','Q'):
                for p in bezier_pts(cur, pts):
                    xs.append(p[0]); ys.append(p[1])
            else:
                for p in pts:
                    xs.append(p[0]); ys.append(p[1])
            if pts: cur = pts[-1]
    return min(xs), min(ys), max(xs), max(ys)

def fmt(v, prec=3):
    r = round(v, prec)
    return str(int(r) if r == int(r) else r)

def xform(d, sx, sy, tx, ty, prec=3):
    out = []
    for c, pts in parse(d):
        if c == 'Z': out.append('Z'); continue
        out.append(c + ' '.join('%s %s' % (fmt(x*sx+tx, prec), fmt(y*sy+ty, prec))
                                for x, y in pts))
    return ' '.join(out)

def svg(vb_w, vb_h, body, extra=''):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s"%s>%s</svg>\n'
            % (fmt(vb_w), fmt(vb_h), extra, body))

# ---------- 1. the mark ----------
mark_d = open(BUILD + 'mark32.d').read().strip()
mx0, my0, mx1, my1 = bbox([mark_d])
MW, MH = mx1-mx0, my1-my0

with open(os.path.join(OUT,'mark.svg'),'w') as f:
    d = xform(mark_d, 1, 1, -mx0, -my0)
    f.write(svg(MW, MH, '<path fill="currentColor" d="%s"/>' % d,
                ' role="img" aria-label="METRIX"'))

# ---------- 2. Latin wordmark, re-laid out horizontally ----------
# Glyphs come out of logo2.svg in a stacked 3+3 layout. Re-lay them on one
# baseline, preserving the source letter-spacing.
glyphs = open(BUILD + 'wordmark_paths.txt').read().strip().split('\n')[:6]  # M E T R I X
rows = [glyphs[:3], glyphs[3:]]
boxes = [[bbox([g]) for g in row] for row in rows]
base = [max(b[3] for b in row) for row in boxes]     # per-row baseline
gap = boxes[0][1][0] - boxes[0][0][2]                # source letter-spacing

placed, pen = [], 0.0
for ri, row in enumerate(rows):
    for gi, g in enumerate(row):
        x0, y0, x1, y1 = boxes[ri][gi]
        placed.append(xform(g, 1, 1, pen - x0, -base[ri]))   # baseline -> y=0
        pen += (x1 - x0) + gap

LX0, LY0, LX1, LY1 = bbox(placed)
LAT = dict(paths=placed, w=LX1-LX0, x0=LX0,
           ascent=-LY0, descent=LY1)                 # baseline at y = 0

# ---------- 3. wordmark ----------
def write_wordmark(M, fname, label):
    """Normalise a baseline-space wordmark to its own tight box."""
    h = M['ascent'] + M['descent']
    ps = [xform(p, 1, 1, -M['x0'], M['ascent']) for p in M['paths']]
    open(os.path.join(OUT, fname), 'w').write(
        svg(M['w'], h,
            '<g fill="currentColor">%s</g>' % ''.join('<path d="%s"/>' % p for p in ps),
            ' role="img" aria-label="%s"' % label))

write_wordmark(LAT, 'wordmark-en.svg', 'METRIX')

# ---------- 4. lockup ----------
def lockup(M, fname, label):
    CAP = 100.0
    ws = CAP / M['ascent']
    ww, wd = M['w'] * ws, M['descent'] * ws
    ms = (CAP * 1.34) / MH                 # mark height vs cap height
    mw, mh = MW * ms, MH * ms
    space = CAP * 0.40                     # optical gap
    baseline = CAP
    mark_y = baseline - CAP/2 - mh/2       # centre mark on the cap band
    # The mark is taller than the cap band, so it can sit above y=0 and below
    # the baseline. Take the union of both boxes and shift, or it gets clipped.
    top = min(mark_y, baseline - CAP)
    bottom = max(mark_y + mh, baseline + wd)
    dy = -top
    total_w, total_h = mw + space + ww, bottom - top
    mark_x, word_x = 0.0, mw + space
    body = '<g fill="currentColor">'
    body += '<path d="%s"/>' % xform(
        xform(mark_d, 1, 1, -mx0, -my0), ms, ms, mark_x, mark_y + dy)
    for p in M['paths']:
        body += '<path d="%s"/>' % xform(p, ws, ws, word_x - M['x0']*ws, baseline + dy)
    body += '</g>'
    open(os.path.join(OUT, fname), 'w').write(
        svg(total_w, total_h, body, ' role="img" aria-label="%s"' % label))
    return total_w, total_h

lw, lh = lockup(LAT, 'lockup-en.svg', 'METRIX')

# ---------- 5. icon (mark on brand ground, rounded square) ----------
def icon(fname, size, bg, fg, pad_ratio, radius_ratio, maskable=False):
    inner = size * (1 - 2*pad_ratio)
    s = inner / max(MW, MH)
    w, h = MW*s, MH*s
    tx, ty = (size-w)/2, (size-h)/2
    r = size * radius_ratio
    body = ('<rect width="%s" height="%s" rx="%s" fill="%s"/>' % (fmt(size), fmt(size), fmt(r), bg)
            if not maskable else
            '<rect width="%s" height="%s" fill="%s"/>' % (fmt(size), fmt(size), bg))
    body += '<path fill="%s" d="%s"/>' % (fg, xform(xform(mark_d,1,1,-mx0,-my0), s, s, tx, ty))
    open(os.path.join(OUT,fname),'w').write(svg(size, size, body))

icon('icon.svg',          512, BRAND, '#ffffff', 0.20, 0.2237)
icon('icon-maskable.svg', 512, BRAND, '#ffffff', 0.29, 0, maskable=True)

open(os.path.join(OUT,'favicon.svg'),'w').write(
    svg(MW, MH, '<path fill="%s" d="%s"/>' % (BRAND, xform(mark_d,1,1,-mx0,-my0))))

print("mark        %.2f x %.2f" % (MW, MH))
print("wordmark    w %.2f  ascent %.2f  descent %.2f" % (LAT['w'], LAT['ascent'], LAT['descent']))
print("lockup-en   %.2f x %.2f  ratio %.2f" % (lw, lh, lw/lh))
for f in sorted(os.listdir(OUT)):
    if os.path.isfile(os.path.join(OUT, f)):
        print("  %-22s %6d B" % (f, os.path.getsize(os.path.join(OUT, f))))
