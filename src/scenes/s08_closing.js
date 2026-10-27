import { gsap } from 'gsap';
import { el, zones, chip, maskLineHtml, maskReveal } from '../components.js';

export function build(stage, tokens, ctx = {}) {
  const b = ctx.beats;
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chip('Security Brief · Next.js'));

  const headline = el('h2', 'headline headline--sm');
  const lineA = maskLineHtml('Kapan terakhir');
  const lineB = maskLineHtml('kamu cek yang ada');
  const lineC = maskLineHtml('di <span class="accent">bawah appmu?</span>');
  headline.append(lineA, lineB, lineC);
  z.headline.append(headline);

  const handle = el('div', 'handle', '@namakamu');
  root.append(handle);
  stage.append(root);

  const tl = gsap.timeline();
  tl.set(handle, { opacity: 0 }, 0);

  maskReveal(tl, lineA.firstChild, b.lineA, 0.5);
  maskReveal(tl, lineB.firstChild, b.lineB, 0.5);
  maskReveal(tl, lineC.firstChild, b.lineC, 0.5);

  tl.to([z.eyebrow, z.headline], { opacity: 0, duration: 0.8, ease: 'power2.out' }, b.fade);
  tl.fromTo(handle, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, b.fade);

  return tl;
}
