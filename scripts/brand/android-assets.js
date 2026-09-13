/*
 * Regenerate the Capacitor Android launcher icons and splash screens from
 * public/brand/. Run after changing the mark:
 *   node scripts/brand/android-assets.js
 *
 * Every output keeps the dimensions Capacitor already generated, so this
 * replaces the default assets in place without touching the Gradle config.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const RES = 'mobile/android/app/src/main/res';
const BRAND = '#0097b2';
const CANVAS_DARK = '#060606';   // --canvas dark
const CANVAS_LIGHT = '#ffffff';  // --canvas light

const markSvg = fs.readFileSync('public/brand/mark.svg', 'utf8');
const markPath = markSvg.match(/\sd="([^"]*)"/)[1];
const vb = markSvg.match(/viewBox="([^"]*)"/)[1].split(/\s+/).map(Number);

/* The mark, scaled to `frac` of a `size` box, in `colour`, centred. */
function markLayer(size, frac, colour, bg) {
  const s = (size * frac) / Math.max(vb[2], vb[3]);
  const w = vb[2] * s, h = vb[3] * s;
  const tx = (size - w) / 2, ty = (size - h) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    (bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '') +
    `<g transform="translate(${tx} ${ty}) scale(${s})"><path d="${markPath}" fill="${colour}"/></g></svg>`
  );
}

function roundedIcon(size, radiusFrac) {
  const r = size * radiusFrac;
  const s = (size * 0.6) / Math.max(vb[2], vb[3]);
  const w = vb[2] * s, h = vb[3] * s;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${r}" fill="${BRAND}"/>` +
    `<g transform="translate(${(size-w)/2} ${(size-h)/2}) scale(${s})"><path d="${markPath}" fill="#ffffff"/></g></svg>`
  );
}

const dims = f => {
  const m = require('child_process')
    .execSync(`sips -g pixelWidth -g pixelHeight "${f}"`, { encoding: 'utf8' });
  return {
    w: +m.match(/pixelWidth:\s*(\d+)/)[1],
    h: +m.match(/pixelHeight:\s*(\d+)/)[1],
  };
};

(async () => {
  let n = 0;

  /* ---- launcher icons ---- */
  for (const d of fs.readdirSync(RES).filter(x => /^mipmap-(l|m|h|xh|xxh|xxxh)dpi$/.test(x))) {
    const dir = path.join(RES, d);
    const size = dims(path.join(dir, 'ic_launcher.png')).w;
    // The adaptive layers are a 108dp canvas, not the 48dp legacy icon, so at
    // every density they are 2.25x `size`. Sizing them from `size` writes them
    // downscaled and the launcher upscales them back — a blurry icon on every
    // Android 8+ home screen.
    const adaptive = Math.round((size * 108) / 48);
    await sharp(roundedIcon(size, 0.2237)).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(roundedIcon(size, 0.5)).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    // adaptive layers: the XML insets each by 16.7%, so the glyph is sized for
    // that — 0.82 of this canvas lands near 55% of the finished 108dp icon.
    await sharp(markLayer(adaptive, 0.82, '#ffffff', null)).png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
    await sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${adaptive}" height="${adaptive}">` +
      `<rect width="${adaptive}" height="${adaptive}" fill="${BRAND}"/></svg>`
    )).png().toFile(path.join(dir, 'ic_launcher_background.png'));
    n += 4;
    console.log(`  ${d.padEnd(16)} ${size}x${size} + ${adaptive}x${adaptive} adaptive  (4 files)`);
  }

  /* ---- splash screens: keep each existing size, swap the artwork ---- */
  for (const d of fs.readdirSync(RES).filter(x => /^drawable(-|$)/.test(x))) {
    const f = path.join(RES, d, 'splash.png');
    if (!fs.existsSync(f)) continue;
    const { w, h } = dims(f);
    const night = d.includes('night');
    const bg = night ? CANVAS_DARK : CANVAS_LIGHT;
    const fg = night ? '#ffffff' : BRAND;
    const box = Math.min(w, h);
    const s = (box * 0.26) / Math.max(vb[2], vb[3]);
    const mw = vb[2] * s, mh = vb[3] * s;
    await sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<rect width="${w}" height="${h}" fill="${bg}"/>` +
      `<g transform="translate(${(w-mw)/2} ${(h-mh)/2}) scale(${s})">` +
      `<path d="${markPath}" fill="${fg}"/></g></svg>`
    )).png().toFile(f);
    n++;
  }
  console.log(`\n${n} Android assets regenerated.`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
