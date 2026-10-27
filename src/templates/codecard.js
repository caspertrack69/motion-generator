import { gsap } from 'gsap';
import { el, zones, chip, maskLineHtml, fadeUp, maskReveal, codeCard, flagNote } from '../components.js';
import { chipFromContent, escapeHtml, lineHtml } from './shared.js';

// Kartu pseudo-code + anotasi baris + chip versi.
// Content: eyebrow, headline[1 line], code{tag,lines[]}, note{text}, chips[].
function codeLineHtml(line = {}) {
  const text = escapeHtml(line.text);
  if (line.tone === 'flag') return `<span class="flag-wrap">${text}</span>`;
  if (line.tone) return `<span class="${escapeHtml(line.tone)}">${text}</span>`;
  return text;
}

export function build(stage, tokens, ctx = {}) {
  const b = ctx.beats;
  const content = ctx.scene?.content || {};
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chipFromContent(content.eyebrow));

  const headline = el('h2', 'headline');
  const line = maskLineHtml(lineHtml(content.headline?.[0]));
  headline.append(line);
  z.headline.append(headline);

  const code = content.code || {};
  const card = codeCard(
    (code.lines || []).map((row) => ({ html: codeLineHtml(row), wash: Boolean(row.wash) })),
    escapeHtml(code.tag)
  );

  const note = flagNote(escapeHtml(content.note?.text));

  const chipRow = el('div', 'chip-row');
  const chips = (content.chips || []).map((text) => chip(escapeHtml(text), '', 'chip--compact'));
  chipRow.append(...chips);

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

  if (chips[0]) fadeUp(tl, chips[0], b.chipA, { y: 20, duration: 0.45 });
  if (chips[1]) fadeUp(tl, chips[1], b.chipB, { y: 20, duration: 0.45 });

  return tl;
}
