// verify-gif.js — pixel-level checks on demo-drift.gif
// run after make-gif.js, from the same directory: node verify-gif.js
const sharp = require('sharp');
const fs = require('fs');

const near = (px, hex, tol = 40) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return Math.abs(px[0] - r) <= tol && Math.abs(px[1] - g) <= tol && Math.abs(px[2] - b) <= tol;
};

(async () => {
  const gif = 'demo-drift.gif';
  const meta = await sharp(gif).metadata();
  console.log(`pages=${meta.pages} size=${meta.width}x${meta.height} format=${meta.format}`);

  const buf = fs.readFileSync(gif);
  const delays = [];
  let pos = 13; // after header + LSD (no GCT flag assumed; scan raw)
  while (pos < buf.length - 1) {
    if (buf[pos] === 0x21 && buf[pos + 1] === 0xf9) delays.push(buf[pos + 4] | (buf[pos + 5] << 8));
    pos++;
  }
  console.log(`graphic-control blocks=${delays.length} delays(ms)=${delays.join(',')}`);

  // analyze final frame and first frame
  for (const page of [0, 11, 12]) {
    const { data, info } = await sharp(gif, { page }).raw().toBuffer({ resolveWithObject: true });
    let red = 0, yel = 0, grn = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        const px = [data[i], data[i + 1], data[i + 2]];
        if (near(px, '#ff7b72')) red++;
        else if (near(px, '#d29922')) yel++;
        else if (near(px, '#3fb950')) grn++;
        if (!(near(px, '#0d1117', 12))) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    console.log(`frame[${page}] red=${red} yellow=${yel} green=${grn} bbox x:[${minX},${maxX}] y:[${minY},${maxY}]`);
  }

  const last = await sharp(gif, { page: meta.pages - 1 }).raw().toBuffer({ resolveWithObject: true });
  // bottom-line check: any non-bg pixels with y >= 640 (fin line baseline 668)
  let bottom = 0;
  for (let y = 640; y < last.info.height; y++)
    for (let x = 0; x < last.info.width; x++) {
      const i = (y * last.info.width + x) * last.info.channels;
      if (!(near([last.data[i], last.data[i + 1], last.data[i + 2]], '#0d1117', 12))) bottom++;
    }
  console.log(`final frame: non-bg pixels below y=640: ${bottom} ${bottom > 200 ? '(DRIFT DETECTED line present ✓)' : '(MISSING — cropped!)'}`);
})().catch((e) => { console.error(e); process.exit(1); });
