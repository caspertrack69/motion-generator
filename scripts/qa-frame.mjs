// Render single frames at given timeline positions and, optionally, compare
// them pixel-by-pixel against a reference directory.
//
// Usage:
//   node scripts/qa-frame.mjs --out <dir> [--video <slug>] [--times 5,20,40]
//                             [--compare <dir>] [--no-build]
//
// Without --video the page is opened exactly like a plain render
// (?render=1), which is useful for capturing a baseline before refactors.
// Exits with code 1 when any compared frame differs.

import { chromium } from 'playwright';
import { build, preview } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const WIDTH = 1080;
const HEIGHT = 1920;
const PORT = 4177;

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

const videoSlug = arg('video');
const outDir = arg('out');
const compareDir = arg('compare');
const skipBuild = flag('no-build');
const times = arg('times', '5,20,40')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value));

if (!outDir) {
  console.error(
    'usage: node scripts/qa-frame.mjs --out <dir> [--video <slug>] [--times 5,20,40] [--compare <dir>] [--no-build]'
  );
  process.exit(2);
}
if (!times.length) {
  console.error('no valid --times given');
  process.exit(2);
}

await fs.mkdir(outDir, { recursive: true });

if (!skipBuild) {
  console.log('Building app...');
  await build({ logLevel: 'warn' });
}

const server = await preview({
  preview: { port: PORT, strictPort: true, host: '127.0.0.1' },
  logLevel: 'warn',
});
const base = server.resolvedUrls?.local?.[0] || `http://127.0.0.1:${PORT}/`;
const search = new URLSearchParams({ render: '1' });
if (videoSlug) search.set('video', videoSlug);
const url = new URL(`?${search.toString()}`, base).href;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
const consoleMessages = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  }
});
page.on('pageerror', (err) => consoleMessages.push(`pageerror: ${err.message}`));

await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => window.__ready.then(() => true));

const results = [];
for (const time of times) {
  await page.evaluate((t) => window.__seek(t), time);
  const file = path.join(outDir, `t${time}.png`);
  await page.screenshot({
    path: file,
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
  const bytes = await fs.readFile(file);
  results.push({
    time,
    file,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  });
}

await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));

for (const result of results) {
  console.log(`t=${result.time}s  ${result.sha256}  ${result.file}`);
}
if (consoleMessages.length) {
  console.log('browser messages:');
  consoleMessages.forEach((message) => console.log(`  ${message}`));
}

let failures = 0;
if (compareDir) {
  console.log(`\nComparing against ${compareDir}...`);
  for (const result of results) {
    const reference = path.join(compareDir, path.basename(result.file));
    let referenceBytes;
    try {
      referenceBytes = await fs.readFile(reference);
    } catch {
      console.log(`t=${result.time}s  MISSING reference ${reference}`);
      failures += 1;
      continue;
    }
    const [current, referenceRaw] = await Promise.all([
      sharp(result.file).raw().toBuffer(),
      sharp(reference).raw().toBuffer(),
    ]);
    if (current.length !== referenceRaw.length) {
      console.log(
        `t=${result.time}s  DIFFERENT (buffer size ${current.length} vs ${referenceRaw.length})`
      );
      failures += 1;
      continue;
    }
    let diffBytes = 0;
    let maxDelta = 0;
    let sumDelta = 0;
    for (let i = 0; i < current.length; i += 1) {
      const delta = Math.abs(current[i] - referenceRaw[i]);
      if (delta) {
        diffBytes += 1;
        sumDelta += delta;
        if (delta > maxDelta) maxDelta = delta;
      }
    }
    const pixels = current.length / 4;
    if (diffBytes === 0) {
      console.log(`t=${result.time}s  IDENTICAL  (${pixels} pixels)`);
    } else {
      console.log(
        `t=${result.time}s  DIFFERENT  channels=${diffBytes}/${current.length}  pixels=${pixels}  ` +
          `maxDelta=${maxDelta}  meanDelta=${(sumDelta / diffBytes).toFixed(3)}`
      );
      failures += 1;
    }
  }
}

process.exitCode = failures ? 1 : 0;
