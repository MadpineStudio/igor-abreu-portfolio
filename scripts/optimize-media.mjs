import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Original recordings are never modified. This is safe to resume after a completed run.
const source = fileURLToPath(new URL('../public/media/final/', import.meta.url));
const destination = fileURLToPath(new URL('../public/media/optimized/', import.meta.url));
const reportPath = fileURLToPath(new URL('../media-report.json', import.meta.url));
await mkdir(destination, { recursive: true });
let previous = { files: [] };
try { previous = JSON.parse(await readFile(reportPath, 'utf8')); } catch { /* First run. */ }

function run(command, args, progressLabel = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', error = '', progress = '', lastUpdate = Date.now();
    child.stdout.on('data', chunk => {
      if (!progressLabel) { output += chunk; return; }
      progress += chunk;
      if (Date.now() - lastUpdate > 30000) {
        const time = [...progress.matchAll(/out_time=([^\r\n]+)/g)].at(-1)?.[1];
        const speed = [...progress.matchAll(/speed=([^\r\n]+)/g)].at(-1)?.[1];
        console.log(`${progressLabel}: ${time ?? 'encoding'} (${speed?.trim() ?? 'working'})`);
        progress = ''; lastUpdate = Date.now();
      }
    });
    child.stderr.on('data', chunk => { error = (error + chunk).slice(-12000); });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(`${command} failed (${code}): ${error}`)));
  });
}

const probe = async path => JSON.parse(await run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path]));
const files = (await readdir(source)).filter(name => /\.mp4$/i.test(name)).sort();
const results = [];
let writeQueue = Promise.resolve();
async function saveReport() {
  writeQueue = writeQueue.then(async () => {
    const merged = new Map(previous.files.map(item => [item.source, item]));
    for (const item of results) merged.set(item.source, item);
    const list = [...merged.values()].filter(item => files.includes(item.source)).sort((a, b) => a.source.localeCompare(b.source));
    const inputBytes = list.reduce((sum, item) => sum + item.inputBytes, 0);
    const outputBytes = list.reduce((sum, item) => sum + item.outputBytes, 0);
    await writeFile(reportPath, JSON.stringify({ codec: 'H.264', settings: 'CRF 23 / slow; dense gameplay capped at 3 Mbps; original resolution and frame rate; no audio; faststart', inputBytes, outputBytes, reductionPercent: +(100 * (1 - outputBytes / inputBytes)).toFixed(1), files: list }, null, 2) + '\n');
  });
  return writeQueue;
}

async function optimize(name) {
  const input = join(source, name);
  const inputStat = await stat(input);
  const outputName = basename(name, '.mp4').replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase() + '.mp4';
  const output = join(destination, outputName);
  const cached = previous.files.find(item => item.source === name && item.inputBytes === inputStat.size && item.sourceModified === inputStat.mtimeMs);
  let replaceManagedOutput = false;
  if (cached) {
    try {
      const outputStat = await stat(output);
      if (outputStat.size === cached.outputBytes) {
        const needsDenserEncoding = cached.mode === 'compressed' && (outputStat.size / inputStat.size > .8 || outputStat.size > 23000000);
        if (!needsDenserEncoding) { results.push(cached); console.log(`Reuse: ${name}`); await saveReport(); return; }
        replaceManagedOutput = true;
      }
    } catch { /* Recreate missing managed output. */ }
  }
  if (!replaceManagedOutput) {
    try { await stat(output); throw new Error(`Output already exists without a matching report: ${output}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }

  const before = await probe(input);
  const video = before.streams.find(stream => stream.codec_type === 'video');
  const bitrate = Number(video.bit_rate ?? before.format.bit_rate);
  const alreadyCompressed = video.codec_name === 'h264' && (/(?:^|[_-])comp(?:[_.-]|$)/i.test(name) || bitrate < 1500000);
  const common = ['-hide_banner', '-loglevel', 'error', '-n', '-i', input, '-map', '0:v:0', '-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1'];
  const encoding = alreadyCompressed ? ['-c:v', 'copy'] : ['-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-maxrate', '3000k', '-bufsize', '6000k', '-threads', '8', '-pix_fmt', 'yuv420p'];
  const temporary = output.replace(/\.mp4$/, '.partial.mp4');
  console.log(`${alreadyCompressed ? 'Remux, no recompression' : 'Compress'}: ${name}`);
  await run('ffmpeg', [...common, ...encoding, '-movflags', '+faststart', '-progress', 'pipe:1', '-stats_period', '5', temporary], name);
  let outputStat = await stat(temporary);
  let mode = alreadyCompressed ? 'remux' : 'compressed';
  // Keep the original encoded stream if a more complex clip would become larger.
  if (!alreadyCompressed && outputStat.size >= inputStat.size) {
    const fallback = output.replace(/\.mp4$/, '.remux.mp4');
    await run('ffmpeg', [...common, '-c:v', 'copy', '-movflags', '+faststart', fallback]);
    await rename(fallback, output);
    await unlink(temporary);
    mode = 'remux-smaller';
  } else await rename(temporary, output);

  const after = await probe(output);
  const finalVideo = after.streams.find(stream => stream.codec_type === 'video');
  if (after.streams.some(stream => stream.codec_type === 'audio')) throw new Error(`Audio remains in ${outputName}`);
  if (finalVideo.width !== video.width || finalVideo.height !== video.height || finalVideo.avg_frame_rate !== video.avg_frame_rate) throw new Error(`Video properties changed unexpectedly: ${outputName}`);
  if (Math.abs(Number(after.format.duration) - Number(before.format.duration)) > .1) throw new Error(`Duration changed: ${outputName}`);
  outputStat = await stat(output);
  results.push({ source: name, output: `media/optimized/${outputName}`, mode, inputBytes: inputStat.size, outputBytes: outputStat.size, sourceModified: inputStat.mtimeMs, duration: Number(after.format.duration), width: finalVideo.width, height: finalVideo.height, fps: finalVideo.avg_frame_rate, audioStreams: 0 });
  await saveReport();
  console.log(`Done: ${name} ${(inputStat.size / 1e6).toFixed(2)} MB -> ${(outputStat.size / 1e6).toFixed(2)} MB (${mode})`);
}

// Two encodes at a time, with enough CPU left for the portfolio preview.
let next = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < files.length) { const name = files[next++]; await optimize(name); }
}));
console.log(`Finished: ${results.length} silent videos. Report: media-report.json`);
