import { gsap } from 'gsap';
import { serverIcon, lockIcon } from '../icons.js';
import { el, zones, chip, maskLine, fadeUp, maskReveal } from '../components.js';

export function build(stage, tokens, ctx = {}) {
  const dur = ctx.duration || 6;
  const b = ctx.beats;
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chip('Security Brief · Next.js'));

  const headline = el('h2', 'headline');
  const lineA = maskLine('DUA CELAH.');
  const lineB = maskLine('NOL LOGIN.', 'danger');
  headline.append(lineA, lineB);
  z.headline.append(headline);

  const hero = el('div', 'hero-server');
  const server = el('div', '', serverIcon(360));
  const lock = el('div', 'hero-lock', lockIcon(76));
  hero.append(server, lock);
  z.visual.append(hero);

  stage.append(root);

  const tl = gsap.timeline();
  fadeUp(tl, z.eyebrow.firstChild, b.eyebrow, { y: 20, duration: 0.45 });
  maskReveal(tl, lineA.firstChild, b.lineA, 0.5);
  maskReveal(tl, lineB.firstChild, b.lineB, 0.5);
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
