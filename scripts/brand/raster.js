const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const OUT = 'public/brand';

const png = (src, size, dst) =>
  sharp(fs.readFileSync(path.join(OUT, src)), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, dst))
    .then(i => console.log(`  ${dst.padEnd(28)} ${size}x${size}  ${i.size} B`));

/* ICO is just a directory of embedded PNGs. */
function buildIco(buffers, sizes, dst) {
  const n = buffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(n, 4);
  const dir = Buffer.alloc(16 * n);
  let offset = 6 + 16 * n;
  buffers.forEach((buf, i) => {
    const s = sizes[i];
    const o = 16 * i;
    dir.writeUInt8(s >= 256 ? 0 : s, o);       // width  (0 == 256)
    dir.writeUInt8(s >= 256 ? 0 : s, o + 1);   // height
    dir.writeUInt8(0, o + 2);                  // palette
    dir.writeUInt8(0, o + 3);                  // reserved
    dir.writeUInt16LE(1, o + 4);               // colour planes
    dir.writeUInt16LE(32, o + 6);              // bits per pixel
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  fs.writeFileSync(path.join(OUT, dst), Buffer.concat([header, dir, ...buffers]));
  console.log(`  ${dst.padEnd(28)} ${sizes.join('/')}  ${fs.statSync(path.join(OUT,dst)).size} B`);
}

(async () => {
  console.log('PNG icons:');
  await png('icon.svg', 192, 'icon-192.png');
  await png('icon.svg', 512, 'icon-512.png');
  await png('icon-maskable.svg', 512, 'icon-maskable-512.png');
  await png('icon.svg', 180, 'apple-touch-icon.png');

  console.log('social card:');
  const og = await sharp(fs.readFileSync(path.join(OUT, 'og.svg')), { density: 144 })
    .resize(1200, 630).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'og.png'));
  console.log(`  og.png                       1200x630  ${og.size} B`);

  console.log('favicon.ico:');
  const sizes = [16, 32, 48];
  const bufs = [];
  for (const s of sizes) {
    bufs.push(await sharp(fs.readFileSync(path.join(OUT, 'favicon.svg')), { density: 384 })
      .resize(s, s, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
      .png({ compressionLevel: 9 }).toBuffer());
  }
  buildIco(bufs, sizes, 'favicon.ico');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
