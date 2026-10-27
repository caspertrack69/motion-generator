import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, '.qa');
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });

const server = await preview({
  preview: { port: 4174, strictPort: true, host: '127.0.0.1' },
  logLevel: 'warn',
});
const base = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4174/';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('request', (r) => {
  const u = r.url();
  if (!u.startsWith(base) && !u.startsWith('data:')) errors.push(`external: ${u}`);
});

await page.goto(new URL('?render=1', base).href, { waitUntil: 'load' });
await page.evaluate(() => window.__ready.then(() => true));

const samples = [
  { id: 's01', t: 4.2 },
  { id: 's02', t: 10.4 },
  { id: 's03', t: 16.2 },
  { id: 's04', t: 25.2 },
  { id: 's05', t: 34.0 },
  { id: 's06', t: 41.8 },
  { id: 's07', t: 50.6 },
  { id: 's08', t: 60.0 },
];

const report = {};
const subtitleIssues = [];
for (const sample of samples) {
  await page.evaluate((time) => window.__seek(time), sample.t);
  await page.screenshot({ path: path.join(out, `${sample.id}.png`) });
  report[sample.id] = await page.evaluate(() => {
    const skip = '.stage, .stage-bg, .scenes, .scene, .zone';
    const hidden = (node) => {
      let cur = node;
      while (cur && cur !== document.getElementById('stage')) {
        const cs = getComputedStyle(cur);
        if (cs.display === 'none' || cs.visibility === 'hidden') return true;
        if (Number(cs.opacity) === 0) return true;
        cur = cur.parentElement;
      }
      return false;
    };
    const issues = [];
    const boxes = [];
    const seen = new Set();
    const add = (issue) => {
      const key = JSON.stringify(issue);
      if (seen.has(key)) return;
      seen.add(key);
      issues.push(issue);
    };
    const walk = (node) => {
      if (!(node instanceof Element)) return;
      if (hidden(node)) return;
      if (node.matches(skip)) {
        for (const child of node.children) walk(child);
        return;
      }
      const cs = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const cls = node.className?.baseVal ?? String(node.className);
      const isSub = !!node.closest('.subtitle-layer');
      const inStack = !!node.closest('.stack-viewport');
      if (!isSub && !inStack && r.bottom > 220 && r.top < 1500) {
        if (r.left < 71 || r.right > 961) {
          add({ type: 'x-overflow', cls, left: Math.round(r.left), right: Math.round(r.right) });
        }
        if (r.top < 219) {
          add({ type: 'top-dead', cls, top: Math.round(r.top) });
        }
      }
      if (!isSub && r.top < 1490 && r.bottom > 1291) {
        add({ type: 'subtitle-overlap', cls, top: Math.round(r.top), bottom: Math.round(r.bottom) });
      }
      if (r.bottom > 1501 && r.top < 1920 && !node.classList.contains('stage-bg')) {
        add({ type: 'bottom-dead', cls, bottom: Math.round(r.bottom) });
      }
      if (node.scrollWidth > node.clientWidth + 1 && cs.display !== 'inline') {
        add({ type: 'scroll-width', cls, scroll: node.scrollWidth, client: node.clientWidth, text: node.textContent.trim().slice(0, 32) });
      }
      const directText = Array.from(node.childNodes).some(
        (n) => n.nodeType === 3 && n.textContent.trim().length > 0
      );
      const mono = /JetBrains/i.test(cs.fontFamily);
      if (directText && !isSub) {
        const fs = parseFloat(cs.fontSize);
        const text = node.textContent.trim().slice(0, 32);
        const isLabel = mono || /label|chip|eyebrow|tag|footnote|handle|badge/i.test(cls);
        const isLarge = fs >= 88;
        if (fs < 34) add({ type: 'font-small', text, fs });
        if (!isLabel && !isLarge && fs < 44) add({ type: 'body-small', text, fs });
      }
      if (directText || node.matches('.chip, .sub-pill, .check-row, .code-card, .terminal-card, .stack-layer')) {
        boxes.push({
          cls: cls.split(' ')[0] || node.tagName.toLowerCase(),
          text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 30),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
      for (const child of node.children) walk(child);
    };
    walk(document.getElementById('stage'));
    return { issues, boxes };
  });
}

await page.evaluate(() => window.__seek(25.2));
await page.screenshot({ path: path.join(out, 'determinism-a.png') });
await page.evaluate(() => window.__seek(48.0));
await page.evaluate(() => window.__seek(25.2));
await page.screenshot({ path: path.join(out, 'determinism-b.png') });
const a = await fs.readFile(path.join(out, 'determinism-a.png'));
const b = await fs.readFile(path.join(out, 'determinism-b.png'));

await page.evaluate(() => window.__seek(0.2));
for (let t = 0; t < 62; t += 0.25) {
  await page.evaluate((time) => window.__seek(time), t);
  const info = await page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('.sub-pill--event')).filter((p) => Number(getComputedStyle(p).opacity) > 0.5);
    return pills.map((p) => {
      const r = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const lineHeight = parseFloat(cs.lineHeight);
      return {
        text: p.textContent.trim(),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        lines: Math.round((r.height - 44) / lineHeight),
        visible: pills.length,
      };
    });
  });
  for (const item of info) {
    if (item.visible > 2) subtitleIssues.push({ t, kind: 'multiple-visible', ...item });
    if (item.bottom > 1470) subtitleIssues.push({ t, kind: 'too-tall', ...item });
    if (item.left < 72 || item.right > 960) subtitleIssues.push({ t, kind: 'x', ...item });
    if (item.lines > 2) subtitleIssues.push({ t, kind: 'lines', ...item });
  }
}
console.log('subtitle issues:', subtitleIssues.slice(0, 30), subtitleIssues.length);
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ report, subtitleIssues }, null, 2));
console.log('errors:', errors);
console.log('determinism:', a.equals(b));
for (const [id, value] of Object.entries(report)) {
  console.log(id, value.issues.length ? value.issues : 'ok');
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
