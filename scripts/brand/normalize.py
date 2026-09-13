"""Extract the METRIX star from the original logo.svg clip path and re-emit it
as a tight, normalised, currentColor path. Geometry is preserved exactly;
only the coordinate space changes."""
import re, sys

def tokenize(d):
    return re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?', d)

def parse(d):
    toks, i, out, cur, start = tokenize(d), 0, [], (0.0, 0.0), (0.0, 0.0)
    cmd = None
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
        if cmd in ('M', 'L'):
            x, y = float(toks[i]), float(toks[i+1]); i += 2
            out.append((cmd, [(x, y)])); cur = (x, y)
            if cmd == 'M': start = cur
        elif cmd == 'C':
            pts = [(float(toks[i+j*2]), float(toks[i+j*2+1])) for j in range(3)]; i += 6
            out.append(('C', pts)); cur = pts[-1]
        elif cmd == 'Z':
            out.append(('Z', [])); cur = start
        else:
            raise SystemExit('unsupported command %r' % cmd)
    return out

def bezier_pts(p0, p1, p2, p3, n=64):
    for k in range(n + 1):
        t = k / n; u = 1 - t
        yield (u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
               u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1])

def bbox(cmds):
    xs, ys, cur = [], [], (0.0, 0.0)
    for c, pts in cmds:
        if c in ('M', 'L'):
            xs.append(pts[0][0]); ys.append(pts[0][1]); cur = pts[0]
        elif c == 'C':
            for p in bezier_pts(cur, *pts):
                xs.append(p[0]); ys.append(p[1])
            cur = pts[-1]
    return min(xs), min(ys), max(xs), max(ys)

def emit(cmds, sx, sy, tx, ty, prec=3):
    def f(v):
        r = round(v, prec)
        r = int(r) if r == int(r) else r
        return str(r)
    parts, cur = [], None
    for c, pts in cmds:
        if c == 'Z':
            parts.append('Z'); continue
        coords = ' '.join('%s %s' % (f(x*sx + tx), f(y*sy + ty)) for x, y in pts)
        parts.append(('' if cur == c and c != 'M' else c) + coords)
        cur = c
    return ' '.join(parts).replace('  ', ' ')

src = open(sys.argv[1]).read()
cmds = parse(src)
x0, y0, x1, y1 = bbox(cmds)
w, h = x1 - x0, y1 - y0
SIZE = float(sys.argv[2]) if len(sys.argv) > 2 else 32.0
s = SIZE / max(w, h)
# centre the mark in a square box
tx = -x0*s + (SIZE - w*s)/2
ty = -y0*s + (SIZE - h*s)/2
print('SOURCE bbox  x %.3f..%.3f  y %.3f..%.3f   (%.3f x %.3f, ratio %.4f)'
      % (x0, x1, y0, y1, w, h, w/h), file=sys.stderr)
print('OUTPUT box   %g x %g   scale %.6f' % (SIZE, SIZE, s), file=sys.stderr)
print(emit(cmds, s, s, tx, ty))
