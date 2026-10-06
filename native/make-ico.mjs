// Assemble a multi-size .ico (PNG entries) from the sized PNGs.
// ICO format: 6-byte header, N x 16-byte directory, then image blobs.
// PNG entries are valid for all sizes on Windows Vista+ (and universally
// used for 256). Node stdlib only.
import fs from 'node:fs';

const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const sizes = [16, 32, 48, 256];
const imgs = sizes.map((s) => fs.readFileSync(`${dir}/icon-${s}.png`));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);   // reserved
header.writeUInt16LE(1, 2);   // type: icon
header.writeUInt16LE(sizes.length, 4);

const entries = [];
let offset = 6 + 16 * sizes.length;
imgs.forEach((img, i) => {
  const e = Buffer.alloc(16);
  const s = sizes[i];
  e[0] = s >= 256 ? 0 : s;    // width (0 = 256)
  e[1] = s >= 256 ? 0 : s;    // height
  e[2] = 0;                   // palette
  e[3] = 0;                   // reserved
  e.writeUInt16LE(1, 4);      // color planes
  e.writeUInt16LE(32, 6);     // bits per pixel
  e.writeUInt32LE(img.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += img.length;
  entries.push(e);
});

const ico = Buffer.concat([header, ...entries, ...imgs]);
fs.writeFileSync(`${dir}app.ico`, ico);
console.log(`app.ico written: ${ico.length} bytes (${sizes.length} sizes)`);
