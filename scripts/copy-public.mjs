import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only media selected in the JSON belongs to the exported portfolio.
// Draft files may remain in public/media/ without entering dist/.
const sourceRoot = fileURLToPath(new URL('../public/', import.meta.url));
const outputRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const content = JSON.parse(await readFile(resolve(sourceRoot, 'portfolio.json'), 'utf8'));
const selected = new Set(['portfolio.json', 'portfolio.schema.json', 'favicon.svg', 'manrope-license.txt', content.profile.heroImage, 'media/placeholders/atlas.svg']);
for (const image of content.profile.heroImages ?? []) selected.add(image.src);
for (const project of content.projects) {
  selected.add(project.cover);
  for (const media of project.media) {
    selected.add(media.src);
    selected.add(media.poster);
    for (const track of media.tracks ?? []) selected.add(track.src);
  }
}

let count = 0;
for (const path of selected) {
  if (!path || /^https?:\/\//i.test(path)) continue;
  const from = resolve(sourceRoot, path);
  const safePath = relative(sourceRoot, from);
  if (safePath.startsWith('..') || isAbsolute(safePath)) throw new Error(`Media path must stay inside public/: ${path}`);
  const to = resolve(outputRoot, safePath);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  count++;
}
console.log(`Exported ${count} selected public files. Unreferenced draft media stays local.`);
