import { gsap } from 'gsap';
import { el, zones, maskLine, maskReveal, checklist } from '../components.js';
import { chipFromContent, escapeHtml } from './shared.js';

// Baris checklist solusi (ikon centang / peringatan per baris).
// Content: eyebrow, headline{text}, rows[] ({ main, small, status }).
export function build(stage, tokens, ctx = {}) {
  const b = ctx.beats;
  const content = ctx.scene?.content || {};
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chipFromContent(content.eyebrow));

  const headline = el('h2', 'headline headline--sm');
  const line = maskLine(content.headline?.text);
  headline.append(line);
  z.headline.append(headline);

  const list = checklist(
    (content.rows || []).map((row) => ({
      main: escapeHtml(row.main),
      small: escapeHtml(row.small),
      status: row.status === 'danger' ? 'danger' : 'ok',
    }))
  );

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
