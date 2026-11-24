#!/usr/bin/env node
// Web game frame capture for studioigor: captures headless browser frames, contact sheet, and metrics.json.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const argv = process.argv.slice(2);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) usage(`unexpected argument ${a}`);
  const [k, inline] = a.slice(2).split(/=(.*)/s);
  if (inline !== undefined) opts[k] = inline;
  else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) opts[k] = argv[++i];
  else opts[k] = true;
}
const KNOWN = [
  'url', 'dir', 'serve', 'out', 'duration', 'every', 'start', 'width', 'height', 'scale',
  'inputs', 'wait-for', 'seed', 'selector', 'cols', 'tile', 'headed', 'allow-errors', 'ignore',
  'require-completed', 'timeout', 'isolate',
];
for (const k of Object.keys(opts)) if (!KNOWN.includes(k)) usage(`unknown argument --${k}`);

const OUT = path.resolve(opts.out ?? '.studioigor/captures/capture');
const DURATION = num('duration', 8);
const EVERY = Math.max(0.05, num('every', 1));
const START = num('start', 0.25);
const VIEWPORT = { width: num('width', 1280), height: num('height', 720) };
const SCALE = num('scale', 1);
const COLS = Math.max(1, num('cols', 4));
const TILE = Math.max(64, num('tile', 480));
const TIMEOUT = num('timeout', 120) * 1000;
const IGNORE = opts.ignore ? new RegExp(opts.ignore) : null;
if (!opts.url && !opts.dir) usage('--url or --dir is required');
if (opts.serve && !opts.url) usage('with --serve, give the --url the server answers on');

function num(k, d) {
  if (opts[k] === undefined) return d;
  const v = Number(opts[k]);
  if (!Number.isFinite(v)) usage(`--${k} must be a number`);
  return v;
}
function usage(msg) {
  console.error(`capture.mjs: ${msg}.`);
  process.exit(2);
}

let chromium;
for (const mod of ['playwright', '@playwright/test', 'playwright-core']) {
  try {
    ({ chromium } = await import(mod));
    if (chromium) break;
  } catch {
    /* next */
  }
}
if (!chromium) {
  console.error('capture.mjs: playwright not found.');
  process.exit(2);
}

const events = [];
if (opts.inputs) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(opts.inputs, 'utf8'));
  } catch (e) {
    usage(`cannot read ${opts.inputs}: ${e.message}`);
  }
  if (!Array.isArray(raw)) usage(`${opts.inputs}: a JSON array is required`);
  for (const e of raw) {
    if (typeof e.t !== 'number') usage(`event without t: ${JSON.stringify(e)}`);
    if (e.key) {
      const hold = e.hold ?? 0.1;
      events.push({ t: e.t, do: 'down', key: e.key }, { t: e.t + hold, do: 'up', key: e.key });
    } else if (e.keydown) events.push({ t: e.t, do: 'down', key: e.keydown });
    else if (e.keyup) events.push({ t: e.t, do: 'up', key: e.keyup });
    else if (e.click) events.push({ t: e.t, do: 'click', x: e.click[0], y: e.click[1] });
    else if (e.eval) events.push({ t: e.t, do: 'eval', js: e.eval });
    else usage(`an event needs key, keydown, keyup, click or eval: ${JSON.stringify(e)}`);
  }
  events.sort((a, b) => a.t - b.t);
}

let server = null;
let child = null;
let baseUrl = opts.url;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

if (opts.dir) {
  const root = path.resolve(opts.dir);
  if (!fs.existsSync(path.join(root, 'index.html'))) usage(`no index.html in ${root} (run BUILD)`);
  server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(root, p);
    if (!f.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) {
      res.writeHead(404).end('not found');
      return;
    }
    const headers = { 'Content-Type': MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream' };
    if (opts.isolate) {
      headers['Cross-Origin-Opener-Policy'] = 'same-origin';
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
    }
    res.writeHead(200, headers);
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  baseUrl = opts.url ? new URL(opts.url, `http://127.0.0.1:${port}/`).href : `http://127.0.0.1:${port}/`;
}

if (opts.serve) {
  child = spawn(opts.serve, { shell: true, stdio: 'ignore', detached: true });
  const until = Date.now() + 30000;
  let up = false;
  while (Date.now() < until && !up) {
    try {
      const r = await fetch(baseUrl);
      up = r.status < 500;
    } catch {
      /* waiting */
    }
    if (!up) await sleep(300);
  }
  if (!up) await done(1, [`server "${opts.serve}" did not respond at ${baseUrl} within 30 s`]);
}

if (opts.seed !== undefined) {
  const u = new URL(baseUrl);
  u.searchParams.set('capture', '1');
  u.searchParams.set('seed', String(opts.seed));
  baseUrl = u.href;
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) {
  if (/^frame_\d+\.png$/.test(f) || f === 'sheet.png' || f === 'metrics.json') fs.rmSync(path.join(OUT, f));
}

const DEFAULT_PW_CHROMIUM = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
const launchOpts = { headless: !opts.headed };
if (process.env.PW_CHROMIUM) {
  launchOpts.executablePath = process.env.PW_CHROMIUM;
} else if (fs.existsSync(DEFAULT_PW_CHROMIUM)) {
  launchOpts.executablePath = DEFAULT_PW_CHROMIUM;
}

let browser;
try {
  browser = await chromium.launch(launchOpts);
} catch (e) {
  const first = String(e.message).split('\n')[0];
  await done(2, [`chromium failed to launch: ${first}`]);
}

const watchdog = setTimeout(() => done(1, [`timeout ${TIMEOUT / 1000} s`]), TIMEOUT);
const errors = [];
const warnings = [];
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  const loc = m.location()?.url ?? '';
  const text = `${m.text()}${loc ? ` (${loc.split('/').pop()})` : ''}`;
  if (m.type() === 'error') {
    if (/favicon\.ico/.test(loc) || /favicon\.ico/.test(m.text()) || (IGNORE && IGNORE.test(text))) return;
    errors.push(`console: ${text}`);
  } else if (m.type() === 'warning' && !/GL Driver Message/.test(text)) {
    warnings.push(text);
  }
});
page.on('crash', () => errors.push('the page crashed (crash)'));

await page.addInitScript(() => {
  window.__fps = [];
  let n = 0;
  const tick = () => {
    n++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setInterval(() => {
    window.__fps.push(n);
    n = 0;
  }, 1000);
});

try {
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 30000 });
  if (opts['wait-for']) {
    await page.waitForFunction(opts['wait-for'], null, { timeout: 30000, polling: 100 });
  }
} catch (e) {
  await done(1, [`the page did not load or --wait-for timed out: ${String(e.message).split('\n')[0]}`]);
}

const shots = [];
const target = opts.selector ? page.locator(opts.selector).first() : page;
const t0 = Date.now();
let nextShot = START;
const due = [...events];

while (true) {
  const t = (Date.now() - t0) / 1000;
  while (due.length && due[0].t <= t) {
    const e = due.shift();
    try {
      if (e.do === 'down') await page.keyboard.down(e.key);
      else if (e.do === 'up') await page.keyboard.up(e.key);
      else if (e.do === 'click') await page.mouse.click(e.x, e.y);
      else if (e.do === 'eval') await page.evaluate(e.js);
    } catch (err) {
      errors.push(`input ${JSON.stringify(e)}: ${String(err.message).split('\n')[0]}`);
    }
  }
  if (t >= nextShot && nextShot <= DURATION + 1e-6) {
    const file = path.join(OUT, `frame_${String(shots.length).padStart(3, '0')}.png`);
    await target.screenshot({ path: file });
    shots.push(file);
    nextShot += EVERY;
  }
  if (t >= DURATION) break;
  await sleep(15);
}

const game = await page.evaluate(() => window.__metrics ?? null).catch(() => null);
const fpsAll = await page.evaluate(() => window.__fps ?? []).catch(() => []);
const fps = fpsAll.length > 1 ? fpsAll.slice(1) : fpsAll;
const sheet = shots.length ? await makeSheet(shots) : '';

const fails = [];
if (!shots.length) fails.push('no frames captured');
if (errors.length && !opts['allow-errors']) {
  fails.push(`page/console errors: ${errors.length} (first: ${errors[0]})`);
}
if (opts['require-completed'] && game?.completed !== true) {
  fails.push('window.__metrics.completed !== true');
}

const metrics = {
  ok: fails.length === 0,
  url: baseUrl,
  viewport: [VIEWPORT.width, VIEWPORT.height],
  seed: opts.seed ?? null,
  duration: DURATION,
  fps_mean: fps.length ? +(fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(1) : 0,
  fps_min: fps.length ? Math.min(...fps) : 0,
  frames: shots.map((f) => path.basename(f)),
  sheet: sheet ? path.basename(sheet) : '',
  error_count: errors.length,
  errors: errors.slice(0, 20),
  warning_count: warnings.length,
  warnings: warnings.slice(0, 20),
  game,
  fail_reasons: fails,
};
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
clearTimeout(watchdog);
if (fails.length) await done(1, fails);
console.log(`capture ok: ${shots.length} frames, ${metrics.sheet}, metrics.json -> ${OUT}`);
await done(0, []);

async function makeSheet(files) {
  const p = await browser.newPage();
  await p.setContent('<canvas id=c></canvas>');
  const data = await p.evaluate(
    async ({ srcs, cols, tile }) => {
      const imgs = await Promise.all(
        srcs.map(
          (s) =>
            new Promise((res, rej) => {
              const i = new Image();
              i.onload = () => res(i);
              i.onerror = rej;
              i.src = s;
            }),
        ),
      );
      const th = Math.round((tile * imgs[0].height) / imgs[0].width);
      const c = Math.min(cols, imgs.length);
      const cv = document.getElementById('c');
      cv.width = c * tile;
      cv.height = Math.ceil(imgs.length / c) * th;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#101012';
      ctx.fillRect(0, 0, cv.width, cv.height);
      imgs.forEach((im, i) => ctx.drawImage(im, (i % c) * tile, Math.floor(i / c) * th, tile, th));
      return cv.toDataURL('image/png');
    },
    {
      srcs: files.map((f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`),
      cols: COLS,
      tile: TILE,
    },
  );
  await p.close();
  const out = path.join(OUT, 'sheet.png');
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function done(code, reasons) {
  for (const r of reasons) console.error(`CAPTURE FAILED: ${r}`);
  try {
    if (browser) await browser.close();
  } catch {
    /* closed */
  }
  if (server) server.close();
  if (child) {
    try {
      process.kill(-child.pid);
    } catch {
      /* exited */
    }
  }
  process.exit(code);
}
