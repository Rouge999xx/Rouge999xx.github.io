// Render both videos into out/. `node render.mjs stills` renders two frames per scene for review,
// `node render.mjs posters` renders the caption-free cover images used on the site.
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import path from 'node:path';

const timing = JSON.parse(fs.readFileSync('src/timing.json', 'utf8'));
const OUTRO = {flowauto: 0, services: 2.5}; // keep in sync with src/theme.ts
const browserExecutable = process.env.REMOTION_BROWSER || undefined;
const mode = process.argv[2] ?? 'video';
const only = process.argv[3];
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
fs.mkdirSync('out', {recursive: true});

const videos = {FlowAuto: 'flowauto', Services: 'services'};
for (const [id, key] of Object.entries(videos)) {
  if (only && only !== id) continue;
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  if (mode === 'posters') {
    // Caption-free cover image for the site's video card, taken from the second scene.
    const first = Math.ceil((0.6 + timing[key][0].seconds + 0.7) * 30);
    const second = Math.ceil((0.6 + timing[key][1].seconds + 0.7) * 30);
    const posterComp = await selectComposition({serveUrl, id, inputProps: {captions: false}, browserExecutable});
    await renderStill({
      serveUrl,
      composition: posterComp,
      inputProps: {captions: false},
      frame: first + Math.round(second * 0.85),
      output: `out/${key === 'flowauto' ? 'flow-auto' : 'intro'}.jpg`,
      imageFormat: 'jpeg',
      jpegQuality: 88,
      browserExecutable,
    });
    console.log(`${id}: poster done`);
  } else if (mode === 'stills') {
    let from = 0;
    for (const [i, l] of timing[key].entries()) {
      const outro = i === timing[key].length - 1 ? OUTRO[key] : 0;
      const dur = Math.ceil((0.6 + l.seconds + 0.7 + outro) * 30);
      for (const f of process.env.STILL_AT ? process.env.STILL_AT.split(',').map(Number) : [0.35, 0.8]) {
        const frame = from + Math.round(dur * f);
        await renderStill({serveUrl, composition, frame, output: `out/stills/${id}-${l.id}-${f}.jpg`, imageFormat: 'jpeg', browserExecutable});
      }
      from += dur;
    }
    console.log(`${id}: stills done`);
  } else {
    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      crf: 20,
      audioBitrate: '192k',
      outputLocation: `out/${key === 'flowauto' ? 'flow-auto' : 'intro'}.mp4`,
      browserExecutable,
      concurrency: 4,
      onProgress: ({progress}) => process.stdout.write(`\r${id} ${(progress * 100).toFixed(0)}%   `),
    });
    console.log(`\n${id}: done`);
    if (key === 'services') master('out/intro.mp4');
  }
}

/** Two-pass EBU R128 loudness normalisation to -16 LUFS / -1.5 dBTP (web video level); the video stream is copied untouched. */
function master(file) {
  const tmp = file.replace(/\.mp4$/, '.raw.mp4');
  if (fs.existsSync(file)) fs.renameSync(file, tmp);
  // loudnorm prints its measurement JSON on stderr.
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const m = JSON.parse(probe.slice(probe.lastIndexOf('{'), probe.lastIndexOf('}') + 1));
  const af = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', tmp, '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', file]);
  fs.rmSync(tmp);
  console.log(`${file}: mastered (was ${m.input_i} LUFS)`);
}
