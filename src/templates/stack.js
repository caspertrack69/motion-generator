import { gsap } from 'gsap';
import { el, zones, maskLineHtml, maskReveal } from '../components.js';
import { chipFromContent, lineHtml } from './shared.js';

// Scene pendamping diagram stack persisten (dibuat sekali di components.js
// dan dikoreografikan di stackSequence.js). Template ini hanya menyiapkan
// chip + headline; stack masuk lewat stackSequence pada window scene pertama.
// Content: eyebrow, headline[] (2 baris).
export function build(stage, tokens, ctx = {}) {
  const b = ctx.beats;
  const content = ctx.scene?.content || {};
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chipFromContent(content.eyebrow));

  const headline = el('h2', 'headline headline--sm');
  const lines = (content.headline || []).map((line) => maskLineHtml(lineHtml(line)));
  headline.append(...lines);
  z.headline.append(headline);

  stage.append(root);

  const tl = gsap.timeline();
  if (lines[0]) maskReveal(tl, lines[0].firstChild, b.headlineA, 0.5);
  if (lines[1]) maskReveal(tl, lines[1].firstChild, b.headlineB, 0.5);

  return tl;
}
