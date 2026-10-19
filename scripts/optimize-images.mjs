import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const [inputArgument, collection] = process.argv.slice(2);
if (!inputArgument || !/^[a-z0-9-]+$/.test(collection ?? '')) {
  throw new Error('Usage: node scripts/optimize-images.mjs <input-directory> <collection-slug>');
}
const input = resolve(inputArgument);
const output = resolve(root, 'public/media/images', collection);
const previews = resolve(output, 'previews');
await mkdir(previews, { recursive: true });
const names = (await readdir(input)).filter(name => /\.(png|jpe?g|webp)$/i.test(name)).sort();
if (!names.length) throw new Error('No supported images found.');
const reportPath = resolve(root, 'image-report.json');
let report;
try { report = JSON.parse(await readFile(reportPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; report = { collections: {} }; }
const previousFiles = report.collections[collection]?.files ?? [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const probe = async path => JSON.parse((await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,pix_fmt', '-of', 'json', path])).stdout).streams[0];
const pixels = async path => (await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'md5', '-'])).stdout.trim();
let cursor = 0;
let completed = 0;
const records = new Array(names.length);
const usedNames = new Set();
await Promise.all(Array.from({ length: 3 }, async () => {
  while (cursor < names.length) {
    const index = cursor++;
    const name = names[index];
    const source = resolve(input, name);
    const bytes = await readFile(source);
    const sourceHash = hash(bytes);
    const stem = basename(name, extname(name)).replace(/^Captura de tela\s+/i, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!stem || usedNames.has(stem)) throw new Error(`Duplicate output name: ${name}`);
    usedNames.add(stem);
    const src = `media/images/${collection}/${stem}.webp`;
    const poster = `media/images/${collection}/previews/${stem}.webp`;
    const fullPath = resolve(root, 'public', src);
    const previewPath = resolve(root, 'public', poster);
    const previous = previousFiles.find(file => file.source === name && file.sourceHash === sourceHash);
    if (previous && await stat(fullPath).catch(() => null) && await stat(previewPath).catch(() => null)
      && hash(await readFile(fullPath)) === previous.outputHash && hash(await readFile(previewPath)) === previous.previewHash) {
      records[index] = previous;
    } else {
      const original = await probe(source);
      if (/48|64|16le|16be/.test(original.pix_fmt)) throw new Error(`High bit-depth image requires a different export format: ${name}`);
      const originalPixels = await pixels(source);
      const existingPixels = await stat(fullPath).then(() => pixels(fullPath)).catch(() => null);
      if (existingPixels !== originalPixels) {
        await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-map_metadata', '-1', '-frames:v', '1', '-c:v', 'libwebp', '-lossless', '1', '-compression_level', '4', '-q:v', '75', '-pix_fmt', 'bgra', fullPath]);
      }
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-map_metadata', '-1', '-vf', 'scale=w=min(960\\,iw):h=-1:flags=lanczos', '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '90', '-compression_level', '6', previewPath]);
      const optimized = await probe(fullPath);
      const optimizedPixels = await pixels(fullPath);
      if (original.width !== optimized.width || original.height !== optimized.height || originalPixels !== optimizedPixels) throw new Error(`Lossless verification failed: ${name}`);
      const fullBytes = await readFile(fullPath);
      const previewBytes = await readFile(previewPath);
      records[index] = { source: name, sourceHash, src, poster, width: original.width, height: original.height, inputBytes: bytes.length, outputBytes: fullBytes.length, previewBytes: previewBytes.length, losslessVerified: true, outputHash: hash(fullBytes), previewHash: hash(previewBytes) };
    }
    completed++;
    if (completed % 10 === 0 || completed === names.length) console.log(`${collection}: ${completed}/${names.length} verified`);
  }
}));
const inputBytes = records.reduce((total, file) => total + file.inputBytes, 0);
const outputBytes = records.reduce((total, file) => total + file.outputBytes, 0);
const previewBytes = records.reduce((total, file) => total + file.previewBytes, 0);
report.collections[collection] = { format: 'WebP', fullImages: 'Lossless, original resolution; decoded RGBA pixels verified', previews: 'Maximum width 960px, quality 90; no upscaling', inputBytes, outputBytes, previewBytes, files: records };
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ collection, images: records.length, inputBytes, outputBytes, previewBytes, reductionPercent: +(100 * (1 - outputBytes / inputBytes)).toFixed(1) }));
