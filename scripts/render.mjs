import { chromium } from 'playwright';
import { build, preview } from 'vite';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';

const root = process.cwd();
const framesDir = path.join(root, 'frames');
const outDir = path.join(root, 'out');
const audioPath = path.join(root, 'assets', 'audio', 'voiceover.mp3');
const outputPath = path.join(outDir, 'nextjs-rce.mp4');
const silent = process.argv.includes('--silent');

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function runFfmpeg(args) {
  const bin = process.env.FFMPEG_PATH || ffmpeg;
  if (!bin) throw new Error('ffmpeg binary not found. Set FFMPEG_PATH.');
  await new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function main() {
  await fs.rm(framesDir, { recursive: true, force: true });
  await fs.mkdir(framesDir, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });

  console.log('Building app...');
  await build({ logLevel: 'warn' });

  console.log('Starting preview server...');
  const server = await preview({
    preview: { port: 4173, strictPort: true, host: '127.0.0.1' },
    logLevel: 'warn',
  });
  const base = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4173/';
  const url = new URL('?render=1', base).href;

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[browser ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));
  page.on('request', (req) => {
    const requestUrl = req.url();
    if (!requestUrl.startsWith(base) && !requestUrl.startsWith('data:')) {
      console.log(`[external request] ${requestUrl}`);
    }
  });

  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => window.__ready.then(() => true));
  const duration = await page.evaluate(() => window.__duration);
  const totalFrames = Math.ceil(duration * FPS);
  console.log(`Duration ${duration}s, ${totalFrames} frames`);

  for (let i = 0; i < totalFrames; i += 1) {
    const t = i / FPS;
    await page.evaluate((time) => window.__seek(time), t);
    const file = path.join(framesDir, `${String(i).padStart(5, '0')}.png`);
    await page.screenshot({
      path: file,
      type: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
    if (i % 60 === 0) console.log(`frame ${i + 1}/${totalFrames}`);
  }

  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));

  const hasAudio = !silent && (await pathExists(audioPath));
  const args = [
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    path.join(framesDir, '%05d.png'),
  ];
  if (hasAudio) args.push('-i', audioPath);
  args.push(
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '16',
    '-preset',
    'slow'
  );
  // Video length is exactly ceil(window.__duration * FPS) frames, where
  // window.__duration = end of the last scene (audio end + 0.8 s). Do not use
  // -shortest here: it can truncate the voice over at the video boundary.
  if (hasAudio) args.push('-c:a', 'aac', '-b:a', '192k');
  args.push(outputPath);

  console.log(hasAudio ? 'Encoding with audio...' : 'Encoding silent...');
  await runFfmpeg(args);
  console.log(`Done: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
