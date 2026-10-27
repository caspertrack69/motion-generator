import { gsap } from 'gsap';
import { el, zones, chip, maskLineHtml, maskReveal } from '../components.js';

export function build(stage, tokens, ctx = {}) {
  const dur = ctx.duration || 7;
  const b = ctx.beats;
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chip('Celah 2', 'chip--danger'));

  const headline = el('h2', 'headline headline--sm');
  const lineA = maskLineHtml('Bukan di kode');
  const lineB = maskLineHtml('<span class="danger">Next.js.</span>');
  headline.append(lineA, lineB);
  z.headline.append(headline);

  stage.append(root);

  const tl = gsap.timeline();
  maskReveal(tl, lineA.firstChild, b.headlineA, 0.5);
  maskReveal(tl, lineB.firstChild, b.headlineB, 0.5);

  return tl;
}
