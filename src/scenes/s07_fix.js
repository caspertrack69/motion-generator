import { gsap } from 'gsap';
import { el, zones, chip, maskLine, maskReveal, checklist } from '../components.js';

export function build(stage, tokens, ctx = {}) {
  const dur = ctx.duration || 10;
  const b = ctx.beats;
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chip('Solusi', 'chip--ok'));

  const headline = el('h2', 'headline headline--sm');
  const line = maskLine('Cek versimu.');
  headline.append(line);
  z.headline.append(headline);

  const list = checklist([
    { main: 'Next.js 16', small: '→ 16.4.1', status: 'ok' },
    { main: 'Next.js 15', small: '→ 15.5.28', status: 'ok' },
    { main: 'sharp ≥ 0.35.5', small: 'khusus celah SVG', status: 'ok' },
    { main: 'Next.js ≤ 14', small: 'tidak ada patch, pindah ke 15', status: 'danger' },
  ]);

  z.visual.append(list.root);
  stage.append(root);

  const tl = gsap.timeline();
  maskReveal(tl, line.firstChild, b.headline, 0.5);

  list.items.forEach((item, i) => {
    const at = b.rows + i * b.rowStep;
    tl.fromTo(
      item.root,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
      at
    );
    if (item.mark) {
      const length = item.mark.getTotalLength();
      tl.set(item.mark, { strokeDasharray: length, strokeDashoffset: length }, 0);
      tl.fromTo(
        item.mark,
        { strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' },
        at + b.checkDelay
      );
    }
  });

  return tl;
}
