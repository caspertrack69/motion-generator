import { gsap } from 'gsap';
import { warningIcon } from '../icons.js';
import { el, zones, maskLine, fadeUp, maskReveal, gauge } from '../components.js';
import { chipFromContent, escapeHtml } from './shared.js';

// Dua gauge CVSS + badge kritis + footnote.
// Content: eyebrow, headline{text,sub}, gauges[] ({label}), score{value,max},
// badge{text}, footnote{text}.
export function build(stage, tokens, ctx = {}) {
  const b = ctx.beats;
  const content = ctx.scene?.content || {};
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chipFromContent(content.eyebrow));

  const headline = el('h2', 'headline headline--sm');
  const lineA = maskLine(content.headline?.text);
  headline.append(lineA);
  let sub = null;
  if (content.headline?.sub) {
    sub = el('span', 'headline-sub', escapeHtml(content.headline.sub));
    headline.append(sub);
  }
  z.headline.append(headline);

  const gaugesWrap = el('div', 'gauges');
  const gauges = (content.gauges || []).map((item) => gauge(escapeHtml(item.label)));
  gaugesWrap.append(...gauges);

  const badge = el(
    'div',
    'critical-badge',
    `${warningIcon(44)}<span>${escapeHtml(content.badge?.text)}</span>`
  );
  const footnote = el('div', 'footnote', escapeHtml(content.footnote?.text));

  z.visual.append(gaugesWrap, badge, footnote);

  stage.append(root);

  const tl = gsap.timeline();
  tl.set(gaugesWrap, { opacity: 0 }, 0);
  tl.set(badge, { opacity: 0 }, 0);
  tl.set(footnote, { opacity: 0 }, 0);

  maskReveal(tl, lineA.firstChild, b.headline, 0.5);
  if (sub) fadeUp(tl, sub, b.sub, { y: 16, duration: 0.4 });
  fadeUp(tl, gaugesWrap, b.gauges, { y: 30, duration: 0.5 });

  const value = Number(content.score?.value ?? 0);
  const max = Number(content.score?.max ?? 10);
  const fraction = max > 0 ? value / max : 0;

  gauges.forEach((g) => {
    tl.fromTo(
      g._value,
      { strokeDashoffset: g._length },
      { strokeDashoffset: g._length * (1 - fraction), duration: 1.2, ease: 'power2.out' },
      b.gauges
    );
    const counter = { v: 0 };
    tl.fromTo(
      counter,
      { v: 0 },
      {
        v: value,
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
