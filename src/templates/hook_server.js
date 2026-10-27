import { gsap } from 'gsap';
import { serverIcon, lockIcon } from '../icons.js';
import { el, zones, maskLine, fadeUp, maskReveal } from '../components.js';
import { chipFromContent } from './shared.js';

// Hook pembuka: chip seri, dua baris headline, ikon server + gembok.
// Content: eyebrow, headline[] (2 baris).
export function build(stage, tokens, ctx = {}) {
  const b = ctx.beats;
  const content = ctx.scene?.content || {};
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chipFromContent(content.eyebrow));

  const headline = el('h2', 'headline');
  const lines = (content.headline || []).map((line) => maskLine(line.text, line.tone || ''));
  headline.append(...lines);
  z.headline.append(headline);

  const hero = el('div', 'hero-server');
  const server = el('div', '', serverIcon(360));
  const lock = el('div', 'hero-lock', lockIcon(76));
  hero.append(server, lock);
  z.visual.append(hero);

  stage.append(root);

  const tl = gsap.timeline();
  fadeUp(tl, z.eyebrow.firstChild, b.eyebrow, { y: 20, duration: 0.45 });
  if (lines[0]) maskReveal(tl, lines[0].firstChild, b.lineA, 0.5);
  if (lines[1]) maskReveal(tl, lines[1].firstChild, b.lineB, 0.5);
  fadeUp(tl, hero, b.visual, { y: 36, duration: 0.6 });

  const shackle = lock.querySelector('.lock-shackle');
  tl.fromTo(
    shackle,
    { y: 0, rotate: 0 },
    {
      y: -24,
      rotate: -7,
      duration: 0.5,
      ease: 'power2.inOut',
      transformOrigin: '50% 100%',
    },
    b.unlock
  );

  const leds = server.querySelectorAll('.server-led');
  tl.to(leds, { fill: tokens.danger, duration: 0.3, ease: 'power2.out' }, b.led);
  tl.to(
    leds,
    { scale: 1.15, duration: 0.16, ease: 'power2.out', transformOrigin: '50% 50%' },
    b.led
  );
  tl.to(
    leds,
    { scale: 1, duration: 0.2, ease: 'power2.in', transformOrigin: '50% 50%' },
    b.ledSettle
  );

  return tl;
}
