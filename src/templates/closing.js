import { gsap } from 'gsap';
import { el, zones, maskLineHtml, maskReveal } from '../components.js';
import { chipFromContent, escapeHtml, lineHtml } from './shared.js';

// Penutup: headline pertanyaan (3 baris) + handle, lalu fade.
// Content: eyebrow, headline[] (3 baris), handle{text}.
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

  const handle = el('div', 'handle', escapeHtml(content.handle?.text));
  root.append(handle);
  stage.append(root);

  const tl = gsap.timeline();
  tl.set(handle, { opacity: 0 }, 0);

  if (lines[0]) maskReveal(tl, lines[0].firstChild, b.lineA, 0.5);
  if (lines[1]) maskReveal(tl, lines[1].firstChild, b.lineB, 0.5);
  if (lines[2]) maskReveal(tl, lines[2].firstChild, b.lineC, 0.5);

  tl.to([z.eyebrow, z.headline], { opacity: 0, duration: 0.8, ease: 'power2.out' }, b.fade);
  tl.fromTo(handle, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, b.fade);

  return tl;
}
