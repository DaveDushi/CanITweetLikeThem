import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const creatorsDir = path.join(root, 'data', 'creators');

const files = (await readdir(creatorsDir)).filter((f) => f.endsWith('.json'));
const missing = [];

for (const file of files) {
  const creator = JSON.parse(await readFile(path.join(creatorsDir, file), 'utf8'));
  if (!creator.links?.X && !creator.links?.x) {
    missing.push(`${file}: no links.X (profile pics are pulled live from X)`);
  }
}

if (missing.length > 0) {
  console.error(
    'Every creator needs links.X so their profile pic can be pulled live from X:\n' +
      missing.map((m) => `  - ${m}`).join('\n'),
  );
  process.exit(1);
}

console.log(`creators ok: ${files.length} checked, all have links.X`);
