import { spawn } from 'node:child_process';
import { open, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const publicDirectory = new URL('../public/', import.meta.url);
const report = JSON.parse(await readFile(new URL('../media-report.json', import.meta.url), 'utf8'));
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', error = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { error += data; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
  });
}
async function topLevelBoxes(path) {
  const file = await open(path, 'r');
  try {
    const { size } = await file.stat();
    let offset = 0;
    const boxes = [];
    while (offset < size) {
      const buffer = Buffer.alloc(16);
      await file.read(buffer, 0, 16, offset);
      let length = buffer.readUInt32BE(0);
      boxes.push(buffer.toString('ascii', 4, 8));
      if (length === 1) length = Number(buffer.readBigUInt64BE(8));
      if (length === 0) break;
      assert.ok(length >= 8, 'valid MP4 box');
      offset += length;
    }
    return boxes;
  } finally { await file.close(); }
}

let next = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < report.files.length) {
    const entry = report.files[next++];
    const source = fileURLToPath(new URL(`media/final/${entry.source}`, publicDirectory));
    const target = fileURLToPath(new URL(entry.output, publicDirectory));
    const probeArgs = ['-v', 'error', '-threads', '4', '-count_frames', '-show_streams', '-show_format', '-of', 'json'];
    const [before, after] = await Promise.all([run('ffprobe', [...probeArgs, source]).then(JSON.parse), run('ffprobe', [...probeArgs, target]).then(JSON.parse)]);
    const sourceVideo = before.streams.find(stream => stream.codec_type === 'video');
    const video = after.streams.find(stream => stream.codec_type === 'video');
    assert.equal(after.streams.filter(stream => stream.codec_type === 'audio').length, 0);
    assert.equal(video.width, sourceVideo.width);
    assert.equal(video.height, sourceVideo.height);
    assert.equal(video.avg_frame_rate, sourceVideo.avg_frame_rate);
    // OBS container counts can include a preroll frame excluded by the MP4 edit list.
    // Compare decoded frames actually presented to the viewer instead.
    assert.equal(video.nb_read_frames, sourceVideo.nb_read_frames);
    assert.equal(video.codec_name, 'h264');
    assert.equal(video.pix_fmt, 'yuv420p');
    const boxes = await topLevelBoxes(target);
    assert.ok(boxes.indexOf('moov') >= 0 && boxes.indexOf('moov') < boxes.indexOf('mdat'), `${entry.source}: faststart`);
    await run('ffmpeg', ['-hide_banner', '-v', 'error', '-xerror', '-threads', '4', '-i', target, '-map', '0:v:0', '-f', 'null', '-']);
    if (entry.mode === 'remux') {
      const hashArgs = ['-v', 'error', '-map', '0:v:0', '-c:v', 'copy', '-f', 'streamhash', '-hash', 'sha256', '-'];
      const [a, b] = await Promise.all([run('ffmpeg', ['-i', source, ...hashArgs]), run('ffmpeg', ['-i', target, ...hashArgs])]);
      assert.equal(a, b, 'already-compressed video stream must remain identical');
    }
    console.log(`Verified: ${entry.source} — no audio, same frames, faststart, full decode OK${entry.mode === 'remux' ? ', video bitstream unchanged' : ''}`);
  }
}));
console.log(JSON.stringify({ files: report.files.length, inputMB: +(report.inputBytes / 1e6).toFixed(2), outputMB: +(report.outputBytes / 1e6).toFixed(2), reductionPercent: report.reductionPercent }));
