import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({
  preview: { port: 4176, strictPort: true, host: '127.0.0.1' },
  logLevel: 'warn',
});
const base = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4176/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(new URL('?dev=1', base).href, { waitUntil: 'load' });
await page.evaluate(() => window.__ready.then(() => true));
await page.waitForTimeout(300);
const initial = await page.evaluate(() => ({
  stage: document.getElementById('stage').getBoundingClientRect().toJSON(),
  devbar: !document.getElementById('devbar').hidden,
  play: document.getElementById('playpause').textContent,
  scrubberMax: document.getElementById('scrubber').max,
  duration: window.__duration,
  time: document.getElementById('timecode').textContent,
}));
await page.screenshot({ path: '.qa/dev-initial.png' });
await page.click('#playpause');
await page.waitForTimeout(1600);
const playing = await page.evaluate(() => ({
  play: document.getElementById('playpause').textContent,
  value: document.getElementById('scrubber').value,
  time: document.getElementById('timecode').textContent,
}));
await page.click('#playpause');
await page.evaluate(() => {
  const s = document.getElementById('scrubber');
  s.value = '25.2';
  s.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.screenshot({ path: '.qa/dev-seek.png' });
const afterSeek = await page.evaluate(() => ({
  value: document.getElementById('scrubber').value,
  time: document.getElementById('timecode').textContent,
  play: document.getElementById('playpause').textContent,
}));

const safe = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await safe.goto(new URL('?safe=1&render=1', base).href, { waitUntil: 'load' });
await safe.evaluate(() => window.__ready.then(() => true));
await safe.waitForTimeout(200);
await safe.screenshot({ path: '.qa/safe.png' });
const safeInfo = await safe.evaluate(() => ({
  zones: document.querySelectorAll('.safe-zone').length,
  shown: getComputedStyle(document.querySelector('.safe-overlay')).display,
}));

console.log(JSON.stringify({ initial, playing, afterSeek, safeInfo, errors }, null, 2));
await browser.close();
await new Promise((r) => server.httpServer.close(r));
