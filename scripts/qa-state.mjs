import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs/promises';

const server = await preview({
  preview: { port: 4175, strictPort: true, host: '127.0.0.1' },
  logLevel: 'warn',
});
const base = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4175/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(new URL('?render=1', base).href, { waitUntil: 'load' });
await page.evaluate(() => window.__ready.then(() => true));

const result = [];
for (let t = 0; t <= 62; t += 0.1) {
  await page.evaluate((time) => window.__seek(time), t);
  const state = await page.evaluate(() => {
    const opacity = (n) => (n && getComputedStyle(n).display !== 'none' ? Number(getComputedStyle(n).opacity) : 0);
    const roots = Array.from(document.querySelectorAll('.scene'))
      .map((r) => ({ o: opacity(r), text: (r.textContent || '').trim().slice(0, 20) }))
      .filter((r) => r.o > 0.05);
    const vp = document.querySelector('.stack-viewport');
    const stackVisible = opacity(vp) > 0.05;
    const stackRect = vp?.getBoundingClientRect();
    const handle = document.querySelector('.handle');
    const handleVisible = handle ? opacity(handle) > 0.05 : false;
    const stackLayers = Array.from(document.querySelectorAll('.stack-layer'))
      .filter((n) => opacity(n) > 0.05)
      .map((n) => n.textContent.trim());
    const pills = Array.from(document.querySelectorAll('.sub-pill--event'))
      .filter((p) => opacity(p) > 0.5)
      .map((p) => p.textContent.trim());
    return { roots, stackVisible, stackLayers, pills, handleVisible, stack: stackRect ? { top: Math.round(stackRect.top), bottom: Math.round(stackRect.bottom) } : null };
  });
  result.push({ t: Number(t.toFixed(2)), ...state });
}

const issues = [];
for (const row of result) {
  if (row.roots.length > 1) issues.push({ t: row.t, kind: 'multi-scene', roots: row.roots });
  if (row.pills.length > 2) issues.push({ t: row.t, kind: 'multi-sub', pills: row.pills });
  const stackShould = (row.t >= 27.05 && row.t < 44) || (row.t >= 54 && row.t < 60.6);
  if (stackShould && !row.stackVisible) issues.push({ t: row.t, kind: 'stack-missing' });
  if (!stackShould && row.stackVisible) issues.push({ t: row.t, kind: 'stack-extra' });
  if (row.stackVisible && row.stack && (row.stack.top < 660 || row.stack.bottom > 1240)) {
    issues.push({ t: row.t, kind: 'stack-bounds', stack: row.stack });
  }
}
console.log('issues', issues.length);
console.log(JSON.stringify(issues.slice(0, 20), null, 2));
for (const t of [26.8, 27.0, 36.9, 37.0, 43.9, 44.0, 53.9, 54.0, 61.9]) {
  const row = result.find((r) => Math.abs(r.t - t) < 0.051);
  console.log(t, row ? { roots: row.roots.length, stack: row.stackVisible, layers: row.stackLayers.length, pills: row.pills } : null);
}
await fs.writeFile('.qa/state.json', JSON.stringify(result, null, 2));
await browser.close();
await new Promise((r) => server.httpServer.close(r));
