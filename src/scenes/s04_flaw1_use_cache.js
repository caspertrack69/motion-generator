import { gsap } from 'gsap';
import { el, zones, chip, maskLineHtml, fadeUp, maskReveal, codeCard, flagNote } from '../components.js';

export function build(stage, tokens, ctx = {}) {
  const dur = ctx.duration || 9;
  const b = ctx.beats;
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chip('Celah 1', 'chip--danger'));

  const headline = el('h2', 'headline');
  const line = maskLineHtml('use <span class="dim">cache</span>');
  headline.append(line);
  z.headline.append(headline);

  const card = codeCard([
    { html: 'async function getData() {' },
    { html: '  <span class="accent">"use cache"</span>' },
    { html: '<span class="flag-wrap">  return [bufA, bufB]</span>', wash: true },
    { html: '}' },
  ]);

  const note = flagNote('lebih dari 1 typed array');

  const chipRow = el('div', 'chip-row');
  const c1 = chip('Next.js 16.0.0 – 16.4.0', '', 'chip--compact');
  const c2 = chip('Cache Components: ON', '', 'chip--compact');
  chipRow.append(c1, c2);

  z.visual.append(card.root, note, chipRow);

  stage.append(root);

  const tl = gsap.timeline();
  maskReveal(tl, line.firstChild, b.headline, 0.5);

  fadeUp(tl, card.root, b.card, { y: 30, duration: 0.5 });
  card.lines.forEach((row, i) => {
    tl.fromTo(
      row,
      { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0 },
      { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.32, ease: 'power3.out' },
      b.lines + i * b.lineStep
    );
  });

  tl.set(note, { opacity: 0 }, 0);
  const wash = card.root.querySelectorAll('.flag-wash');
  tl.fromTo(
    wash,
    { clipPath: 'inset(0% 100% 0% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'power2.out' },
    b.wash
  );
  tl.fromTo(
    root.querySelector('.flag-wrap'),
    { color: tokens.text },
    { color: tokens.danger, duration: 0.3, ease: 'power2.out' },
    b.wash
  );
  fadeUp(tl, note, b.note, { y: 16, duration: 0.4 });

  fadeUp(tl, c1, b.chipA, { y: 20, duration: 0.45 });
  fadeUp(tl, c2, b.chipB, { y: 20, duration: 0.45 });

  return tl;
}
