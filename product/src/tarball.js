import zlib from 'node:zlib';

/**
 * Minimal tar.gz (ustar + pax/GNU long-name) extractor — pure Node, zero
 * dependencies (zlib is built in). Needed because system tar is not
 * portable: GNU tar on Windows interprets "C:\..." as a remote host.
 *
 * Returns [{ path, data }] for regular files only, in archive order.
 * Limitations (documented, acceptable for npm tarballs): no hardlinks,
 * symlinks are skipped (bin entries in npm tarballs are regular files),
 * only the first 512 KB per file is kept.
 */

const MAX_MEMBER = 512 * 1024;
// decompression-bomb guard: refuse archives that unpack beyond this (review 34)
const MAX_TOTAL = 64 * 1024 * 1024;

export function extractTgz(buffer) {
  const tar = zlib.gunzipSync(buffer);
  if (tar.length > MAX_TOTAL) throw new Error('tarball unpacks beyond the size cap');
  const files = [];
  let off = 0;
  let seen = 0;
  let pendingName = null; // from pax 'x' or GNU 'L' records

  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break; // end-of-archive block

    const size = parseOctal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    let name = str(header, 0, 100);
    const prefix = str(header, 345, 155);
    if (prefix) name = `${prefix}/${name}`;

    const dataStart = off + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) break; // truncated archive

    if (type === 'L') { // GNU long name: the next entry's real name
      pendingName = str(tar, dataStart, size).replace(/\0.*$/s, '');
    } else if (type === 'x' || type === 'X') { // pax header: look for path=
      const pax = str(tar, dataStart, Math.min(size, 8192));
      const m = pax.match(/(?:^|\n)\d+ path=([^\n]+)/);
      if (m) pendingName = m[1];
    } else if (type === '0' || type === 48 || type === '\0') { // regular file
      const finalName = pendingName ?? name;
      pendingName = null;
      const keep = Math.min(size, MAX_MEMBER);
      files.push({ path: finalName.replace(/^\.\//, ''), data: tar.subarray(dataStart, dataStart + keep) });
      seen += keep;
      if (seen > MAX_TOTAL) throw new Error('tarball unpacks beyond the size cap');
    } else {
      pendingName = null; // dir ('5'), symlink ('2'), etc: skip
    }

    off = dataStart + Math.ceil(size / 512) * 512;
  }
  return files;
}

function parseOctal(buf, start, len) {
  const s = str(buf, start, len).trim();
  if (!s) return 0;
  const n = parseInt(s.replace(/[^0-7]/g, ''), 8);
  return Number.isNaN(n) ? 0 : n;
}

function str(buf, start, len) {
  const slice = buf.subarray(start, start + len);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8');
}
