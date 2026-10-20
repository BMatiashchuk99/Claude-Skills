#!/usr/bin/env node
// Frame-accurate renderer: opens the player in headless Chromium, seeks to every
// frame, screenshots it and pipes the frames into FFmpeg.
//
//   node render.mjs <timeline.json> --out video.mp4 [--project DIR] [--workers 4] [--scale 1]
//   node render.mjs <timeline.json> --stills DIR [--times 0.5,2,4.2]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, '..');

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) a[key] = true;
      else { a[key] = next; i++; }
    } else a._.push(k);
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (process.env.MS_DEMO === '1') {
  // hide folders (user names) and browser noise in the console, for clean screen recordings
  const DIRS = /[A-Za-z]:[\\/](?:[^\\/\n"]*[\\/])+|\/(?:home|Users|sessions|root|tmp)\/(?:[^/\n"]*\/)+/g;
  const strip = (x) => String(x).replace(DIRS, '');
  const ol = console.log.bind(console), oe = console.error.bind(console);
  console.log = (...a) => { const m = a.map(strip).join(' '); if (!m.startsWith('[page]')) ol(m); };
  console.error = (...a) => { const m = a.map(strip).join(' '); if (!m.startsWith('[page]')) oe(m); };
}
const timelinePath = path.resolve(args._[0] || '');
if (!args._[0] || !fs.existsSync(timelinePath)) {
  console.error('usage: node render.mjs <timeline.json> --out video.mp4 | --stills DIR');
  process.exit(2);
}
const projectDir = path.resolve(args.project || path.dirname(path.dirname(timelinePath)));
const tl = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
const { width: W, height: H, fps } = tl.format;
const scale = Number(args.scale || 1);
const totalFrames = Math.round(tl.duration * fps);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

function safeJoin(root, rel) {
  const p = path.resolve(root, '.' + path.sep + decodeURIComponent(rel));
  return p.startsWith(path.resolve(root)) ? p : null;
}

function startServer() {
  const threeFile = path.join(here, 'node_modules', 'three', 'build', 'three.module.js');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = null;
    if (url.pathname === '/vendor/three.module.js') file = threeFile;
    else if (url.pathname.startsWith('/vendor/three/')) file = safeJoin(path.join(here, 'node_modules', 'three'), url.pathname.slice('/vendor/three/'.length));
    else if (url.pathname.startsWith('/runtime/')) file = safeJoin(path.join(skillDir, 'runtime'), url.pathname.slice('/runtime/'.length));
    else if (url.pathname.startsWith('/project/')) file = safeJoin(projectDir, url.pathname.slice('/project/'.length));
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function launch() {
  const opts = {
    headless: true,
    // MS_GPU=1 (build.py --gpu): use the real GPU through ANGLE instead of software SwiftShader
    args: process.env.MS_GPU === '1'
      ? [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=default', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-web-security', '--font-render-hinting=none', '--hide-scrollbars']
      : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-web-security', '--font-render-hinting=none', '--hide-scrollbars'],
  };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  try {
    return await chromium.launch(opts);
  } catch (e) {
    // fall back to an installed Google Chrome / Edge before giving up
    for (const channel of ['chrome', 'msedge']) {
      try {
        return await chromium.launch({ ...opts, channel });
      } catch {}
    }
    console.error('\nCould not start Chromium. Run this once in the scripts folder:\n  npx playwright install chromium\n(or set CHROME_PATH to your Chrome/Chromium binary)\n');
    throw e;
  }
}

async function openPlayer(browser, port) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  const rel = path.relative(projectDir, timelinePath).split(path.sep).join('/');
  await page.goto(`http://127.0.0.1:${port}/runtime/player.html?timeline=/project/${rel}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('Player failed to start:\n' + err);
  return page;
}

async function frameAt(page, t, type = 'jpeg') {
  await page.evaluate((tt) => window.player.seek(tt), t);
  return page.screenshot(type === 'png' ? { type: 'png' } : { type: 'jpeg', quality: 94 });
}

// MS_NVENC=1 (build.py --nvenc): NVIDIA hardware encoder when it actually works on this machine
let codecCache = null;
function videoCodec() {
  if (codecCache) return codecCache;
  const x264 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17'];
  codecCache = x264;
  if (process.env.MS_NVENC === '1') {
    const probe = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x256:d=0.1', '-c:v', 'h264_nvenc', '-f', 'null', '-']);
    if (probe.status === 0) codecCache = ['-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', '19', '-b:v', '0'];
    else console.log('NVENC not available, using libx264');
  }
  return codecCache;
}

function ffmpegEncoder(out) {
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...videoCodec(),
    '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited with ' + c)))));
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
  return { write, end: () => { ff.stdin.end(); return done; } };
}

async function renderRange(browser, port, from, to, out, progress) {
  const page = await openPlayer(browser, port);
  const enc = ffmpegEncoder(out);
  for (let f = from; f < to; f++) {
    await enc.write(await frameAt(page, f / fps));
    progress();
  }
  await enc.end();
  await page.close();
}

async function main() {
  const server = await startServer();
  const port = server.address().port;
  const browser = await launch();
  try {
    if (args.stills) {
      const dir = path.resolve(args.stills);
      fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.readdirSync(dir)) if (f.endsWith('.png')) fs.unlinkSync(path.join(dir, f));
      let times;
      if (typeof args.times === 'string') times = args.times.split(',').map(Number);
      else {
        // per scene: just after it settles, and its middle
        times = [];
        for (const s of tl.scenes) {
          const d = s.end - s.start;
          times.push(+(s.start + Math.min(1.2, d * 0.45)).toFixed(3), +(s.start + d * 0.85).toFixed(3));
        }
      }
      const page = await openPlayer(browser, port);
      let i = 0;
      for (const t of times) {
        const buf = await frameAt(page, t, 'png');
        const name = `${String(i++).padStart(3, '0')}_t${t.toFixed(2)}.png`;
        fs.writeFileSync(path.join(dir, name), buf);
      }
      console.log(`stills: ${times.length} frames -> ${dir}`);
      return;
    }

    const out = path.resolve(args.out || path.join(projectDir, 'build', 'video.mp4'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const workers = Math.max(1, Math.min(Number(args.workers || Math.max(1, Math.floor(os.cpus().length / 2))), 8, Math.ceil(totalFrames / 30)));
    let done = 0;
    const t0 = Date.now();
    const tick = () => {
      done++;
      if (done % 15 === 0 || done === totalFrames) {
        const el = (Date.now() - t0) / 1000;
        const eta = (el / done) * (totalFrames - done);
        process.stdout.write(`\rrendering ${done}/${totalFrames} frames  ${((done / totalFrames) * 100).toFixed(0)}%  eta ${eta.toFixed(0)}s   `);
      }
    };
    console.log(`video ${W}x${H} @${fps}fps, ${tl.duration.toFixed(2)}s, ${totalFrames} frames, ${workers} worker(s)`);
    if (workers === 1) {
      await renderRange(browser, port, 0, totalFrames, out, tick);
    } else {
      const tmp = fs.mkdtempSync(path.join(path.dirname(out), '.parts-'));
      const per = Math.ceil(totalFrames / workers);
      const parts = [];
      const jobs = [];
      for (let w = 0; w < workers; w++) {
        const a = w * per;
        const b = Math.min(totalFrames, a + per);
        if (a >= b) break;
        const p = path.join(tmp, `part${w}.mp4`);
        parts.push(p);
        jobs.push(renderRange(browser, port, a, b, p, tick));
      }
      await Promise.all(jobs);
      const list = path.join(tmp, 'list.txt');
      fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
      await new Promise((res, rej) => {
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' });
        ff.on('close', (c) => (c === 0 ? res() : rej(new Error('concat failed'))));
      });
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    process.stdout.write('\n');
    console.log(`video -> ${out}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
