import fs from 'node:fs';

/**
 * Read and parse a JSON file, tolerating a UTF-8 BOM — common when configs
 * are saved by Windows editors (Notepad). JSON.parse chokes on \uFEFF.
 */
export function readJsonFile(file) {
  let raw = fs.readFileSync(file, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}
