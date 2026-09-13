"""Flatten the nested <g transform> tree in logo2.svg and emit the METRIX
wordmark glyph outlines as a single normalised path set."""
import re, sys, os
os.makedirs('scripts/brand/.build', exist_ok=True)

SRC = 'public/brand/source/logo-stacked.svg'
s = open(SRC).read()
body = s[s.index('</defs>'):]

def parse_transform(t):
    """Return (a,b,c,d,e,f) for matrix(...) / translate(...) / scale(...)."""
    m = re.match(r'matrix\(([^)]*)\)', t)
    if m:
        v = [float(x) for x in re.split(r'[,\s]+', m.group(1).strip())]
        return tuple(v)
    m = re.match(r'translate\(([^)]*)\)', t)
    if m:
        v = [float(x) for x in re.split(r'[,\s]+', m.group(1).strip())]
        return (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0)
    m = re.match(r'scale\(([^)]*)\)', t)
    if m:
        v = [float(x) for x in re.split(r'[,\s]+', m.group(1).strip())]
        sx = v[0]; sy = v[1] if len(v) > 1 else sx
        return (sx, 0, 0, sy, 0, 0)
    return (1, 0, 0, 1, 0, 0)

def mul(m1, m2):
    a1,b1,c1,d1,e1,f1 = m1; a2,b2,c2,d2,e2,f2 = m2
    return (a1*a2 + c1*b2, b1*a2 + d1*b2,
            a1*c2 + c1*d2, b1*c2 + d1*d2,
            a1*e2 + c1*f2 + e1, b1*e2 + d1*f2 + f1)

def apply(m, x, y):
    a,b,c,d,e,f = m
    return (a*x + c*y + e, b*x + d*y + f)

# Walk the body, maintaining a transform stack.
tokens = re.findall(r'<g[^>]*>|</g>|<path[^>]*/>', body)
stack = [(1,0,0,1,0,0)]
glyphs = []
for t in tokens:
    if t.startswith('</g'):
        stack.pop()
    elif t.startswith('<g'):
        tm = re.search(r'transform="([^"]*)"', t)
        cur = stack[-1]
        stack.append(mul(cur, parse_transform(tm.group(1))) if tm else cur)
    elif t.startswith('<path'):
        d = re.search(r'\sd="([^"]*)"', t)
        if d:
            glyphs.append((stack[-1], d.group(1)))

print("glyph paths found: %d" % len(glyphs), file=sys.stderr)

# transform each path's coordinates
def xform_path(m, d):
    toks = re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?', d)
    out, i, cmd = [], 0, None
    def f(v):
        r = round(v, 3)
        return str(int(r) if r == int(r) else r)
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd == 'Z':
                out.append('Z'); continue
        n = {'M':1,'L':1,'C':3,'Q':2,'S':2,'T':1}.get(cmd)
        if n is None:
            raise SystemExit('unsupported cmd %r in wordmark' % cmd)
        pts = []
        for j in range(n):
            x, y = float(toks[i]), float(toks[i+1]); i += 2
            pts.append(apply(m, x, y))
        out.append(cmd + ' '.join('%s %s' % (f(x), f(y)) for x, y in pts))
    return ' '.join(out)

paths = [xform_path(m, d) for m, d in glyphs]
open('scripts/brand/.build/wordmark_paths.txt','w').write('\n'.join(paths))
print("written %d transformed paths" % len(paths), file=sys.stderr)
for p in paths[:2]:
    print("  ", p[:120], file=sys.stderr)
