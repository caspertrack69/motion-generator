import { gsap } from 'gsap';
import { warningIcon } from '../icons.js';
import { el, zones, chip, maskLine, fadeUp, maskReveal, gauge } from '../components.js';

export function build(stage, tokens, ctx = {}) {
  const dur = ctx.duration || 6;
  const b = ctx.beats;
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chip('14 Okt 2026', 'chip--danger'));

  const headline = el('h2', 'headline headline--sm');
  const lineA = maskLine('PATCH DARURAT.');
  const sub = el('span', 'headline-sub', '(out-of-band)');
  headline.append(lineA, sub);
  z.headline.append(headline);

  const gaugesWrap = el('div', 'gauges');
  const g1 = gauge('Celah 1');
  const g2 = gauge('Celah 2');
  gaugesWrap.append(g1, g2);

  const badge = el('div', 'critical-badge', `${warningIcon(44)}<span>Kritis</span>`);
  const footnote = el('div', 'footnote', 'Skor CVSS versi Vercel');

  z.visual.append(gaugesWrap, badge, footnote);

  stage.append(root);

  const tl = gsap.timeline();
  tl.set(gaugesWrap, { opacity: 0 }, 0);
  tl.set(badge, { opacity: 0 }, 0);
  tl.set(footnote, { opacity: 0 }, 0);

  maskReveal(tl, lineA.firstChild, b.headline, 0.5);
  fadeUp(tl, sub, b.sub, { y: 16, duration: 0.4 });
  fadeUp(tl, gaugesWrap, b.gauges, { y: 30, duration: 0.5 });

  [g1, g2].forEach((g) => {
    tl.fromTo(
      g._value,
      { strokeDashoffset: g._length },
      { strokeDashoffset: g._length * (1 - 0.95), duration: 1.2, ease: 'power2.out' },
      b.gauges
    );
    const counter = { v: 0 };
    tl.fromTo(
      counter,
      { v: 0 },
      {
        v: 9.5,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          g._num.textContent = counter.v.toFixed(1);
        },
      },
      b.gauges
    );
  });

  fadeUp(tl, badge, b.badge, { y: 24, duration: 0.5 });
  tl.fromTo(footnote, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, b.footnote);

  return tl;
}
