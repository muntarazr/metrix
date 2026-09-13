"""Shape a string with HarfBuzz and convert the run to SVG outlines.

    shape.py <font.ttf> <text> [direction] [script]

The baseline lands at y=0 and the outline is flipped into SVG's y-down space.
"""
import sys, os
os.makedirs('scripts/brand/.build', exist_ok=True)
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

FONT = sys.argv[1]
TEXT = sys.argv[2]
DIRECTION = sys.argv[3] if len(sys.argv) > 3 else 'ltr'
SCRIPT = sys.argv[4] if len(sys.argv) > 4 else 'Latn'

with open(FONT, 'rb') as fh:
    data = fh.read()

face = hb.Face(data)
font = hb.Font(face)
upem = face.upem
font.scale = (upem, upem)

buf = hb.Buffer()
buf.add_str(TEXT)
buf.direction = DIRECTION
buf.script = SCRIPT
buf.language = 'ar' if SCRIPT == 'Arab' else 'en'
# Let HarfBuzz pick positional forms itself; forcing init/medi/fina/isol on
# together defeats contextual selection.
hb.shape(font, buf)

infos, poss = buf.glyph_infos, buf.glyph_positions
tt = TTFont(FONT)
glyphset = tt.getGlyphSet()
order = tt.getGlyphOrder()

print("shaped %d glyphs (upem=%d)" % (len(infos), upem), file=sys.stderr)

paths, x, y = [], 0.0, 0.0
for inf, pos in zip(infos, poss):
    name = order[inf.codepoint]
    # Flip Y: font space is y-up, SVG is y-down. The offset must flip with it —
    # a positive y_offset raises a combining mark, i.e. DECREASES svg y. Adding
    # it unflipped pushes shadda/hamza the wrong way (or off the glyph).
    t = Transform(1, 0, 0, -1, x + pos.x_offset, -(y + pos.y_offset))
    pen = SVGPathPen(glyphset)
    glyphset[name].draw(TransformPen(pen, t))
    d = pen.getCommands()
    if d.strip():
        paths.append(d)
    print("   %-16s adv=%-7s off=(%s,%s)" % (name, pos.x_advance, pos.x_offset, pos.y_offset),
          file=sys.stderr)
    x += pos.x_advance
    y += pos.y_advance

print("total advance: %.1f  (%.3f em)" % (x, x / upem), file=sys.stderr)
open(os.environ.get('SHAPE_OUT', 'scripts/brand/.build/shaped.txt'), 'w').write('\n'.join(paths))
print("wrote %d outline paths" % len(paths), file=sys.stderr)
